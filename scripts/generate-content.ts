import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import dotenv from 'dotenv';
import tinycolor from 'tinycolor2';
import sharp from 'sharp';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient, hasSupabaseConfig } from '../lib/supabase-garden';

dotenv.config({ path: '.env.development.local' });
dotenv.config({ path: '.env.local' });

export interface ProcessedBook {
    ISBN: string;
    title: string;
    author: string;
    date: string;
    rating: number;
    coverImage: string;
    spineColor: string;
    textColor: string;
    slug: string;
    summary: string;
}

interface LibraryBookRow {
    isbn: string;
    title: string;
    author: string;
    finished_date: string;
    rating: number;
    cover_image: string;
    spine_color: string;
    text_color: string;
    slug: string;
    summary: string;
}

function rgbToHex(r: number, g: number, b: number): string {
    const toHex = (n: number) => Math.round(n).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

async function fetchCoverAndTextColours(
    imageURL: string,
    supabase: SupabaseClient | null,
    bucket: string,
    objectPath: string,
    retries = 2
): Promise<{ spineColor: string; textColor: string }> {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            let imageBuffer: Buffer;
            if (supabase) {
                const { data, error } = await supabase.storage.from(bucket).download(objectPath);
                if (error) throw new Error(error.message);
                const arrayBuffer = await data.arrayBuffer();
                imageBuffer = Buffer.from(arrayBuffer);
            } else {
                const response = await fetch(imageURL);
                if (!response.ok) {
                    throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
                }
                const arrayBuffer = await response.arrayBuffer();
                imageBuffer = Buffer.from(arrayBuffer);
            }
            if (!imageBuffer.length) {
                throw new Error('Image buffer is empty');
            }

            const { data: pixels, info } = await sharp(imageBuffer)
                // Downsample to make mode extraction fast and stable.
                .resize(120, 180, { fit: 'inside' })
                .ensureAlpha()
                .raw()
                .toBuffer({ resolveWithObject: true });

            const colorFrequency = new Map<string, number>();
            const channels = info.channels;
            const binSize = 24;

            for (let i = 0; i < pixels.length; i += channels) {
                const r = pixels[i];
                const g = pixels[i + 1];
                const b = pixels[i + 2];
                const a = channels > 3 ? pixels[i + 3] : 255;
                if (a < 32) continue;

                const qr = Math.min(255, Math.round(r / binSize) * binSize);
                const qg = Math.min(255, Math.round(g / binSize) * binSize);
                const qb = Math.min(255, Math.round(b / binSize) * binSize);
                const key = `${qr},${qg},${qb}`;
                colorFrequency.set(key, (colorFrequency.get(key) || 0) + 1);
            }

            if (colorFrequency.size === 0) {
                throw new Error('No opaque pixels found in image');
            }

            let dominantKey = '';
            let dominantCount = -1;
            for (const [key, count] of colorFrequency.entries()) {
                if (count > dominantCount) {
                    dominantKey = key;
                    dominantCount = count;
                }
            }

            const [r, g, b] = dominantKey.split(',').map(Number);
            const spineColor = rgbToHex(r, g, b);
            const textColor = tinycolor(spineColor).isDark() ? '#FFFFFF' : '#000000';
            return { spineColor, textColor };
        } catch (error) {
            if (attempt === retries) throw error;
            await new Promise((resolve) => setTimeout(resolve, 200 * attempt));
        }
    }
    throw new Error('Unexpected color extraction failure');
}

function rowToBook(row: LibraryBookRow): ProcessedBook {
    return {
        ISBN: row.isbn,
        title: row.title,
        author: row.author,
        date: row.finished_date,
        rating: row.rating,
        coverImage: row.cover_image,
        spineColor: row.spine_color,
        textColor: row.text_color,
        slug: row.slug,
        summary: row.summary || '',
    };
}

function bookToRow(book: ProcessedBook): LibraryBookRow {
    return {
        isbn: book.ISBN,
        title: book.title,
        author: book.author,
        finished_date: book.date,
        rating: book.rating,
        cover_image: book.coverImage,
        spine_color: book.spineColor,
        text_color: book.textColor,
        slug: book.slug,
        summary: book.summary || '',
    };
}

function getSupabaseBooksBucket(): string {
    return process.env.SUPABASE_BOOKS_BUCKET || 'book covers';
}

function getSupabaseBooksPrefix(): string {
    const rawPrefix = process.env.SUPABASE_BOOKS_STORAGE_PREFIX || '';
    return rawPrefix
        ? rawPrefix.replace(/^\/+/, '').replace(/\/+$/, '') + '/'
        : '';
}

function getSupabaseBooksObjectPath(isbn: string): string {
    return `${getSupabaseBooksPrefix()}${isbn}.jpg`;
}

function encodeStoragePath(pathValue: string): string {
    return pathValue
        .split('/')
        .filter(Boolean)
        .map((segment) => encodeURIComponent(segment))
        .join('/');
}

function getSupabaseBooksCoverUrl(isbn: string): string {
    const supabaseUrl =
        process.env.SUPABASE_URL ||
        process.env.DB_SUPA_SUPABASE_URL ||
        process.env.NEXT_PUBLIC_SUPABASE_URL ||
        process.env.NEXT_PUBLIC_DB_SUPA_SUPABASE_URL;

    if (!supabaseUrl) return '/books/null.jpg';

    const bucket = getSupabaseBooksBucket();
    const objectPath = getSupabaseBooksObjectPath(isbn);

    // Supabase public object URL format:
    // {SUPABASE_URL}/storage/v1/object/public/{bucket}/{prefix}{filename}
    return `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/${encodeStoragePath(bucket)}/${encodeStoragePath(objectPath)}`;
}

export function csvToJSON(
    csvData: string | Buffer,
    existingByIsbn: Map<string, ProcessedBook> = new Map()
): ProcessedBook[] {
    const records = parse(csvData, {
        columns: true,
        skip_empty_lines: true,
    }) as Record<string, string>[];

    const books: ProcessedBook[] = [];

    for (const record of records) {
        const isbn = (record['ISBN-13'] || '').trim();
        const title = (record['Title'] || '').trim();
        const finishedReading = (
            record['Finished Reading'] ||
            record['Finished Reading '] ||
            record['finished reading'] ||
            record['FinishedReading'] ||
            ''
        ).trim();
        const didNotFinish = (
            record['Did Not Finish'] ||
            record['Did Not Finish '] ||
            record['did not finish'] ||
            record['DidNotFinish'] ||
            ''
        )
            .trim()
            .toUpperCase();

        if (!isbn || !title) continue;
        if (!finishedReading) continue;
        if (didNotFinish === 'Y' || didNotFinish === 'YES') continue;

        const existing = existingByIsbn.get(isbn);
        const rawRating = Number(record['Rating'] || 0);
        const rating = Number.isFinite(rawRating) ? rawRating * 2 : 0;

        books.push({
            ISBN: isbn,
            title,
            author: (record['Authors'] || 'Unknown').trim() || 'Unknown',
            date: finishedReading,
            rating,
            coverImage: getSupabaseBooksCoverUrl(isbn),
            spineColor: existing?.spineColor || '#FFFFFF',
            textColor: existing?.textColor || '#000000',
            slug: `/books/${isbn}`,
            summary: record['Notes'] || existing?.summary || '',
        });
    }

    books.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return books;
}

async function applyBookColors(
    books: ProcessedBook[],
    existingByIsbn: Map<string, ProcessedBook>,
    supabase: SupabaseClient | null
): Promise<ProcessedBook[]> {
    const bucket = getSupabaseBooksBucket();
    return Promise.all(
        books.map(async (book) => {
            const existing = existingByIsbn.get(book.ISBN);

            try {
                const colors = await fetchCoverAndTextColours(
                    book.coverImage,
                    supabase,
                    bucket,
                    getSupabaseBooksObjectPath(book.ISBN)
                );
                return {
                    ...book,
                    spineColor: colors.spineColor,
                    textColor: colors.textColor,
                };
            } catch (error: any) {
                console.warn(
                    `Failed to extract cover colors for ${book.ISBN}: ${error?.message || String(error)}`
                );
                return {
                    ...book,
                    spineColor: existing?.spineColor || '#FFFFFF',
                    textColor: existing?.textColor || '#000000',
                };
            }
        })
    );
}

export async function syncBooksFromCsv(csvData: string | Buffer): Promise<ProcessedBook[]> {
    const supabase = getSupabaseClient();
    if (!supabase) {
        throw new Error(
            'Supabase not configured. Set SUPABASE_URL (or DB_SUPA_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.'
        );
    }

    const { data: existingRows, error: readError } = await supabase
        .from('library_books')
        .select('*');
    if (readError) throw new Error(`Failed to read existing books: ${readError.message}`);

    const existingByIsbn = new Map<string, ProcessedBook>();
    for (const row of (existingRows || []) as LibraryBookRow[]) {
        existingByIsbn.set(row.isbn, rowToBook(row));
    }

    const parsedBooks = csvToJSON(csvData, existingByIsbn);
    const books = await applyBookColors(parsedBooks, existingByIsbn, supabase);
    if (books.length === 0) return [];

    const rows = books.map(bookToRow);
    const BATCH_SIZE = 100;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);
        const { error } = await supabase.from('library_books').upsert(batch, {
            onConflict: 'isbn',
        });
        if (error) throw new Error(`Failed to upsert books: ${error.message}`);
    }

    const currentIsbns = new Set(books.map((b) => b.ISBN));
    const staleIsbns = (existingRows || [])
        .map((row: any) => row.isbn as string)
        .filter((isbn) => !currentIsbns.has(isbn));
    if (staleIsbns.length > 0) {
        const { error } = await supabase
            .from('library_books')
            .delete()
            .in('isbn', staleIsbns);
        if (error) throw new Error(`Failed to delete stale books: ${error.message}`);
    }

    return books;
}

export async function syncBooksFromLocalCsv(csvPath = path.join(process.cwd(), 'reading-list.csv')): Promise<ProcessedBook[]> {
    if (!fs.existsSync(csvPath)) {
        throw new Error(`CSV file not found: ${csvPath}`);
    }
    const csvData = fs.readFileSync(csvPath, 'utf8');
    return syncBooksFromCsv(csvData);
}

// Backwards-compatible export name used by API route.
export async function books(): Promise<ProcessedBook[]> {
    return syncBooksFromLocalCsv();
}

async function main() {
    try {
        if (!hasSupabaseConfig()) {
            console.warn('Skipping books sync: Supabase env vars are missing.');
            return;
        }
        if (!fs.existsSync(path.join(process.cwd(), 'reading-list.csv'))) {
            console.warn('Skipping books sync: reading-list.csv not found.');
            return;
        }
        const synced = await syncBooksFromLocalCsv();
        console.log(`Synced ${synced.length} books to Supabase.`);
    } catch (error: any) {
        // Keep build resilient.
        console.error(`Books sync failed: ${error.message || String(error)}`);
        console.warn('Build will continue without syncing books.');
    }
}

main();

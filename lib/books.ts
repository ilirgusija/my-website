import { devBooks } from "./dev-data";
import dotenv from "dotenv";
import { getSupabaseClient, hasSupabaseConfig } from "./supabase-garden";
dotenv.config({ path: ".env.development.local" });
dotenv.config({ path: ".env.local" });

export interface Book {
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

function rowToBook(row: LibraryBookRow): Book {
    const encodedIsbn = encodeURIComponent(row.isbn);
    return {
        ISBN: row.isbn,
        title: row.title,
        author: row.author,
        date: row.finished_date,
        rating: row.rating,
        coverImage: `/api/books/cover/${encodedIsbn}`,
        spineColor: row.spine_color,
        textColor: row.text_color,
        slug: row.slug,
        summary: row.summary || "",
    };
}

export async function getAllBooks(): Promise<Book[]> {
    try {
        if (!hasSupabaseConfig()) {
            if (process.env.NODE_ENV === "development") {
                return devBooks;
            }
            return [];
        }

        const supabase = getSupabaseClient();
        if (!supabase) return process.env.NODE_ENV === "development" ? devBooks : [];

        const { data, error } = await supabase
            .from("library_books")
            .select("*");
        if (error) throw new Error(error.message);

        const books = ((data || []) as LibraryBookRow[]).map(rowToBook);
        books.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return books;
    } catch(error) {
        if (process.env.NODE_ENV === 'development') {
            return devBooks;
        }
        console.warn("Books data not found - returning empty array. Build will continue without books.");
        return [];
    }
}

export async function getAllSlugs(): Promise<string[]> {
    const data = await getAllBooks();
    return data.map((item) => item.slug);
}

// Optimized function to fetch only slugs (for getStaticPaths)
export async function getBookSlugsOnly(): Promise<string[]> {
    try {
        if (!hasSupabaseConfig()) {
            if (process.env.NODE_ENV === "development") {
                return devBooks.map((book: Book) => book.slug);
            }
            return [];
        }

        const supabase = getSupabaseClient();
        if (!supabase) return process.env.NODE_ENV === "development" ? devBooks.map((book: Book) => book.slug) : [];

        const { data, error } = await supabase
            .from("library_books")
            .select("slug");
        if (error) throw new Error(error.message);

        const slugs = (data || []).map((r: any) => r.slug).filter(Boolean);
        return slugs;
    } catch(error) {
        if (process.env.NODE_ENV === 'development') {
            return devBooks.map((book: Book) => book.slug);
        }
        console.warn("Book slugs not found - returning empty array. Build will continue without books.");
        return [];
    }
}

export interface Content<TMetadata = { [key: string]: any }> {
  metadata: TMetadata;
  source: string;
}

export type MaybeContent<TMetadata> = Content<TMetadata> | undefined;

export async function getBook(slug: string, books: Book[]): Promise<MaybeContent<Book>> {
    // Ensure the slug has the /books/ prefix for matching
    const fullSlug = slug.startsWith('/books/') ? slug : `/books/${slug}`;
    const book = books.find(b => b.slug === fullSlug);
    if (!book) {
        return undefined;
    }

    return {
        metadata: book,
        source: book.summary, // Assuming 'source' here refers to the content of the review or additional notes.
    };
}


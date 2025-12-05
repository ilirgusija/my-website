import path from "path";
import { head } from "@vercel/blob";
import { fetchVersionedData } from "./data-versioning";
import { devBooks } from "./dev-data";
import dotenv from "dotenv";
dotenv.config({ path: ".env.development.local" });

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

export async function getAllBooks(): Promise<Book[]> {
    // In development, check for token first to avoid noisy errors
    if (process.env.NODE_ENV === 'development' && !process.env.BLOB_READ_WRITE_TOKEN) {
        console.log("Development mode: BLOB_READ_WRITE_TOKEN not set, using development books data");
        return devBooks;
    }

    try {
        const versionedData = await fetchVersionedData<Book[]>("json_data/index.json");
        
        if (!versionedData) {
            throw new Error("Failed to fetch versioned books data");
        }
        
        console.log(`Fetched books data version ${versionedData.version.version} with ${versionedData.data.length} books`);
        return versionedData.data;
    } catch(error) {
        // Fallback for development
        if (process.env.NODE_ENV === 'development') {
            console.log("Development mode: failed to fetch books, using development books data");
            return devBooks;
        }
        
        // In production/build, return empty array instead of throwing
        // This allows the build to succeed even if books data isn't available
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
    // In development, check for token first to avoid noisy errors
    if (process.env.NODE_ENV === 'development' && !process.env.BLOB_READ_WRITE_TOKEN) {
        console.log("Development mode: BLOB_READ_WRITE_TOKEN not set, using development book slugs");
        return devBooks.map((book: Book) => book.slug);
    }

    try {
        const versionedData = await fetchVersionedData<Book[]>("json_data/index.json");
        
        if (!versionedData) {
            throw new Error("Failed to fetch versioned books data");
        }
        
        // Only extract slugs, don't process full book data
        const slugs = versionedData.data.map(book => book.slug);
        console.log(`Fetched ${slugs.length} book slugs for static path generation`);
        return slugs;
    } catch(error) {
        // Fallback for development
        if (process.env.NODE_ENV === 'development') {
            console.log("Development mode: failed to fetch book slugs, using development book slugs");
            return devBooks.map((book: Book) => book.slug);
        }
        
        // In production/build, return empty array instead of throwing
        // This allows the build to succeed even if books data isn't available
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


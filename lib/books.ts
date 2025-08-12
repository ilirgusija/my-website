import path from "path";
import { head } from "@vercel/blob";
import { fetchVersionedData } from "./data-versioning";
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
    try {
        const versionedData = await fetchVersionedData<Book[]>("json_data/index.json");
        
        if (!versionedData) {
            throw new Error("Failed to fetch versioned books data");
        }
        
        console.log(`Fetched books data version ${versionedData.version.version} with ${versionedData.data.length} books`);
        return versionedData.data;
    } catch(error) {
        console.error("Error fetching books:", error);
        throw new Error("Books data not found or corrupted");
    }
}

export async function getAllSlugs(): Promise<string[]> {
    const data = await getAllBooks();
    return data.map((item) => item.slug);
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


import path from "path";
import { head } from "@vercel/blob";
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
    try{
        const json_metadata = await head(path.join("json_data", "index.json"));
        const url = json_metadata.downloadUrl;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch books.json: ${response.statusText}`);
        }
    
        // Parse and return the JSON content
        const books = await response.json();
        return books;
    } catch(error) {
        throw new Error("index.json not found");
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
    slug = path.join("/books/", slug);
    const book = books.find(b => b.slug === slug); // Adjusted to find the book by slug in the array
    if (!book) {
        return undefined;
    }

    return {
        metadata: book,
        source: book.summary, // Assuming 'source' here refers to the content of the review or additional notes.
    };
}


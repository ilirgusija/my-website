import path from "path";
import fs from "fs";

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

export function getAllBooks(): Book[] {
    return JSON.parse(
        fs.readFileSync(
            path.join(process.cwd(), "content", "books", "index.json"),
            "utf8",
        ),
    );
}

export function getAllSlugs(): string[] {
    const data = getAllBooks();
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


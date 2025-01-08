import path from "path";
import fs from "fs";
import tinycolor from "tinycolor2";
import ColorThief from "colorthief";
import fetch from "node-fetch";

interface BookRecord {
    "ISBN-13": string;
    "Title": string;
    "Authors": string;
    "Finished Reading": string;
    "Rating": string;
    "Notes": string;
}

interface ProcessedBook {
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

interface GoogleBooksResponse {
    items?: {
        volumeInfo?: {
            imageLinks?: {
                thumbnail?: string;
            };
        };
    }[];
}

function rgbToHex(r: number, g: number, b: number): string {
    return "#" + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1);
}

async function fetchCoverAndTextColours(imagePath: string) {
    const dominantColor = await ColorThief.getColor(imagePath);
    const spineColor = rgbToHex(...dominantColor);
    const textColor = tinycolor(spineColor).isDark() ? "#FFFFFF" : "#000000";
    return { spineColor, textColor };
}

async function fetchBookQualities(isbn: string) {
    const imagePath = path.join(process.cwd(), "public", "books", `${isbn}.jpg`);
    const coverImage = path.join("/books", `${isbn}.jpg`);
    
    try {
        // Check if image already exists
        await fs.promises.access(imagePath);
        const { spineColor, textColor } = await fetchCoverAndTextColours(imagePath);
        return { coverImage, spineColor, textColor };
    } catch {
        // Fetch from Google Books API if image doesn't exist
        const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
        const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&key=${apiKey}`;
        const response = await fetch(url);
        const data = (await response.json()) as GoogleBooksResponse;

        if (!data.items?.[0]?.volumeInfo?.imageLinks?.thumbnail) {
            return {
                coverImage: null,
                spineColor: "#FFFFFF",
                textColor: "#000000"
            };
        }

        const coverUrl = data.items[0].volumeInfo.imageLinks.thumbnail;
        try {
            const imageResponse = await fetch(coverUrl);
            const imageBuffer = await imageResponse.buffer();
            await fs.promises.writeFile(imagePath, imageBuffer);
            const { spineColor, textColor } = await fetchCoverAndTextColours(imagePath);
            return { coverImage, spineColor, textColor };
        } catch (error) {
            console.error("Error processing image:", error);
            return {
                coverImage,
                spineColor: "#FFFFFF",
                textColor: "#000000"
            };
        }
    }
}

export async function processBookData(records: BookRecord[]): Promise<void> {
    const processedBooks: ProcessedBook[] = [];

    for (const record of records) {
        if (record["Finished Reading"]) {
            const { coverImage, spineColor, textColor } = await fetchBookQualities(record["ISBN-13"]);
            
            processedBooks.push({
                ISBN: record["ISBN-13"],
                title: record["Title"],
                author: record["Authors"],
                date: record["Finished Reading"],
                rating: Number(record["Rating"]) * 2,
                coverImage: coverImage || '',
                spineColor,
                textColor,
                slug: `/books/${record["ISBN-13"]}`,
                summary: record["Notes"] || "",
            });
        }
    }

    // Sort by date (most recent first)
    processedBooks.sort((a, b) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    // Ensure content directory exists
    const contentDir = path.join(process.cwd(), "content", "books");
    await fs.promises.mkdir(contentDir, { recursive: true });

    // Write the processed data
    await fs.promises.writeFile(
        path.join(contentDir, "index.json"),
        JSON.stringify(processedBooks, null, 2)
    );
} 
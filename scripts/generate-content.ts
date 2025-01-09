import path from "path";
import fs from "fs";
import { parse } from "csv-parse/sync";
import fetch from "node-fetch"; // Node.js fetch API
import ColorThief from "colorthief";
import tinycolor from "tinycolor2";
import dotenv from "dotenv";
dotenv.config({ path: ".env.development.local" });

interface GoogleBooksResponse {
    items?: {
        volumeInfo?: {
            imageLinks?: {
                thumbnail?: string;
            };
        };
    }[];
}

interface BookRecord {
    "Reading List ID": string;
    "Google Books ID": string;
    "Apple Books ID": string,
    "ISBN-13": string;
    "Title": string
    "Subtitle": string;
    "Authors": string;
    "Page Count": string;
    "Publication Date": string;
    "Publisher": string;
    "Description": string;
    "Subjects": string;
    "Language Code": string;
    "Started Reading": string;
    "Paused": string;
    "Finished Reading": string;
    "Did Not Finish": string;
    "Current Page": number;
    "Current Percentage": number;
    "Rating": number;
    "Notes": string
    "Lists": string
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

function rgbToHex(r: number, g: number, b: number ): string {
  return "#" + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1);
}

async function fetchCoverAndTextColours(imagePath: string) {
    const dominantColor: number[] = await ColorThief.getColor(imagePath);
    const tupleColor = dominantColor as [number, number, number];
    const spineColor = rgbToHex(...tupleColor);
    const textColor = tinycolor(spineColor).isDark() ? "#FFFFFF" : "#000000";
    return { spineColor, textColor };
}

async function fetchBookQualities(isbn: string) { 
    // First check if the image already exists
    const imagePath = path.join(process.cwd(),"public","books",`${isbn}.jpg`);
    const coverImage = path.join("/books", `${isbn}.jpg`);
    const defaultIm = path.join(process.cwd(),"public","books","null.jpg");
    try {
        await fs.promises.access(imagePath);
        const { spineColor, textColor } = await fetchCoverAndTextColours(imagePath);    
        return { coverImage, spineColor, textColor };
    } catch(error) {
        // Otherwise we look on the Google API to retrieve it
        const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
        const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&key=${apiKey}`;
        const response = await fetch(url);
        const data = (await response.json()) as GoogleBooksResponse;

        if (!data.items || data.items.length === 0) {
            console.log("No data found for ISBN:", isbn);
            return { coverImage: defaultIm, spineColor: "#FFFFFF", textColor: "#000000" };
        }

        const volumeInfo = data.items[0].volumeInfo;
        if (!volumeInfo || !volumeInfo.imageLinks || !volumeInfo.imageLinks.thumbnail) {
            console.log("Couldn't find image for ISBN:", isbn);
            return { coverImage: defaultIm, spineColor: "#FFFFFF", textColor: "#000000" };
        }

        const coverUrl = volumeInfo.imageLinks.thumbnail;
        try {
            const imageResponse = await fetch(coverUrl);
            const imageBuffer = await imageResponse.buffer();
            await fs.promises.writeFile(imagePath, imageBuffer);
            const { spineColor, textColor } = await fetchCoverAndTextColours(imagePath);
            return { coverImage, spineColor, textColor };
        } catch (error) {
            console.error("Error processing image:", error);
            return { coverImage, spineColor: "#FFFFFF", textColor: "#000000" }; // default colors in case of error
        }
    } 
}

// Function to parse CSV data and fetch book details
export async function csvToJSON(csvData: string | Buffer): Promise<ProcessedBook[]> {
    const records = parse(csvData, {
        columns: true,
        skip_empty_lines: true,
    });

    const books = [];
    for (let record of records) {
        if (record["Finished Reading"] && !(record["Did Not Finish"] == "Y")) {
            // Only process records with a valid 'Finished Reading' date
            const {coverImage, spineColor, textColor }  = await fetchBookQualities(record["ISBN-13"]);
            books.push({
                ISBN: record["ISBN-13"],
                title: record["Title"],
                author: record["Authors"],
                date: record["Finished Reading"],
                rating: 2*record["Rating"],
                coverImage: coverImage,
                spineColor: spineColor,
                textColor: textColor,
                slug: "/books/" + record["ISBN-13"], // Assuming ISBN-13 can be used as a slug
                summary: record["Notes"],
            });
        }
    }
    return books;
}

async function books() {
    const basePath = path.join(process.cwd(), "content", "books");
    const csvPath = path.join(process.cwd(), "content", "reading_data.csv");
    const csvData = fs.readFileSync(csvPath, "utf8");
    const bookData = await csvToJSON(csvData);

    bookData.sort((a, b) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    fs.writeFileSync(
        path.join(basePath, "index.json"),
        JSON.stringify(bookData, undefined, 2),
    );
}

async function main() {
    const jsonPath = path.join(process.cwd(), "content", "books", "index.json");
    const jsonExists = fs.existsSync(jsonPath);
  
    if (!jsonExists) {
      await books();
    }
}

main();

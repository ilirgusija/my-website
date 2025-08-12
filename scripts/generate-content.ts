import path from "path";
import { parse } from "csv-parse/sync";
import fetch from "node-fetch"; // Node.js fetch API
import tinycolor from "tinycolor2";
import dotenv from "dotenv";
dotenv.config({ path: ".env.development.local" });
import { put, head } from '@vercel/blob';
import Vibrant from 'node-vibrant'; // For dominant colors
import { uploadVersionedData, fetchVersionedData } from '../lib/data-versioning';


interface GoogleBooksResponse {
    items?: {
        volumeInfo?: {
            imageLinks?: {
                thumbnail?: string;
            };
        };
    }[];
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

async function fetchCSVFromBlob(): Promise<string> {
    try {
        const headResult = await head(path.join("csv_data","reading_data.csv"));
        const csvUrl = headResult.downloadUrl;
        const response = await fetch(csvUrl);
    
        if (!response.ok) {
          throw new Error(`Failed to fetch CSV: ${response.statusText}`);
        }
        const csvData = await response.text();
        return csvData;
    }
    catch(error) {
        throw new Error("reading_data.csv not found");
    }
}

export async function uploadJSONToBlob(data: object) {
    console.log('Uploading versioned JSON data...');
    const version = await uploadVersionedData(data, 'json_data/index.json');
    console.log('JSON uploaded with version:', version.version);
    return version;
}

async function uploadImageToBlob(fileName: string, imageBuffer: Buffer): Promise<string> {
    const url  = (await put(`images/${fileName}`, imageBuffer, {
      access: 'public',
      contentType: 'image/jpeg', // Adjust the content type as needed
      addRandomSuffix: false,
    })).downloadUrl;
    return url;
}

function rgbToHex(r: number, g: number, b: number ): string {
  return "#" + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1);
}

async function fetchCoverAndTextColours(imageURL: string) {
    // Fetch the image as a Buffer
    const response = await fetch(imageURL);
    if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    const imageBuffer = await response.arrayBuffer();

    // Use Vibrant to get dominant color
    const palette = await Vibrant.from(Buffer.from(imageBuffer)).getPalette();
    if (!palette || !palette.Vibrant) {
        throw new Error('Failed to extract colors from image');
    }

    const dominantColor = palette.Vibrant.rgb;
    const spineColor = rgbToHex(dominantColor[0], dominantColor[1], dominantColor[2]);
    const textColor = tinycolor(spineColor).isDark() ? '#FFFFFF' : '#000000';

    return { spineColor, textColor };
}

async function fetchBookQualities(isbn: string) { 
    // First check if the image already exists
    const blobUrl = process.env.BLOB_URL
    if (!blobUrl) {
        throw new Error("BLOB_URL not found");
    }
    const coverPath = path.join("images", `${isbn}.jpg`);
    const defaultIm = path.join("books","null.jpg");
    try {
        const headResult = await head(coverPath);
        const imageUrl = headResult.downloadUrl; 
        const coverImage = imageUrl;

        const { spineColor, textColor } = await fetchCoverAndTextColours(imageUrl);    
        return { coverImage, spineColor, textColor };
    } catch(error) {
        // Otherwise we look on the Google API to retrieve it
        const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
        const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&key=${apiKey}`;
        const response = await fetch(url);
        const data = (await response.json()) as GoogleBooksResponse;

        if (!data.items || data.items.length === 0) {
            return { coverImage: defaultIm, spineColor: "#FFFFFF", textColor: "#000000" };
        }

        const volumeInfo = data.items[0].volumeInfo;
        if (!volumeInfo || !volumeInfo.imageLinks || !volumeInfo.imageLinks.thumbnail) {
            return { coverImage: defaultIm, spineColor: "#FFFFFF", textColor: "#000000" };
        }

        const coverUrl = volumeInfo.imageLinks.thumbnail;
        const imageResponse = await fetch(coverUrl);
        const imageBuffer = await imageResponse.buffer();
        const imageUrl = await uploadImageToBlob(`${isbn}.jpg`, imageBuffer);
        const coverImage = imageUrl;
        try {
            const { spineColor, textColor } = await fetchCoverAndTextColours(imageUrl);
            return { coverImage, spineColor, textColor };
        } catch (error) {
            console.error("Error processing image:", error);
            return {coverImage, spineColor: "#FFFFFF", textColor: "#000000" }; // default colors in case of error
        }
    } 
}

// Function to parse CSV data and fetch book details
export async function csvToJSON(csvData: string | Buffer): Promise<ProcessedBook[]> {
    console.log('Parsing CSV data...');
    const records = parse(csvData, {
        columns: true,
        skip_empty_lines: true,
    });
    
    console.log(`Parsed ${records.length} records from CSV`);

    const books = [];
    for (let record of records) {
        if (record["Finished Reading"] && !(record["Did Not Finish"] == "Y")) {
            console.log(`Processing book: ${record["Title"]} (ISBN: ${record["ISBN-13"]})`);
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
    console.log(`Successfully processed ${books.length} books`);
    return books;
}

export async function books() {
    try {
        console.log('Fetching CSV from blob...');
        const csvData = await fetchCSVFromBlob();
        console.log('CSV fetched successfully, processing books...');
        
        const bookData = await csvToJSON(csvData);
        console.log(`Processed ${bookData.length} books from CSV`);

        bookData.sort((a, b) => {
            return new Date(b.date).getTime() - new Date(a.date).getTime();
        });

        console.log('Uploading processed books to JSON blob...');
        await uploadJSONToBlob(bookData);
        console.log('JSON uploaded successfully');
        
        return bookData;
    } catch (error) {
        console.error('Error in books() function:', error);
        throw error;
    }
}

async function main() {
    try {
        // Check if versioned data exists
        const existingData = await fetchVersionedData<ProcessedBook[]>("json_data/index.json");
        if (existingData) {
            console.log(`Found existing books data version ${existingData.version.version} with ${existingData.data.length} books`);
            console.log("Skipping generation as data already exists");
            return;
        }
    } catch(error) {
        console.log("No existing versioned data found, generating fresh data...");
    }
    
    console.log("Generating fresh books data...");
    await books();
}

main();

import path from "path";
import { parse } from "csv-parse/sync";
import fetch from "node-fetch"; // Node.js fetch API
import tinycolor from "tinycolor2";
import dotenv from "dotenv";
dotenv.config({ path: ".env.development.local" });
import { put, head } from '@vercel/blob';
// node-vibrant entrypoint for Node.js
import { Vibrant } from "node-vibrant/node";
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
    try {
        const version = await uploadVersionedData(data, 'json_data/index.json');
        console.log('JSON uploaded successfully with version:', version.version);
        console.log('JSON path: json_data/index.json');
        console.log('JSON record count:', version.recordCount);
        return version;
    } catch (error) {
        console.error('Failed to upload JSON to blob:', error);
        throw error;
    }
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

async function fetchCoverAndTextColours(imageURL: string, retries: number = 2): Promise<{ spineColor: string; textColor: string }> {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            // Fetch the image as a Buffer
            const response = await fetch(imageURL);
            if (!response.ok) {
                throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
            }
            
            // node-fetch v3 uses standard fetch API - use arrayBuffer() then convert to Buffer
            const arrayBuffer = await response.arrayBuffer();
            const imageBuffer = Buffer.from(arrayBuffer);
            
            if (!imageBuffer || imageBuffer.length === 0) {
                throw new Error('Image buffer is empty');
            }

            // Use Vibrant to get dominant color
            const palette = await Vibrant.from(imageBuffer).getPalette();
            if (!palette || !palette.Vibrant) {
                throw new Error('Failed to extract colors from image - no vibrant palette');
            }

            const dominantColor = palette.Vibrant.rgb;
            if (!dominantColor || dominantColor.length < 3) {
                throw new Error('Failed to extract colors from image - invalid RGB values');
            }

            const spineColor = rgbToHex(dominantColor[0], dominantColor[1], dominantColor[2]);
            const textColor = tinycolor(spineColor).isDark() ? '#FFFFFF' : '#000000';

            return { spineColor, textColor };
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            
            if (attempt === retries) {
                // Last attempt failed, throw with details
                throw new Error(`Color extraction failed after ${retries} attempts: ${errorMsg}`);
            }
            
            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, 200 * attempt));
        }
    }
    
    // Should never reach here, but TypeScript needs it
    throw new Error('Color extraction failed - unexpected error');
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

        try {
            const { spineColor, textColor } = await fetchCoverAndTextColours(imageUrl);    
            return { coverImage, spineColor, textColor };
        } catch (colorError) {
            console.error(`Error fetching colors for ${isbn}:`, colorError instanceof Error ? colorError.message : String(colorError));
            // Return default colors if color extraction fails
            return { coverImage, spineColor: "#FFFFFF", textColor: "#000000" };
        }
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
        // node-fetch v3 uses standard fetch API - use arrayBuffer() then convert to Buffer
        const arrayBuffer = await imageResponse.arrayBuffer();
        const imageBuffer = Buffer.from(arrayBuffer);
        const imageUrl = await uploadImageToBlob(`${isbn}.jpg`, imageBuffer);
        const coverImage = imageUrl;
        try {
            const { spineColor, textColor } = await fetchCoverAndTextColours(imageUrl);
            return { coverImage, spineColor, textColor };
        } catch (error) {
            console.error(`Error processing image for ${isbn}:`, error instanceof Error ? error.message : String(error));
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
    let skippedCount = 0;
    let skippedReasons: Record<string, number> = {};
    
    // Filter and validate records first
    const validRecords = [];
    for (let record of records) {
        const title = record["Title"] || "";
        const isbn = record["ISBN-13"] || "";
        
        // Check if book is finished reading (field exists and is not empty)
        // Try multiple field name variations in case CSV has different column names
        const finishedReading = record["Finished Reading"] || record["Finished Reading "] || record["finished reading"] || record["FinishedReading"];
        const didNotFinish = record["Did Not Finish"] || record["Did Not Finish "] || record["did not finish"] || record["DidNotFinish"];
        
        // More lenient check - allow whitespace-only but check if it's actually empty
        const finishedReadingTrimmed = finishedReading ? String(finishedReading).trim() : "";
        if (!finishedReadingTrimmed || finishedReadingTrimmed === "" || finishedReadingTrimmed === "null" || finishedReadingTrimmed === "undefined") {
            skippedCount++;
            skippedReasons["no_finished_date"] = (skippedReasons["no_finished_date"] || 0) + 1;
            continue; // Skip books without a finished reading date
        }
        
        if (didNotFinish && (didNotFinish.toString().toUpperCase() === "Y" || didNotFinish.toString().toUpperCase() === "YES")) {
            skippedCount++;
            skippedReasons["did_not_finish"] = (skippedReasons["did_not_finish"] || 0) + 1;
            continue; // Skip books marked as "Did Not Finish"
        }
        
        // Validate required fields
        if (!record["Title"] || !record["ISBN-13"]) {
            skippedCount++;
            skippedReasons["missing_fields"] = (skippedReasons["missing_fields"] || 0) + 1;
            console.warn(`Skipping book with missing title or ISBN: ${JSON.stringify({title, isbn})}`);
            continue;
        }
        
        validRecords.push({ record, finishedReadingTrimmed });
    }
    
    // Process books in parallel batches with robust error handling
    const BATCH_SIZE = 10;
    console.log(`Processing ${validRecords.length} books in parallel batches of ${BATCH_SIZE}...`);
    
    for (let i = 0; i < validRecords.length; i += BATCH_SIZE) {
        const batch = validRecords.slice(i, i + BATCH_SIZE);
        const batchPromises = batch.map(async ({ record, finishedReadingTrimmed }) => {
            try {
                console.log(`Processing book: ${record["Title"]} (ISBN: ${record["ISBN-13"]})`);
                const {coverImage, spineColor, textColor }  = await fetchBookQualities(record["ISBN-13"]);
                
                
                // Convert rating to number, defaulting to 0 if invalid
                const ratingValue = record["Rating"];
                const rating = ratingValue ? Number(ratingValue) * 2 : 0;
                if (isNaN(rating)) {
                    console.warn(`Invalid rating for ${record["Title"]}: ${ratingValue}, defaulting to 0`);
                }
                
                return {
                    ISBN: record["ISBN-13"],
                    title: record["Title"],
                    author: record["Authors"] || "Unknown",
                    date: finishedReadingTrimmed,
                    rating: rating,
                    coverImage: coverImage,
                    spineColor: spineColor || "#FFFFFF",
                    textColor: textColor || "#000000",
                    slug: "/books/" + record["ISBN-13"],
                    summary: record["Notes"] || "",
                };
            } catch (error) {
                console.error(`Error processing book ${record["Title"]}:`, error instanceof Error ? error.message : String(error));
                return null; // Return null for failed books
            }
        });
        
        const batchResults = await Promise.all(batchPromises);
        const successfulBooks = batchResults.filter(book => book !== null);
        books.push(...successfulBooks);
        
        const failedCount = batchResults.length - successfulBooks.length;
        if (failedCount > 0) {
            console.warn(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${failedCount} books failed to process`);
        }
        
        // Small delay between batches to avoid overwhelming APIs
        if (i + BATCH_SIZE < validRecords.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
    console.log(`Successfully processed ${books.length} books (skipped ${skippedCount} records)`);
    return books;
}

export async function books() {
    try {
        // Verify we have the required token
        if (!process.env.BLOB_READ_WRITE_TOKEN) {
            throw new Error('BLOB_READ_WRITE_TOKEN is not set - cannot process books');
        }

        console.log('Fetching CSV from blob...');
        const csvData = await fetchCSVFromBlob();
        console.log(`CSV fetched successfully (${csvData.length} bytes), processing books...`);
        
        const bookData = await csvToJSON(csvData);
        console.log(`Processed ${bookData.length} books from CSV`);

        if (bookData.length === 0) {
            throw new Error('No books were processed from CSV - check CSV format and data');
        }

        bookData.sort((a, b) => {
            return new Date(b.date).getTime() - new Date(a.date).getTime();
        });

        console.log('Uploading processed books to JSON blob...');
        const uploadResult = await uploadJSONToBlob(bookData);
        console.log(`JSON uploaded successfully - version ${uploadResult.version}, ${uploadResult.recordCount} records`);
        
        // Wait a moment to ensure blob is available
        await new Promise(resolve => setTimeout(resolve, 500));
        
        return bookData;
    } catch (error) {
        console.error('Error in books() function:', error);
        throw error;
    }
}

async function main() {
    // Check if we have the required environment variables
    const requiredEnvVars = ['BLOB_READ_WRITE_TOKEN', 'BLOB_URL', 'GOOGLE_BOOKS_API_KEY'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
        console.warn(`Missing environment variables: ${missingVars.join(', ')}`);
        console.warn("Skipping data generation - books data will not be available");
        return;
    }

    // Allow forcing regeneration via FORCE_REGENERATE env variable
    const forceRegenerate = process.env.FORCE_REGENERATE === 'true';
    
    if (!forceRegenerate) {
        try {
            // Check if versioned data exists
            const existingData = await fetchVersionedData<ProcessedBook[]>("json_data/index.json");
            if (existingData) {
                console.log(`Found existing books data version ${existingData.version.version} with ${existingData.data.length} books`);
                console.log("Skipping generation as data already exists");
                console.log("To force regeneration, set FORCE_REGENERATE=true");
                return;
            }
        } catch(error) {
            console.log("No existing versioned data found, checking for legacy data...");
            
            // Check for legacy non-versioned data
            try {
                const { head } = await import('@vercel/blob');
                await head(path.join("json_data", "index.json"));
                console.log("Found legacy data, but no versioned data. Generating fresh versioned data...");
            } catch(legacyError) {
                console.log("No existing data found at all, generating fresh data...");
            }
        }
    } else {
        console.log("FORCE_REGENERATE=true - forcing regeneration even though data exists");
    }
    
    console.log("Generating fresh books data...");
    
    try {
        await books();
    } catch (error: any) {
        // Don't fail the build if data generation fails
        console.error("Failed to generate books data:", error.message);
        console.warn("Build will continue without books data");
    }
}

main();

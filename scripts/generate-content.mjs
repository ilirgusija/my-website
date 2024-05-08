import path from "path";
import fs from "fs";
import { parse } from "csv-parse/sync";
import fetch from "node-fetch"; // Node.js fetch API
import ColorThief from "colorthief";
import tinycolor from "tinycolor2";

function rgbToHex(r, g, b) {
  return "#" + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1);
}

async function fetchCoverAndTextColours(imagePath) { 
    const dominantColor = await ColorThief.getColor(imagePath);
    const spineColor = rgbToHex(...dominantColor);
    const textColor = tinycolor(spineColor).isDark()
        ? "#FFFFFF"
        : "#000000";
    return {spineColor, textColor};
}

async function fetchBookQualities(isbn, apiKey) { 
    // First check if the image already exists
    const imagePath = path.join(process.cwd(),"public","books",`${isbn}.jpg`);
    const coverImage = path.join("/books", `${isbn}.jpg`);
    try {
        await fs.promises.access(imagePath);
        const { spineColor, textColor } = await fetchCoverAndTextColours(imagePath);    
        return { coverImage, spineColor, textColor };
    } catch(error) {
        // Otherwise we look on the Google API to retrieve it
        const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&key=${apiKey}`;
        const response = await fetch(url);
        const data = await response.json();

        if (!data.items || data.items.length === 0) {
            console.log("No data found for ISBN:", isbn);
            return { coverImage: null, spineColor: "#FFFFFF", textColor: "#000000" };
        }

        const volumeInfo = data.items[0].volumeInfo;
        if (!volumeInfo.imageLinks || !volumeInfo.imageLinks.thumbnail) {
            console.log("Couldn't find image for ISBN:", isbn);
            return { coverImage: null, spineColor: "#FFFFFF", textColor: "#000000" };
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
async function csvToJSON(csvFilePath, apiKey) {
    const csvData = fs.readFileSync(csvFilePath, "utf8");
    const records = parse(csvData, {
        columns: true,
        skip_empty_lines: true,
    });

    const books = [];
    for (let record of records) {
        if (record["Finished Reading"]) {
            // Only process records with a valid 'Finished Reading' date
            const {coverImage, spineColor, textColor }  = await fetchBookQualities(record["ISBN-13"], apiKey);
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
    const apiKey = "AIzaSyA2OFqBel6WZgzaLCwAGFhBQsMMo-N6Zf4"; // Replace with your API key

    const basePath = path.join(process.cwd(), "content", "books");
    const csvPath = path.join(process.cwd(), "content", "reading_list.csv");
    const bookData = await csvToJSON(csvPath, apiKey);

    bookData.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB.getTime() - dateA.getTime();
    });

    fs.writeFileSync(
        path.join(basePath, "index.json"),
        JSON.stringify(bookData, undefined, 2),
    );
}

async function main() {
    await books();
}

main();

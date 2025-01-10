import path from "path";
import fs from "fs";
import { head } from '@vercel/blob';
import { uploadJSONToBlob } from "../scripts/generate-content";

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

// reads the current index.json
async function readExistingBooks() {
  const jsonPath = path.join("books", "index.json");
  try{
    const json_metadata = await head(jsonPath)
    const json = await fetch(json_metadata.downloadUrl).then((res) => res.json());
    if (fs.existsSync(jsonPath)) {
      return json;
    }
  } catch(error) {
    console.log("index.json not found");
    return [];
  }
}

function extractDifferences(newBooks: ProcessedBook[], existingBooks: ProcessedBook[]) {
    const existingBookMap = new Map(existingBooks.map((book) => [book.ISBN, book]));
  
    const addedBooks = newBooks.filter((book) => !existingBookMap.has(book.ISBN));
    const updatedBooks = newBooks.filter((book) => {
      const existingBook = existingBookMap.get(book.ISBN);
      if (!existingBook) return false;
  
      // Check if the book data has changed
      return (
        book.title !== existingBook.title ||
        book.author !== existingBook.author ||
        book.date !== existingBook.date ||
        book.rating !== existingBook.rating ||
        book.coverImage !== existingBook.coverImage ||
        book.spineColor !== existingBook.spineColor ||
        book.textColor !== existingBook.textColor ||
        book.summary !== existingBook.summary
      );
    });
    return { addedBooks, updatedBooks };
}

export async function processBookData(newBooks: ProcessedBook[]) {
    // const existingBooks = await readExistingBooks();

    // merge and deduplicate by ISBN
    // const { addedBooks, updatedBooks } = extractDifferences(newBooks, existingBooks);

    // console.log(`Found ${addedBooks.length} new books and ${updatedBooks.length} updated books.`);

    // const mergedBooks = [
    //     ...existingBooks.filter(
    //       (book: ProcessedBook) => 
    //         !addedBooks.some((added) => added.ISBN === book.ISBN) &&
    //         !updatedBooks.some((updated) => updated.ISBN === book.ISBN)
    //     ),
    //     ...addedBooks,
    //     ...updatedBooks,
    // ];

  // Sort books by date
  // const bookData = await csvToJSON(csvData);

  newBooks.sort((a, b) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  await uploadJSONToBlob(newBooks);

  console.log("Books updated successfully.");
}

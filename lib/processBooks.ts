import path from "path";
import fs from "fs";

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
function readExistingBooks() {
  const jsonPath = path.join(process.cwd(), "content", "books", "index.json");
  if (fs.existsSync(jsonPath)) {
    const data = fs.readFileSync(jsonPath, "utf8");
    return JSON.parse(data);
  }
  return [];
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

// writes updated books back to index.json
function writeUpdatedBooks(updatedBooks: any[]) {
  const jsonPath = path.join(process.cwd(), "content", "books", "index.json");
  fs.writeFileSync(jsonPath, JSON.stringify(updatedBooks, undefined, 2));
}

export async function processBookData(newBooks: ProcessedBook[]) {
    const existingBooks = readExistingBooks();

    // merge and deduplicate by ISBN
    const { addedBooks, updatedBooks } = extractDifferences(newBooks, existingBooks);

    console.log(`Found ${addedBooks.length} new books and ${updatedBooks.length} updated books.`);

    const mergedBooks = [
        ...existingBooks.filter(
          (book: ProcessedBook) => 
            !addedBooks.some((added) => added.ISBN === book.ISBN) &&
            !updatedBooks.some((updated) => updated.ISBN === book.ISBN)
        ),
        ...addedBooks,
        ...updatedBooks,
    ];

  // Sort books by date
  mergedBooks.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Write updated books back to index.json
  writeUpdatedBooks(mergedBooks);

  console.log("Books updated successfully.");
}

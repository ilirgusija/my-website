import { NextApiRequest, NextApiResponse } from 'next';
import { syncBooksFromCsv } from "../../scripts/generate-content";
import dotenv from "dotenv";
dotenv.config({ path: ".env.development.local" });
dotenv.config({ path: ".env.local" });

// Configure maxDuration for Next.js 13.5+ (required for long-running operations)
export const maxDuration = 60; // 60 seconds (max for Pro plan, Hobby plan maxes at 10s)

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '4mb', // limit for large CSV files
    },
    responseLimit: false, // Disable response limit for large responses
  },
};

// define expected request body type
type CsvUploadRequest = NextApiRequest & {
  body: string; // body contains raw CSV data as a string
};

// define success and error response types
type SuccessResponse = {
  message: string;
  recordsProcessed: number;
};

type ErrorResponse = {
  message: string;
  error?: string;
};

export default async function handler(
  req: CsvUploadRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>
) {
  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Method not allowed' });
    return;
  }

  try {
    // verify API key/auth
    const apiKey = req.headers['x-api-key'];
    if (apiKey !== process.env.UPLOAD_API_KEY) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    // parse the CSV from the request body
    const csvData = req.body;
    if (!csvData) {
      res.status(400).json({ message: 'Bad Request: CSV data is missing' });
      return;
    }
    
    try{
      console.log('Syncing uploaded CSV to Supabase...');
      const newBooks = await syncBooksFromCsv(csvData);
      console.log(`Successfully processed ${newBooks.length} books`);
      
      // trigger revalidation for the books page and all individual book pages
      console.log('Revalidating pages...');
      await res.revalidate("/books");
      
      // Revalidate all individual book pages
      for (const book of newBooks) {
        const slug = book.slug.replace('/books/', '');
        const revalidatePath = `/books/${slug}`;
        try {
          await res.revalidate(revalidatePath);
        } catch (revalidateError) {
          console.error(`Failed to revalidate ${revalidatePath}:`, revalidateError);
        }
      }
      
      res.status(200).json({
        message: 'Successfully updated reading list',
        recordsProcessed: newBooks.length,
      });
    } catch(error) {
      console.error('Error in CSV processing pipeline:', error);
      res.status(500).json({
        message: 'Error processing CSV and updating books',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  } catch (error) {
    console.error('Error processing upload:', error);
    res.status(500).json({
      message: 'Error processing upload',
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
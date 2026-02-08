import { NextApiRequest, NextApiResponse } from 'next';
import { books } from "../../scripts/generate-content";
import { put } from '@vercel/blob';
import { uploadVersionedData, generateChecksum, clearCache } from '../../lib/data-versioning';
import dotenv from "dotenv";
dotenv.config({ path: ".env.development.local" });

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

async function uploadCSVtoBlob(csvData: any) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error('BLOB_READ_WRITE_TOKEN is not set');
  }
  const result = await put(`csv_data/reading_data.csv`, csvData, {
    access: 'public',
    contentType: 'text/csv',
    addRandomSuffix: false,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
  console.log('Uploaded CSV to Blob @', result.pathname);
  return result;
}

// Generate a checksum for the CSV data to validate it's the same
function generateCSVChecksum(csvData: string): string {
  return generateChecksum(csvData);
}

// Fetch CSV from blob storage (replicated from generate-content.ts)
async function fetchCSVFromBlob(): Promise<string> {
  const { head } = await import('@vercel/blob');
  const path = require('path');
  
  try {
    const headResult = await head(path.join("csv_data","reading_data.csv"));
    const csvUrl = headResult.downloadUrl;
    const response = await fetch(csvUrl);
  
    if (!response.ok) {
      throw new Error(`Failed to fetch CSV: ${response.statusText}`);
    }
    const csvData = await response.text();
    return csvData;
  } catch(error) {
    throw new Error("reading_data.csv not found");
  }
}

// Poll for CSV availability with exponential backoff
async function waitForCSVAvailability(expectedChecksum: string, maxAttempts: number = 5): Promise<boolean> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`Attempt ${attempt}: Checking CSV availability...`);
      
      // Fetch the actual CSV content
      const csvContent = await fetchCSVFromBlob();
      const actualChecksum = generateCSVChecksum(csvContent);
      
      console.log(`Expected checksum: ${expectedChecksum}`);
      console.log(`Actual checksum: ${actualChecksum}`);
      
      if (actualChecksum === expectedChecksum) {
        console.log('CSV content validated successfully!');
        return true;
      } else {
        console.log('CSV content mismatch, retrying...');
      }
      
    } catch (error) {
      console.log(`Attempt ${attempt} failed:`, error instanceof Error ? error.message : String(error));
    }
    
    // Reduced exponential backoff: 200ms, 400ms, 800ms, 1.6s, 3.2s
    const delay = Math.min(200 * Math.pow(2, attempt - 1), 3200);
    console.log(`Waiting ${delay}ms before next attempt...`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  throw new Error(`CSV validation failed after ${maxAttempts} attempts`);
}

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
      console.log('Uploading CSV to blob...');
      await uploadCSVtoBlob(csvData);
      console.log('CSV uploaded successfully, validating availability...');
      
      // Generate checksum of the uploaded data
      const expectedChecksum = generateCSVChecksum(csvData);
      console.log('Expected CSV checksum:', expectedChecksum);
      
      // Wait for CSV to be available and validate content
      await waitForCSVAvailability(expectedChecksum);
      
      console.log('Calling books() to process CSV and upload JSON...');
      const newBooks = await books();
      console.log(`Successfully processed ${newBooks.length} books`);
      
      // Wait for blob to be available (reduced wait time)
      console.log('Waiting for JSON blob to be available...');
      for (let attempt = 1; attempt <= 3; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 300 * attempt));
        try {
          const { head } = await import('@vercel/blob');
          await head('json_data/index.json', {
            token: process.env.BLOB_READ_WRITE_TOKEN,
          });
          console.log(`JSON blob is available after ${attempt} attempt(s)`);
          break;
        } catch (error) {
          if (attempt === 3) {
            console.warn('JSON blob not immediately available, but continuing...');
          }
        }
      }

      // Verify JSON upload (non-blocking - don't fail if verification takes too long)
      (async () => {
        try {
          await new Promise(resolve => setTimeout(resolve, 1000));
          const { fetchVersionedData } = await import('../../lib/data-versioning');
          const versionedData = await fetchVersionedData<typeof newBooks>('json_data/index.json', true);
          
          if (versionedData && versionedData.data.length !== newBooks.length) {
            console.warn(`Verification warning: Expected ${newBooks.length} books, got ${versionedData.data.length}`);
          }
        } catch (verifyError) {
          // Silently ignore verification errors - non-blocking
        }
      })();

      // Clear the cache to ensure fresh data is fetched
      console.log('Clearing data cache...');
      clearCache('json_data/index.json');
      
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
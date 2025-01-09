import { NextApiRequest, NextApiResponse } from 'next';
import { parse } from 'csv-parse/sync';
import { processBookData } from '../../lib/processBooks';
import { csvToJSON } from "../../scripts/generate-content";
// import fs from "fs";
// import dotenv from "dotenv";
// dotenv.config({ path: ".env.development.local" });

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '4mb', // limit for large CSV files
    },
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
    // const csvPath = path.join(process.cwd(), "content", "reading_data.csv");
    // fs.writeFileSync(csvPath, csvData);

    const books = await csvToJSON(csvData)
    
    // process the records
    await processBookData(books);

    // trigger revalidation for the books page
    await res.revalidate("/books");

    res.status(200).json({
      message: 'Successfully updated reading list',
      recordsProcessed: books.length,
    });
  } catch (error) {
    console.error('Error processing upload:', error);

    res.status(500).json({
      message: 'Error processing upload',
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
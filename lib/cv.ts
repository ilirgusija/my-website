import { head } from "@vercel/blob";
import dotenv from "dotenv";
dotenv.config({ path: ".env.development.local" });

/**
 * Get CV PDF URL from Vercel Blob
 * Returns the download URL for the CV PDF stored in blob storage
 */
export async function getCVUrl(): Promise<string | null> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return null;
  }

  try {
    // Look for CV in cv/ directory in blob storage
    // Try common CV filenames
    const possibleNames = ["cv.pdf", "resume.pdf", "CV.pdf", "Resume.pdf"];
    
    for (const fileName of possibleNames) {
      try {
        const blobPath = `cv/${fileName}`;
        const metadata = await head(blobPath, {
          token: process.env.BLOB_READ_WRITE_TOKEN,
        });
        return metadata.downloadUrl;
      } catch (error: any) {
        // Continue to next filename if this one doesn't exist
        if (error?.message?.includes("does not exist")) {
          continue;
        }
        // Log other errors
        console.warn(`Error checking for CV at cv/${fileName}:`, error.message);
      }
    }

    return null;
  } catch (error: any) {
    console.warn("Failed to fetch CV from blob:", error.message);
    return null;
  }
}


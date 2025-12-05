import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { head } from "@vercel/blob";
import dotenv from "dotenv";
dotenv.config({ path: ".env.development.local" });

const researchDirectory = path.join(process.cwd(), "content/research");

export interface Research {
  title: string;
  authors: string[];
  abstract: string;
  status: "in-progress" | "submitted" | "published";
  arxivId?: string; // For future arXiv integration
  pdfPath: string;
  lastUpdated?: string;
  slug: string;
  pdfUrl?: string; // URL to PDF in Vercel Blob
}

// Dev fallback data for local development
export const devResearch: Research[] = [
  {
    title: "Example Research in Progress",
    authors: ["Your Name"],
    abstract: "This is an example research project that demonstrates the research preview component.",
    status: "in-progress",
    pdfPath: "example-paper.pdf",
    lastUpdated: "2024-01-15",
    slug: "example-paper",
  },
];

export function getResearchSlugs(): string[] {
  if (!fs.existsSync(researchDirectory)) {
    return [];
  }
  return fs
    .readdirSync(researchDirectory)
    .filter((file) => file.endsWith(".md"))
    .map((file) => file.replace(/\.md$/, ""));
}

export async function getAllResearch(): Promise<Research[]> {
  if (!fs.existsSync(researchDirectory)) {
    // Fallback for development
    if (process.env.NODE_ENV === "development") {
      console.log("Development mode: returning development research data");
      return devResearch;
    }
    return [];
  }

  const slugs = getResearchSlugs();
  const research = await Promise.all(
    slugs.map(async (slug) => {
      const filePath = path.join(researchDirectory, `${slug}.md`);
      const fileContents = fs.readFileSync(filePath, "utf8");
      const { data } = matter(fileContents);

      const item: Research = {
        ...(data as Omit<Research, "slug" | "pdfUrl">),
        slug,
      } as Research;

      // Try to get PDF URL - check local file first in development, then Vercel Blob
      if (item.pdfPath) {
        // In development, check if PDF exists locally
        if (process.env.NODE_ENV === "development") {
          const localPdfPath = path.join(researchDirectory, item.pdfPath);
          if (fs.existsSync(localPdfPath)) {
            // Serve from public directory - we'll copy it there or serve directly
            // For now, use a relative path that Next.js can serve
            item.pdfUrl = `/research/${item.pdfPath}`;
          }
        }

        // If not found locally (or in production), try Vercel Blob
        if (!item.pdfUrl && process.env.BLOB_READ_WRITE_TOKEN) {
          try {
            const blobPath = `research/${item.pdfPath}`;
            const metadata = await head(blobPath, {
              token: process.env.BLOB_READ_WRITE_TOKEN,
            });
            item.pdfUrl = metadata.downloadUrl;
          } catch (error: any) {
            // Silently handle missing PDFs - they might not be uploaded yet
            if (error?.message?.includes("does not exist")) {
              // PDF not uploaded yet, that's fine
            } else {
              // Only log unexpected errors
              console.warn(`Error fetching PDF for ${slug}:`, error.message);
            }
          }
        }
      }

      return item;
    })
  );

  return research;
}

export async function getResearch(slug: string): Promise<Research | null> {
  const filePath = path.join(researchDirectory, `${slug}.md`);
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const fileContents = fs.readFileSync(filePath, "utf8");
  const { data } = matter(fileContents);

  const item: Research = {
    ...(data as Omit<Research, "slug" | "pdfUrl">),
    slug,
  } as Research;

  // Try to get PDF URL - check local file first in development, then Vercel Blob
  if (item.pdfPath) {
    // In development, check if PDF exists locally
    if (process.env.NODE_ENV === "development") {
      const localPdfPath = path.join(researchDirectory, item.pdfPath);
      if (fs.existsSync(localPdfPath)) {
        // Serve from public directory - we'll copy it there or serve directly
        // For now, use a relative path that Next.js can serve
        item.pdfUrl = `/research/${item.pdfPath}`;
      }
    }

    // If not found locally (or in production), try Vercel Blob
    if (!item.pdfUrl && process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        const blobPath = `research/${item.pdfPath}`;
        const metadata = await head(blobPath, {
          token: process.env.BLOB_READ_WRITE_TOKEN,
        });
        item.pdfUrl = metadata.downloadUrl;
      } catch (error: any) {
        // Silently handle missing PDFs
        if (error?.message?.includes("does not exist")) {
          // PDF not uploaded yet, that's fine
        } else {
          console.warn(`Error fetching PDF for ${slug}:`, error.message);
        }
      }
    }
  }

  return item;
}

export function getAllResearchSlugs(): string[] {
  return getResearchSlugs();
}

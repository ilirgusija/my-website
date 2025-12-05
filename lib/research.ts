import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { head, list } from "@vercel/blob";
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
export const devResearch: Research[] = [];

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
  // Try to fetch from Vercel Blob first (production)
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const { blobs } = await list({
        prefix: "research/metadata/",
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });

      if (blobs.length > 0) {
        const research = await Promise.all(
          blobs
            .filter((blob) => blob.pathname.endsWith(".md"))
            .map(async (blob) => {
              const response = await fetch(blob.downloadUrl);
              const fileContents = await response.text();
              const { data } = matter(fileContents);
              const slug = blob.pathname
                .replace("research/metadata/", "")
                .replace(/\.md$/, "");

              const item: Research = {
                ...(data as Omit<Research, "slug" | "pdfUrl">),
                slug,
              } as Research;

              // Get PDF URL from blob
              if (item.pdfPath) {
                try {
                  const pdfBlobPath = `research/${item.pdfPath}`;
                  const pdfMetadata = await head(pdfBlobPath, {
                    token: process.env.BLOB_READ_WRITE_TOKEN,
                  });
                  item.pdfUrl = pdfMetadata.downloadUrl;
                } catch (error: any) {
                  // PDF might not be uploaded yet
                  if (!error?.message?.includes("does not exist")) {
                    console.warn(`Error fetching PDF for ${slug}:`, error.message);
                  }
                }
              }

              return item;
            })
        );

        return research;
      }
    } catch (error: any) {
      console.warn("Failed to fetch research metadata from blob:", error.message);
      // Fall through to local file system fallback
    }
  }

  // Fallback to local file system (development)
  if (!fs.existsSync(researchDirectory)) {
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
            item.pdfUrl = `/research/${item.pdfPath}`;
          }
        }

        // If not found locally (or in production), try Vercel Blob
        if (!item.pdfUrl && process.env.BLOB_READ_WRITE_TOKEN) {
          try {
            const blobPath = `research/${item.pdfPath}`;
            const pdfMetadata = await head(blobPath, {
              token: process.env.BLOB_READ_WRITE_TOKEN,
            });
            item.pdfUrl = pdfMetadata.downloadUrl;
          } catch (error: any) {
            if (!error?.message?.includes("does not exist")) {
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
  // Try to fetch from Vercel Blob first (production)
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const blobPath = `research/metadata/${slug}.md`;
      const metadata = await head(blobPath, {
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });

      const response = await fetch(metadata.downloadUrl);
      const fileContents = await response.text();
      const { data } = matter(fileContents);

      const item: Research = {
        ...(data as Omit<Research, "slug" | "pdfUrl">),
        slug,
      } as Research;

      // Get PDF URL
      if (item.pdfPath) {
        try {
          const pdfBlobPath = `research/${item.pdfPath}`;
          const pdfMetadata = await head(pdfBlobPath, {
            token: process.env.BLOB_READ_WRITE_TOKEN,
          });
          item.pdfUrl = pdfMetadata.downloadUrl;
        } catch (error: any) {
          if (!error?.message?.includes("does not exist")) {
            console.warn(`Error fetching PDF for ${slug}:`, error.message);
          }
        }
      }

      return item;
    } catch (error: any) {
      if (!error?.message?.includes("does not exist")) {
        console.warn(`Failed to fetch research ${slug} from blob:`, error.message);
      }
      // Fall through to local file system fallback
    }
  }

  // Fallback to local file system (development)
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

  // Get PDF URL
  if (item.pdfPath) {
    if (process.env.NODE_ENV === "development") {
      const localPdfPath = path.join(researchDirectory, item.pdfPath);
      if (fs.existsSync(localPdfPath)) {
        item.pdfUrl = `/research/${item.pdfPath}`;
      }
    }

    if (!item.pdfUrl && process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        const pdfBlobPath = `research/${item.pdfPath}`;
        const pdfMetadata = await head(pdfBlobPath, {
          token: process.env.BLOB_READ_WRITE_TOKEN,
        });
        item.pdfUrl = pdfMetadata.downloadUrl;
      } catch (error: any) {
        if (!error?.message?.includes("does not exist")) {
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

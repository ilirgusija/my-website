import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { head, list } from "@vercel/blob";
import dotenv from "dotenv";
dotenv.config({ path: ".env.development.local" });

const newsDirectory = path.join(process.cwd(), "content/news");

export interface NewsItem {
  date: string; // ISO date string
  type: "publication" | "talk" | "award" | "position" | "other";
  title: string;
  description?: string;
  link?: string;
  venue?: string; // For talks
  slug: string;
}

export function getNewsSlugs(): string[] {
  if (!fs.existsSync(newsDirectory)) {
    return [];
  }
  return fs
    .readdirSync(newsDirectory)
    .filter((file) => file.endsWith(".md"))
    .map((file) => file.replace(/\.md$/, ""));
}

export async function getAllNewsItems(): Promise<NewsItem[]> {
  // Try to fetch from Vercel Blob first (production)
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const { blobs } = await list({
        prefix: "news/",
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });

      if (blobs.length > 0) {
        const newsItems = await Promise.all(
          blobs
            .filter((blob) => blob.pathname.endsWith(".md"))
            .map(async (blob) => {
              const response = await fetch(blob.downloadUrl);
              const fileContents = await response.text();
              const { data } = matter(fileContents);
              const slug = blob.pathname
                .replace("news/", "")
                .replace(/\.md$/, "");

              return {
                ...(data as Omit<NewsItem, "slug">),
                slug,
              } as NewsItem;
            })
        );

        // Sort by date, most recent first
        return newsItems.sort((a, b) => {
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        });
      }
    } catch (error: any) {
      console.warn("Failed to fetch news from blob:", error.message);
      // Fall through to local file system fallback
    }
  }

  // Fallback to local file system (development)
  if (!fs.existsSync(newsDirectory)) {
    return [];
  }

  const slugs = getNewsSlugs();
  const newsItems = slugs
    .map((slug) => {
      const filePath = path.join(newsDirectory, `${slug}.md`);
      const fileContents = fs.readFileSync(filePath, "utf8");
      const { data } = matter(fileContents);

      return {
        ...(data as Omit<NewsItem, "slug">),
        slug,
      } as NewsItem;
    })
    .sort((a, b) => {
      // Sort by date, most recent first
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

  return newsItems;
}

export async function getNewsItem(slug: string): Promise<NewsItem | null> {
  // Try to fetch from Vercel Blob first (production)
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const blobPath = `news/${slug}.md`;
      const metadata = await head(blobPath, {
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });

      const response = await fetch(metadata.downloadUrl);
      const fileContents = await response.text();
      const { data } = matter(fileContents);

      return {
        ...(data as Omit<NewsItem, "slug">),
        slug,
      } as NewsItem;
    } catch (error: any) {
      if (!error?.message?.includes("does not exist")) {
        console.warn(`Failed to fetch news item ${slug} from blob:`, error.message);
      }
      // Fall through to local file system fallback
    }
  }

  // Fallback to local file system (development)
  const filePath = path.join(newsDirectory, `${slug}.md`);
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const fileContents = fs.readFileSync(filePath, "utf8");
  const { data } = matter(fileContents);

  return {
    ...(data as Omit<NewsItem, "slug">),
    slug,
  } as NewsItem;
}



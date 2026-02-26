import fs from "fs";
import path from "path";
import matter from "gray-matter";
import dotenv from "dotenv";
import { getSupabaseClient, hasSupabaseConfig } from "./supabase-garden";
dotenv.config({ path: ".env.development.local" });
dotenv.config({ path: ".env.local" });

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

interface ResearchRow {
  slug: string;
  title: string;
  authors: string[];
  abstract: string;
  status: "in-progress" | "submitted" | "published";
  arxiv_id: string | null;
  pdf_path: string | null;
  pdf_url: string | null;
  last_updated: string | null;
}

function rowToResearch(row: ResearchRow): Research {
  return {
    slug: row.slug,
    title: row.title,
    authors: row.authors || [],
    abstract: row.abstract || "",
    status: row.status || "in-progress",
    arxivId: row.arxiv_id || undefined,
    pdfPath: row.pdf_path || "",
    pdfUrl: row.pdf_url || undefined,
    lastUpdated: row.last_updated || undefined,
  };
}

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
  // Try Supabase first
  if (hasSupabaseConfig()) {
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data, error } = await supabase
          .from("research_items")
          .select("*");
        if (!error && data) {
          return (data as ResearchRow[])
            .map(rowToResearch)
            .filter((r) => !r.slug.toLowerCase().includes("example"))
            .filter((r) => !r.title.toLowerCase().includes("example"));
        }
      }
    } catch (error: any) {
      console.warn("Failed to fetch research from Supabase:", error.message);
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

  const slugs = getResearchSlugs()
    .filter((slug) => !slug.toLowerCase().includes("example"));
  const research = await Promise.all(
    slugs.map(async (slug) => {
      const filePath = path.join(researchDirectory, `${slug}.md`);
      const fileContents = fs.readFileSync(filePath, "utf8");
      const { data } = matter(fileContents);

      // Additional filter: exclude if title contains "example"
      const title = (data as any).title || "";
      if (title.toLowerCase().includes("example")) {
        return null;
      }

      const item: Research = {
        ...(data as Omit<Research, "slug" | "pdfUrl">),
        slug,
        authors: (data as any).authors ?? [],
      } as Research;

      // Try to get PDF URL from local file in development fallback
      if (item.pdfPath) {
        // In development, check if PDF exists locally
        if (process.env.NODE_ENV === "development") {
          const localPdfPath = path.join(researchDirectory, item.pdfPath);
          if (fs.existsSync(localPdfPath)) {
            item.pdfUrl = `/research/${item.pdfPath}`;
          }
        }
      }

      return item;
    })
  );

  // Filter out null items (excluded examples)
  return research.filter((item): item is Research => item !== null);
}

export async function getResearch(slug: string): Promise<Research | null> {
  // Filter out example research items
  if (slug.toLowerCase().includes("example")) {
    return null;
  }

  // Try Supabase first
  if (hasSupabaseConfig()) {
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data, error } = await supabase
          .from("research_items")
          .select("*")
          .eq("slug", slug)
          .single();
        if (!error && data) {
          const item = rowToResearch(data as ResearchRow);
          if (
            item.slug.toLowerCase().includes("example") ||
            item.title.toLowerCase().includes("example")
          ) {
            return null;
          }
          return item;
        }
      }
    } catch (error: any) {
      console.warn(`Failed to fetch research ${slug} from Supabase:`, error.message);
    }
  }

  // Fallback to local file system (development)
  const filePath = path.join(researchDirectory, `${slug}.md`);
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const fileContents = fs.readFileSync(filePath, "utf8");
  const { data } = matter(fileContents);

  // Additional filter: exclude if title contains "example"
  const title = (data as any).title || "";
  if (title.toLowerCase().includes("example")) {
    return null;
  }

  const item: Research = {
    ...(data as Omit<Research, "slug" | "pdfUrl">),
    slug,
    authors: (data as any).authors ?? [],
  } as Research;

  // Get PDF URL
  if (item.pdfPath) {
    if (process.env.NODE_ENV === "development") {
      const localPdfPath = path.join(researchDirectory, item.pdfPath);
      if (fs.existsSync(localPdfPath)) {
        item.pdfUrl = `/research/${item.pdfPath}`;
      }
    }

  }

  return item;
}

export async function getAllResearchSlugs(): Promise<string[]> {
  const research = await getAllResearch();
  return research.map((item) => item.slug);
}

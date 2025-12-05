import fs from "fs";
import path from "path";
import matter from "gray-matter";

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

export function getAllNewsItems(): NewsItem[] {
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

export function getNewsItem(slug: string): NewsItem | null {
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



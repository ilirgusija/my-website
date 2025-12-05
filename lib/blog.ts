import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { remark } from "remark";
// import html from "remark-html";
import remarkRehype from "remark-rehype";
import remarkStringify from "rehype-stringify";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

const postsDirectory = path.join(process.cwd(), "content/blog");

export interface BlogPost {
  title: string;
  date: string;
  description: string;
  slug: string;
  contentHtml: string;
}

export function getBlogSlugs() {
  return fs.readdirSync(postsDirectory).map((file) => file.replace(/\.md$/, ""));
}

export async function getBlogPost(slug: string): Promise<BlogPost> {
  const filePath = path.join(postsDirectory, `${slug}.md`);
  const fileContents = fs.readFileSync(filePath, "utf8");

  const { data, content } = matter(fileContents);

  const contentHtml = (
    await remark()
      .use(remarkRehype)
      .use(remarkMath) // process latex syntax
      .use(rehypeKatex) // render latex
      .use(remarkStringify)
      .process(content)
  ).toString();

  return {
    ...(data as Omit<BlogPost, "contentHtml">),
    contentHtml,
  };
}

export function getAllBlogPosts(): BlogPost[] {
  const slugs = getBlogSlugs();
  return slugs.map((slug) => {
    const filePath = path.join(postsDirectory, `${slug}.md`);
    const fileContents = fs.readFileSync(filePath, "utf8");

    const { data } = matter(fileContents);
    return {
      ...(data as BlogPost),
      slug,
    };
  });
}
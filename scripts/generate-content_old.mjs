import { serialize } from "next-mdx-remote/serialize";
import path from "path";
import fs from "fs";

async function csvJSON(text, quoteChar = '"', delimiter = ",") {
  var rows = text.split("\n");
  var headers = rows[0].split(",");

  const regex = new RegExp(
    `\\s*(${quoteChar})?(.*?)\\1\\s*(?:${delimiter}|$)`,
    "gs",
  );

  const match = (line) =>
    [...line.matchAll(regex)].map((m) => m[2]).slice(0, -1);

  var lines = text.split("\n");
  const heads = headers ?? match(lines.shift());
  lines = lines.slice(1);

  return lines.map((line) => {
    return match(line).reduce((acc, cur, i) => {
      // replace blank matches with `null`
      const val = cur.length <= 0 ? null : Number(cur) || cur;
      const key = heads[i] ?? `{i}`;
      return { ...acc, [key]: val };
    }, {});
  });
}

async function books() {
  // Here we set the dir for our books
  const basePath = path.join(process.cwd(), "content", "books");
  const bookPaths = fs.readdirSync(basePath, "utf8");
  const api_key = "AIzaSyA2OFqBel6WZgzaLCwAGFhBQsMMo-N6Zf4"
  const books = await Promise.all(
    bookPaths
      .filter((fileName) => fileName.includes(".mdx"))
      .map(async (fileName) => {
        const contentPath = path.join(basePath, fileName);
        const fileContents = fs
          .readFileSync(contentPath, "utf8")
          .split("## My Notes")[0];
        const source = await serialize(fileContents, {
          parseFrontmatter: true,
          mdxOptions: { development: false },
        });

        return {
          ...source.frontmatter,
          slug: "/" + path.join("books", fileName.split(".")[0]),
          summary: source.compiledSource,
        };
      }),
  );

  const csvPath = path.join(process.cwd(), "content", "reading_list.csv");
  const json = filterJSON(csvJSON(csvPath))
  
  books.sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return dateB.getTime() - dateA.getTime();
  });

  fs.writeFileSync(
    path.join(basePath, "index.json"),
    JSON.stringify(books, undefined, 2),
  );
}

async function main() {
  await books();
}

main();

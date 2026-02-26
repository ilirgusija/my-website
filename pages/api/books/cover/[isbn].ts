import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabaseClient } from "../../../../lib/supabase-garden";

const DEFAULT_COVER_PATH = "/books/null.jpg";

function getBooksBucket(): string {
  return process.env.SUPABASE_BOOKS_BUCKET || "book covers";
}

function getBooksPrefix(): string {
  const rawPrefix = process.env.SUPABASE_BOOKS_STORAGE_PREFIX || "";
  return rawPrefix ? rawPrefix.replace(/^\/+/, "").replace(/\/+$/, "") + "/" : "";
}

function isSafeIsbn(isbn: string): boolean {
  return /^[0-9Xx-]+$/.test(isbn);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  const isbnParam = req.query.isbn;
  const isbn = Array.isArray(isbnParam) ? isbnParam[0] : isbnParam;
  if (!isbn || !isSafeIsbn(isbn)) {
    res.redirect(307, DEFAULT_COVER_PATH);
    return;
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    res.redirect(307, DEFAULT_COVER_PATH);
    return;
  }

  try {
    const objectPath = `${getBooksPrefix()}${isbn}.jpg`;
    const { data, error } = await supabase
      .storage
      .from(getBooksBucket())
      .createSignedUrl(objectPath, 60 * 10);

    if (error || !data?.signedUrl) {
      res.redirect(307, DEFAULT_COVER_PATH);
      return;
    }

    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=86400");
    res.redirect(307, data.signedUrl);
  } catch {
    res.redirect(307, DEFAULT_COVER_PATH);
  }
}

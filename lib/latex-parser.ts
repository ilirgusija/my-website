/**
 * LaTeX metadata parser
 * Extracts metadata from LaTeX files including title, authors, abstract, etc.
 */

export interface LaTeXMetadata {
  title?: string;
  authors?: string[];
  abstract?: string;
  date?: string;
  keywords?: string[];
  status?: "in-progress" | "submitted" | "published";
}

/**
 * Extract content from LaTeX command
 * Handles both \command{content} and \begin{environment}...\end{environment}
 */
function extractLaTeXCommand(content: string, command: string): string | null {
  // Try single-line command: \command{content}
  const singleLineRegex = new RegExp(`\\\\${command}\\s*\\{([^}]+)\\}`, "i");
  const singleMatch = content.match(singleLineRegex);
  if (singleMatch) {
    return singleMatch[1].trim();
  }

  // Try multi-line command: \command{content with
  // multiple lines}
  const multiLineRegex = new RegExp(
    `\\\\${command}\\s*\\{([^}]+(?:\\}[^}]*)*)\\}`,
    "is"
  );
  const multiMatch = content.match(multiLineRegex);
  if (multiMatch) {
    return multiMatch[1]
      .replace(/\n/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  return null;
}

/**
 * Extract content from LaTeX environment
 */
function extractLaTeXEnvironment(
  content: string,
  environment: string
): string | null {
  const regex = new RegExp(
    `\\\\begin\\{${environment}\\}([\\s\\S]*?)\\\\end\\{${environment}\\}`,
    "i"
  );
  const match = content.match(regex);
  if (match) {
    return match[1]
      .replace(/\\[a-zA-Z]+\{([^}]+)\}/g, "$1") // Remove LaTeX commands, keep content
      .replace(/\n/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  return null;
}

/**
 * Parse authors from LaTeX \author command
 * Handles various formats:
 * - \author{Name}
 * - \author{Name1 \and Name2}
 * - \author{Name1 \\ Name2}
 */
function parseAuthors(authorString: string): string[] {
  if (!authorString) return [];

  // Split by \and or \\ or ,
  const authors = authorString
    .split(/(?:\\and|\\\\|,)/)
    .map((author) =>
      author
        .replace(/\\[a-zA-Z]+\{([^}]+)\}/g, "$1") // Remove LaTeX commands
        .trim()
    )
    .filter((author) => author.length > 0);

  return authors;
}

/**
 * Parse keywords from LaTeX \keywords command
 */
function parseKeywords(keywordsString: string): string[] {
  if (!keywordsString) return [];

  return keywordsString
    .split(/,|;/)
    .map((kw) => kw.trim())
    .filter((kw) => kw.length > 0);
}

/**
 * Clean LaTeX content - remove commands and formatting
 */
function cleanLaTeXContent(content: string): string {
  return content
    .replace(/\\[a-zA-Z]+\{([^}]+)\}/g, "$1") // Remove commands like \textbf{text} -> text
    .replace(/\\[a-zA-Z]+/g, "") // Remove standalone commands
    .replace(/\{|\}/g, "") // Remove remaining braces
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extract metadata from LaTeX file content
 */
export function parseLaTeXMetadata(texContent: string): LaTeXMetadata {
  const metadata: LaTeXMetadata = {};

  // Extract title
  const title = extractLaTeXCommand(texContent, "title");
  if (title) {
    metadata.title = cleanLaTeXContent(title);
  }

  // Extract authors
  const authorString = extractLaTeXCommand(texContent, "author");
  if (authorString) {
    metadata.authors = parseAuthors(authorString);
  }

  // Extract abstract (try both command and environment)
  let abstract =
    extractLaTeXCommand(texContent, "abstract") ||
    extractLaTeXEnvironment(texContent, "abstract");
  if (abstract) {
    metadata.abstract = cleanLaTeXContent(abstract);
  }

  // Extract date
  const date = extractLaTeXCommand(texContent, "date");
  if (date) {
    metadata.date = cleanLaTeXContent(date);
  }

  // Extract keywords
  const keywordsString = extractLaTeXCommand(texContent, "keywords");
  if (keywordsString) {
    metadata.keywords = parseKeywords(keywordsString);
  }

  // Try to infer status from comments or documentclass
  // Look for comments like % status: in-progress
  const statusMatch = texContent.match(/%\s*status:\s*(in-progress|submitted|published)/i);
  if (statusMatch) {
    metadata.status = statusMatch[1].toLowerCase() as LaTeXMetadata["status"];
  }

  return metadata;
}

/**
 * Find corresponding .tex file for a PDF
 */
export function findTexFileForPdf(
  pdfPath: string,
  texFiles: string[]
): string | null {
  // Remove .pdf extension and try to find matching .tex
  const baseName = pdfPath.replace(/\.pdf$/i, "");
  
  // Try exact match
  const exactMatch = texFiles.find(
    (tex) => tex.replace(/\.tex$/i, "") === baseName
  );
  if (exactMatch) return exactMatch;

  // Try matching by directory structure
  // e.g., paper/main.pdf -> paper/main.tex
  const dirMatch = texFiles.find((tex) => {
    const texBase = tex.replace(/\.tex$/i, "");
    return texBase.endsWith(baseName) || baseName.endsWith(texBase);
  });
  if (dirMatch) return dirMatch;

  // Try finding main.tex in the same directory
  const pdfDir = pdfPath.substring(0, pdfPath.lastIndexOf("/"));
  const mainTex = texFiles.find(
    (tex) => tex.startsWith(pdfDir) && tex.endsWith("main.tex")
  );
  if (mainTex) return mainTex;

  return null;
}


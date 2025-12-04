import fs from "fs";
import path from "path";
import { parseLaTeXMetadata, findTexFileForPdf } from "../lib/latex-parser";
import matter from "gray-matter";

const researchDirectory = path.join(process.cwd(), "content/research");

interface ResearchMetadata {
  title: string;
  authors: string[];
  abstract: string;
  status: "in-progress" | "submitted" | "published";
  pdfPath: string;
  lastUpdated?: string;
  arxivId?: string;
}

/**
 * Generate markdown file from LaTeX metadata
 */
function generateMarkdownFromMetadata(
  slug: string,
  metadata: ResearchMetadata,
  latexMetadata: any
): string {
  const frontmatter: any = {
    title: metadata.title || latexMetadata.title || "Untitled",
    authors: metadata.authors || latexMetadata.authors || ["Unknown"],
    abstract: metadata.abstract || latexMetadata.abstract || "",
    status: metadata.status || latexMetadata.status || "in-progress",
    pdfPath: metadata.pdfPath,
  };

  if (metadata.lastUpdated) {
    frontmatter.lastUpdated = metadata.lastUpdated;
  }

  if (metadata.arxivId) {
    frontmatter.arxivId = metadata.arxivId;
  }

  if (latexMetadata.date) {
    frontmatter.date = latexMetadata.date;
  }

  if (latexMetadata.keywords && latexMetadata.keywords.length > 0) {
    frontmatter.keywords = latexMetadata.keywords;
  }

  return matter.stringify("", frontmatter);
}

/**
 * Extract metadata from LaTeX files and generate markdown files
 */
export async function extractAndGenerateMetadata(
  researchRepoPath: string
): Promise<void> {
  const researchDir = path.join(researchRepoPath);
  
  if (!fs.existsSync(researchDir)) {
    console.log("Research repository directory not found");
    return;
  }

  // Find all .tex files
  const findTexFiles = (dir: string, fileList: string[] = []): string[] => {
    const files = fs.readdirSync(dir);
    files.forEach((file) => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        findTexFiles(filePath, fileList);
      } else if (file.endsWith(".tex")) {
        fileList.push(path.relative(researchDir, filePath));
      }
    });
    return fileList;
  };

  // Find all PDF files
  const findPdfFiles = (dir: string, fileList: string[] = []): string[] => {
    const files = fs.readdirSync(dir);
    files.forEach((file) => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        findPdfFiles(filePath, fileList);
      } else if (file.endsWith(".pdf")) {
        fileList.push(path.relative(researchDir, filePath));
      }
    });
    return fileList;
  };

  const texFiles = findTexFiles(researchDir);
  const pdfFiles = findPdfFiles(researchDir);

  console.log(`Found ${texFiles.length} LaTeX files and ${pdfFiles.length} PDF files`);

  // Process each PDF and try to find corresponding .tex file
  for (const pdfPath of pdfFiles) {
    const texFile = findTexFileForPdf(pdfPath, texFiles);
    
    if (!texFile) {
      console.log(`No .tex file found for ${pdfPath}, skipping metadata extraction`);
      continue;
    }

    try {
      const texFilePath = path.join(researchDir, texFile);
      const texContent = fs.readFileSync(texFilePath, "utf8");
      const latexMetadata = parseLaTeXMetadata(texContent);

      // Generate slug from PDF filename (use directory name if in subdirectory)
      const pdfDir = path.dirname(pdfPath);
      const pdfBaseName = path.basename(pdfPath, ".pdf");
      const slug = pdfDir !== "."
        ? `${path.basename(pdfDir)}-${pdfBaseName}`
        : pdfBaseName;
      const finalSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");

      // Check if markdown file already exists
      const markdownPath = path.join(researchDirectory, `${finalSlug}.md`);
      let existingMetadata: ResearchMetadata | null = null;

      if (fs.existsSync(markdownPath)) {
        const existingContent = fs.readFileSync(markdownPath, "utf8");
        const parsed = matter(existingContent);
        existingMetadata = parsed.data as ResearchMetadata;
      }

      // Merge LaTeX metadata with existing metadata (existing takes precedence)
      const mergedMetadata: ResearchMetadata = {
        title: existingMetadata?.title || latexMetadata.title || finalSlug,
        authors: existingMetadata?.authors || latexMetadata.authors || ["Unknown"],
        abstract: existingMetadata?.abstract || latexMetadata.abstract || "",
        status: existingMetadata?.status || latexMetadata.status || "in-progress",
        pdfPath: pdfPath,
        lastUpdated: existingMetadata?.lastUpdated || new Date().toISOString().split("T")[0],
        arxivId: existingMetadata?.arxivId,
      };

      // Generate markdown content
      const markdownContent = generateMarkdownFromMetadata(
        finalSlug,
        mergedMetadata,
        latexMetadata
      );

      // Ensure research directory exists
      if (!fs.existsSync(researchDirectory)) {
        fs.mkdirSync(researchDirectory, { recursive: true });
      }

      // Write markdown file
      fs.writeFileSync(markdownPath, markdownContent);
      console.log(`✓ Generated metadata for ${finalSlug} from ${texFile}`);
    } catch (error: any) {
      console.error(`✗ Error processing ${pdfPath}:`, error.message);
    }
  }
}

// If run directly
if (require.main === module) {
  const researchRepoPath = process.argv[2] || path.join(process.cwd(), "research-repo");
  extractAndGenerateMetadata(researchRepoPath)
    .then(() => {
      console.log("Metadata extraction completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Error extracting metadata:", error);
      process.exit(1);
    });
}


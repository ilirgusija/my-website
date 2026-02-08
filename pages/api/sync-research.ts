import type { NextApiRequest, NextApiResponse } from "next";
import { put } from "@vercel/blob";
import { Octokit } from "@octokit/rest";

interface SyncResearchResponse {
  success: boolean;
  message: string;
  synced?: number;
  errors?: string[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SyncResearchResponse>
) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed",
    });
  }

  // Check for authentication token (optional, but recommended)
  const authToken = req.headers.authorization?.replace("Bearer ", "");
  const expectedToken = process.env.SYNC_PAPERS_SECRET;

  if (expectedToken && authToken !== expectedToken) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }

  try {
    const githubToken = process.env.PAPERS_TOKEN;
    const papersRepo = process.env.PAPERS_REPO;

    if (!githubToken || !papersRepo) {
      return res.status(500).json({
        success: false,
        message: "GitHub credentials not configured",
      });
    }

    const octokit = new Octokit({ auth: githubToken });
    const [owner, repo] = papersRepo.split("/");

    // Get all PDF files from the repository
    const { data: tree } = await octokit.rest.git.getTree({
      owner,
      repo,
      tree_sha: "HEAD",
      recursive: "true",
    });

    const pdfFiles = tree.tree.filter(
      (file) => file.type === "blob" && file.path?.endsWith(".pdf")
    );

    if (pdfFiles.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No PDF files found in research repository",
        synced: 0,
      });
    }

    const errors: string[] = [];
    let synced = 0;
    const syncedSlugs: string[] = [];

    // Download and upload each PDF
    for (const file of pdfFiles) {
      if (!file.path || !file.sha) continue;

      try {
        // Download the file from GitHub
        const { data: blob } = await octokit.rest.git.getBlob({
          owner,
          repo,
          file_sha: file.sha,
        });

        const pdfBuffer = Buffer.from(blob.content, "base64");
        const blobPath = `research/${file.path}`;

        // Upload to Vercel Blob
        await put(blobPath, pdfBuffer, {
          access: "public",
          contentType: "application/pdf",
          addRandomSuffix: false,
        });

        // Extract slug from file path (assuming format like "slug.pdf" or "subfolder/slug.pdf")
        const slug = file.path.replace(/\.pdf$/, "").split("/").pop() || "";
        if (slug) {
          syncedSlugs.push(slug);
        }

        synced++;
      } catch (error: any) {
        errors.push(`Failed to sync ${file.path}: ${error.message}`);
      }
    }

    // Revalidate research pages to ensure updated PDFs are reflected
    console.log('Revalidating research pages...');
    try {
      // Revalidate the research index page
      await res.revalidate("/research");
      
      // Revalidate individual research pages for synced PDFs
      for (const slug of syncedSlugs) {
        try {
          await res.revalidate(`/research/${slug}`);
        } catch (revalidateError) {
          console.error(`Failed to revalidate /research/${slug}:`, revalidateError);
        }
      }
    } catch (revalidateError) {
      console.error('Failed to revalidate research pages:', revalidateError);
      // Don't fail the request if revalidation fails
    }

    return res.status(200).json({
      success: true,
      message: `Synced ${synced} PDF files`,
      synced,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error("Error syncing research:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
}


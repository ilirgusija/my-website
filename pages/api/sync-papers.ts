import type { NextApiRequest, NextApiResponse } from "next";
import { put } from "@vercel/blob";
import { Octokit } from "@octokit/rest";

interface SyncPapersResponse {
  success: boolean;
  message: string;
  synced?: number;
  errors?: string[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SyncPapersResponse>
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
        message: "No PDF files found in repository",
        synced: 0,
      });
    }

    const errors: string[] = [];
    let synced = 0;

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

        synced++;
      } catch (error: any) {
        errors.push(`Failed to sync ${file.path}: ${error.message}`);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Synced ${synced} PDF files`,
      synced,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error("Error syncing papers:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
}


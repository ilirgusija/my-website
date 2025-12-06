import type { NextApiRequest, NextApiResponse } from "next";
import sharp from "sharp";

/**
 * Generate a simple placeholder thumbnail
 * Actual thumbnails are generated client-side in the browser using PDF.js
 * This endpoint just returns a placeholder for now
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { width = "800", quality = "85" } = req.query;

  const targetWidth = parseInt(width as string, 10);
  const targetHeight = Math.round(targetWidth * 1.414); // A4 aspect ratio

  try {
    // Generate a simple placeholder
    // Actual thumbnails are generated client-side
    const placeholder = await sharp({
      create: {
        width: targetWidth,
        height: targetHeight,
        channels: 3,
        background: { r: 248, g: 249, b: 250 },
      },
    })
      .jpeg({ quality: parseInt(quality as string, 10) })
      .toBuffer();

    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=300"); // Short cache
    res.setHeader("X-Thumbnail-Status", "placeholder");
    return res.send(placeholder);
  } catch (error: any) {
    console.error("Error generating placeholder:", error);
    res.status(500).json({ error: "Failed to generate placeholder" });
  }
}


import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { url } = req.query;

  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "Image URL is required" });
  }

  try {
    // Fetch the image from the provided URL
    const response = await fetch(url);

    if (!response.ok) {
      return res.status(response.status).json({ error: "Failed to fetch image" });
    }

    // Get the image as a buffer
    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "image/jpeg";

    // Set appropriate headers for image viewing
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Length", buffer.byteLength);
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET");

    // Send the image
    res.send(Buffer.from(buffer));
  } catch (error: any) {
    console.error("Error proxying image:", error);
    res.status(500).json({ error: "Failed to proxy image" });
  }
}


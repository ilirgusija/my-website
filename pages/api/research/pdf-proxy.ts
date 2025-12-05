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
    return res.status(400).json({ error: "PDF URL is required" });
  }

  try {
    // Fetch the PDF from the provided URL
    const response = await fetch(url);

    if (!response.ok) {
      return res.status(response.status).json({ error: "Failed to fetch PDF" });
    }

    // Get the PDF as a buffer
    const buffer = await response.arrayBuffer();

    // Set appropriate headers for PDF viewing
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Length", buffer.byteLength);
    res.setHeader("Content-Disposition", `inline; filename="preview.pdf"`);
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET");

    // Send the PDF
    res.send(Buffer.from(buffer));
  } catch (error: any) {
    console.error("Error proxying PDF:", error);
    res.status(500).json({ error: "Failed to proxy PDF" });
  }
}


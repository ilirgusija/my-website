import type { NextApiRequest, NextApiResponse } from 'next';
import { getGardenNotePreview } from '../../../../lib/garden/index';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const slugParts = req.query.slug;
    if (!slugParts || !Array.isArray(slugParts)) {
        return res.status(400).json({ error: 'Invalid slug' });
    }

    const slug = slugParts.join('/');
    const note = await getGardenNotePreview(slug);

    if (!note) {
        return res.status(404).json({ error: 'Note not found' });
    }

    res.setHeader(
        'Cache-Control',
        'public, s-maxage=3600, stale-while-revalidate=86400'
    );
    return res.status(200).json(note);
}

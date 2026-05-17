import { getAllData, getAnnouncement } from './gsheets.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });

    try {
        const [data, announcement] = await Promise.all([
            getAllData(),
            getAnnouncement()
        ]);

        return res.status(200).json({ success: true, data: { ...data, announcement } });
    } catch (error) {
        console.error('Data API Error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
}

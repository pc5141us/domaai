import { getAllData, getAnnouncement } from './gsheets.js';

// Server-side in-memory cache (persists across warm Vercel function invocations)
let _cache = null;
let _cacheTime = 0;
const CACHE_TTL = 12000; // 12 seconds - matches client poll interval

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });

    // Allow forced refresh via ?refresh=1
    const forceRefresh = req.query?.refresh === '1';
    const now = Date.now();

    // Return cached response if still fresh
    if (!forceRefresh && _cache && (now - _cacheTime) < CACHE_TTL) {
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('Cache-Control', 'no-store'); // Browser must always ask us, we handle caching
        return res.status(200).json(_cache);
    }

    try {
        // Fetch both in parallel
        const [data, announcement] = await Promise.all([
            getAllData(),
            getAnnouncement()
        ]);

        _cache = { success: true, data: { ...data, announcement } };
        _cacheTime = now;

        res.setHeader('X-Cache', 'MISS');
        res.setHeader('Cache-Control', 'no-store');
        return res.status(200).json(_cache);
    } catch (error) {
        console.error('Data API Error:', error);
        // Return stale cache on error rather than failing
        if (_cache) {
            res.setHeader('X-Cache', 'STALE');
            return res.status(200).json(_cache);
        }
        return res.status(500).json({ success: false, error: error.message });
    }
}

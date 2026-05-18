import { addRecord, updateRecord, deleteRecord, getRecordByField, updateAnnouncement, deleteAnnouncement, appsPost } from './gsheets.js';

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

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const { action, table, payload } = req.body;

    try {
        let result;
        switch (action) {
            case 'restore':
                const successRestore = await appsPost({ action: 'restore', payload });
                return res.status(200).json({ success: successRestore.success });

            case 'add':
                result = await addRecord(table, payload);
                return res.status(200).json({ success: true, data: result });

            case 'update':
                const successUpdate = await updateRecord(table, payload.id, payload.updates);
                return res.status(200).json({ success: successUpdate });

            case 'delete':
                const successDelete = await deleteRecord(table, payload.id);
                return res.status(200).json({ success: successDelete });

            case 'get_coupon':
                result = await getRecordByField('coupons', 'code', payload.code);
                return res.status(200).json({ success: true, data: result });

            // Announcement-specific actions
            case 'update_announcement':
                const successAnn = await updateAnnouncement(payload);
                return res.status(200).json({ success: successAnn });

            case 'delete_announcement':
                const successDelAnn = await deleteAnnouncement();
                return res.status(200).json({ success: successDelAnn });

            default:
                return res.status(400).json({ success: false, error: 'Unknown action' });
        }
    } catch (error) {
        console.error('Action API Error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
}

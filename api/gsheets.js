/**
 * Doma AI - Google Sheets API Layer (via Apps Script Web App)
 */

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbzZA8foEVn5-ltu4nPvJbXl-I2TIeT-ZW4QjCYaeSeIDUvGv-TXACcFdAOb2YYHfXUi/exec';

export async function appsGet(params) {
    const url = new URL(APPS_SCRIPT_URL);
    for (const [k, v] of Object.entries(params)) {
        url.searchParams.set(k, v);
    }
    const res = await fetch(url.toString());
    return await res.json();
}

export async function appsPost(body) {
    // Google Apps Script redirects POST → GET (losing the body).
    // Fix: Send all operations as GET with the body encoded as a URL param.
    const url = new URL(APPS_SCRIPT_URL);
    url.searchParams.set('payload', JSON.stringify(body));
    const res = await fetch(url.toString());
    return await res.json();
}

function toNumericIfPossible(val) {
    if (typeof val === 'string' && val.trim() !== '') {
        const num = Number(val);
        if (!isNaN(num)) return num;
    }
    return val;
}

export async function getAllData() {
    const result = await appsGet({ action: 'getAll' });
    if (result.success) return result.data;
    throw new Error(result.error || 'Failed to fetch data');
}

export async function addRecord(table, record) {
    if (!record.id) record.id = Date.now().toString();
    if (record.id) record.id = toNumericIfPossible(record.id);
    const result = await appsPost({ action: 'add', table, payload: record });
    if (!result.success) throw new Error(result.error || 'Failed to add record');
    return result.data || record;
}

export async function updateRecord(table, id, updates) {
    const finalId = toNumericIfPossible(id);
    const result = await appsPost({ action: 'update', table, payload: { id: finalId, updates } });
    return result.success || false;
}

export async function deleteRecord(table, id) {
    const finalId = toNumericIfPossible(id);
    const result = await appsPost({ action: 'delete', table, payload: { id: finalId } });
    return result.success || false;
}

export async function updateRecordByField(table, fieldName, fieldValue, updates) {
    const finalVal = toNumericIfPossible(fieldValue);
    const result = await appsPost({ action: 'updateByField', table, payload: { fieldName, fieldValue: finalVal, updates } });
    return result.success || false;
}

export async function getRecordByField(table, fieldName, fieldValue) {
    const finalVal = toNumericIfPossible(fieldValue);
    const result = await appsPost({ action: 'getByField', table, payload: { fieldName, fieldValue: finalVal } });
    if (result.success) return result.data;
    return null;
}

export async function deleteRecordByField(table, fieldName, fieldValue) {
    const finalVal = toNumericIfPossible(fieldValue);
    const result = await appsPost({ action: 'deleteByField', table, payload: { fieldName, fieldValue: finalVal } });
    return result.success || false;
}

// --- ANNOUNCEMENT HELPERS (stored in 'settings' sheet) ---

export async function getAnnouncement() {
    const result = await appsPost({ action: 'getByField', table: 'settings', payload: { fieldName: 'key', fieldValue: 'announcement' } });
    if (result.success && result.data && result.data.value) {
        try { return JSON.parse(result.data.value); } catch (e) { return { text: result.data.value, buttonText: '', buttonUrl: '' }; }
    }
    return { text: '', buttonText: '', buttonUrl: '' };
}

export async function updateAnnouncement(announceObj) {
    const result = await appsPost({
        action: 'updateByField', table: 'settings',
        payload: { fieldName: 'key', fieldValue: 'announcement', updates: { value: JSON.stringify(announceObj) } }
    });
    return result.success || false;
}

export async function deleteAnnouncement() {
    const result = await appsPost({ action: 'deleteByField', table: 'settings', payload: { fieldName: 'key', fieldValue: 'announcement' } });
    return result.success || false;
}

export async function getSheet() { return null; }
export async function getDoc() { return null; }

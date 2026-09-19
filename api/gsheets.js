/**
 * Doma AI - Fast Google Sheets API Layer with High-Speed In-Memory Caching
 */

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbyRRnfsdggfhQQF0bEKZc8BUwi2fzFxUIozZ7HeEzKU49KSsfFmfN02sLCLKOeV9s7S/exec';

// Server-side in-memory cache for ultra-fast response times
let _memoryCache = null;
let _memoryCacheTime = 0;
const CACHE_TTL_MS = 10000; // 10 seconds cache TTL for super-fast repeat reads

export async function appsGet(params) {
    const url = new URL(APPS_SCRIPT_URL);
    for (const [k, v] of Object.entries(params)) {
        url.searchParams.set(k, v);
    }
    const res = await fetch(url.toString());
    return await res.json();
}

export async function appsPost(body) {
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

/**
 * Get all data with high-speed memory caching
 */
export async function getAllData(forceRefresh = false) {
    const now = Date.now();
    if (!forceRefresh && _memoryCache && (now - _memoryCacheTime) < CACHE_TTL_MS) {
        return _memoryCache;
    }

    try {
        const result = await appsGet({ action: 'getAll' });
        if (result.success && result.data) {
            _memoryCache = result.data;
            _memoryCacheTime = Date.now();
            return _memoryCache;
        }
    } catch (e) {
        console.error('getAllData fetch error:', e);
    }

    if (_memoryCache) return _memoryCache; // Return stale cache on error
    throw new Error('Failed to fetch data from Google Sheets');
}

/**
 * Helper to update memory cache on mutations
 */
function updateMemoryCache(table, action, recordOrId, updates = null) {
    if (!_memoryCache || !_memoryCache[table]) return;
    try {
        if (action === 'add') {
            _memoryCache[table] = [recordOrId, ...(_memoryCache[table] || [])];
        } else if (action === 'update') {
            const finalId = toNumericIfPossible(recordOrId);
            const idx = _memoryCache[table].findIndex(r => toNumericIfPossible(r.id) === finalId);
            if (idx !== -1 && updates) {
                _memoryCache[table][idx] = { ..._memoryCache[table][idx], ...updates };
            }
        } else if (action === 'delete') {
            const finalId = toNumericIfPossible(recordOrId);
            _memoryCache[table] = _memoryCache[table].filter(r => toNumericIfPossible(r.id) !== finalId);
        }
    } catch (e) {
        console.warn('Cache update warning:', e);
    }
}

export async function addRecord(table, record) {
    if (!record.id) record.id = Date.now().toString();
    if (record.id) record.id = toNumericIfPossible(record.id);

    // Optimistically update memory cache for 0ms read latency
    updateMemoryCache(table, 'add', record);

    const result = await appsPost({ action: 'add', table, payload: record });
    if (!result.success) {
        _memoryCache = null; // Invalidate cache on failure
        throw new Error(result.error || 'Failed to add record');
    }
    return result.data || record;
}

export async function updateRecord(table, id, updates) {
    const finalId = toNumericIfPossible(id);

    // Optimistically update memory cache
    updateMemoryCache(table, 'update', finalId, updates);

    const result = await appsPost({ action: 'update', table, payload: { id: finalId, updates } });
    if (!result.success) _memoryCache = null;
    return result.success || false;
}

export async function deleteRecord(table, id) {
    const finalId = toNumericIfPossible(id);

    // Optimistically update memory cache
    updateMemoryCache(table, 'delete', finalId);

    const result = await appsPost({ action: 'delete', table, payload: { id: finalId } });
    if (!result.success) _memoryCache = null;
    return result.success || false;
}

export async function updateRecordByField(table, fieldName, fieldValue, updates) {
    const finalVal = toNumericIfPossible(fieldValue);

    if (_memoryCache && _memoryCache[table]) {
        const item = _memoryCache[table].find(r => toNumericIfPossible(r[fieldName]) === finalVal);
        if (item) updateMemoryCache(table, 'update', item.id, updates);
    }

    const result = await appsPost({ action: 'updateByField', table, payload: { fieldName, fieldValue: finalVal, updates } });
    if (!result.success) _memoryCache = null;
    return result.success || false;
}

export async function getRecordByField(table, fieldName, fieldValue) {
    const finalVal = toNumericIfPossible(fieldValue);

    // Try reading from high-speed memory cache first
    const data = await getAllData().catch(() => null);
    if (data && data[table]) {
        const record = data[table].find(r => toNumericIfPossible(r[fieldName]) === finalVal);
        if (record) return record;
    }

    const result = await appsPost({ action: 'getByField', table, payload: { fieldName, fieldValue: finalVal } });
    if (result.success) return result.data;
    return null;
}

export async function deleteRecordByField(table, fieldName, fieldValue) {
    const finalVal = toNumericIfPossible(fieldValue);

    if (_memoryCache && _memoryCache[table]) {
        _memoryCache[table] = _memoryCache[table].filter(r => toNumericIfPossible(r[fieldName]) !== finalVal);
    }

    const result = await appsPost({ action: 'deleteByField', table, payload: { fieldName, fieldValue: finalVal } });
    if (!result.success) _memoryCache = null;
    return result.success || false;
}

// --- ANNOUNCEMENT HELPERS (stored in 'settings' sheet) ---

let _announcementCache = null;
let _announcementCacheTime = 0;

export async function getAnnouncement() {
    const now = Date.now();
    if (_announcementCache && (now - _announcementCacheTime) < CACHE_TTL_MS) {
        return _announcementCache;
    }

    const result = await appsPost({ action: 'getByField', table: 'settings', payload: { fieldName: 'key', fieldValue: 'announcement' } });
    if (result.success && result.data && result.data.value) {
        try {
            _announcementCache = JSON.parse(result.data.value);
        } catch (e) {
            _announcementCache = { text: result.data.value, buttonText: '', buttonUrl: '' };
        }
        _announcementCacheTime = now;
        return _announcementCache;
    }
    return { text: '', buttonText: '', buttonUrl: '' };
}

export async function updateAnnouncement(announceObj) {
    _announcementCache = announceObj;
    _announcementCacheTime = Date.now();
    const result = await appsPost({
        action: 'updateByField', table: 'settings',
        payload: { fieldName: 'key', fieldValue: 'announcement', updates: { value: JSON.stringify(announceObj) } }
    });
    return result.success || false;
}

export async function deleteAnnouncement() {
    _announcementCache = { text: '', buttonText: '', buttonUrl: '' };
    const result = await appsPost({ action: 'deleteByField', table: 'settings', payload: { fieldName: 'key', fieldValue: 'announcement' } });
    return result.success || false;
}

export async function getSheet() { return null; }
export async function getDoc() { return null; }

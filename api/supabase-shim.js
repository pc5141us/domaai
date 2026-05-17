/**
 * Supabase-compatible shim over Google Apps Script Web App
 * Used by webhook.js (Bot) without changing existing Supabase call patterns
 */
import {
    getAllData, addRecord, updateRecord, deleteRecord,
    updateRecordByField, getRecordByField,
    getAnnouncement, updateAnnouncement, deleteAnnouncement
} from './gsheets.js';

// Helper: check if this is an ANNOUNCEMENT_DATA query on users
function isAnnouncementQuery(conditions) {
    return conditions.eq.some(c => c.col === 'username' && c.val === 'ANNOUNCEMENT_DATA');
}

export const supabase = {
    from(table) {
        const _conditions = { eq: [], ilike: [], in: [], not: [], filter: [] };

        const self = {
            select(cols) { return self; },
            eq(col, val)    { _conditions.eq.push({ col, val }); return self; },
            ilike(col, val) { _conditions.ilike.push({ col, val }); return self; },
            in(col, arr)    { _conditions.in.push({ col, arr }); return self; },
            not(col, op, val) { _conditions.not.push({ col, op, val }); return self; },
            filter(col, op, val) { _conditions.filter.push({ col, op, val }); return self; },

            async _getRows() {
                // Intercept ANNOUNCEMENT_DATA queries → route to settings sheet
                if (table === 'users' && isAnnouncementQuery(_conditions)) {
                    const ann = await getAnnouncement();
                    if (ann && ann.text) {
                        return [{ id: 'announcement', username: 'ANNOUNCEMENT_DATA', password: JSON.stringify(ann), role: 'system', status: 'active' }];
                    }
                    return [];
                }

                const allData = await getAllData();
                let rows = allData[table] || [];

                for (const c of _conditions.eq) {
                    rows = rows.filter(r => String(r[c.col] ?? '') === String(c.val ?? ''));
                }
                for (const c of _conditions.ilike) {
                    const v = String(c.val ?? '').toLowerCase().replace(/%/g, '');
                    rows = rows.filter(r => r[c.col] && String(r[c.col]).toLowerCase().includes(v));
                }
                for (const c of _conditions.in) {
                    rows = rows.filter(r => (c.arr || []).map(String).includes(String(r[c.col])));
                }
                for (const c of _conditions.not) {
                    if (c.op === 'is' && c.val === null) {
                        rows = rows.filter(r => r[c.col] !== null && r[c.col] !== '');
                    }
                }
                for (const c of _conditions.filter) {
                    if (c.op === 'ilike') {
                        const v = String(c.val ?? '').toLowerCase().replace(/%/g, '');
                        rows = rows.filter(r => r[c.col] && String(r[c.col]).toLowerCase().includes(v));
                    }
                }
                return rows;
            },

            // Fetch many
            then(resolve, reject) {
                return self._getRows()
                    .then(rows => resolve({ data: rows, error: null }))
                    .catch(e => resolve({ data: null, error: e }));
            },

            async single() {
                const rows = await self._getRows();
                if (!rows || rows.length === 0) return { data: null, error: { message: 'Row not found' } };
                return { data: rows[0], error: null };
            },

            async maybeSingle() {
                const rows = await self._getRows();
                return { data: rows?.[0] ?? null, error: null };
            },

            // UPDATE
            update(updates) {
                return {
                    eq: async (col, val) => {
                        try {
                            // Intercept: update ANNOUNCEMENT_DATA → settings sheet
                            if (table === 'users' && val === 'announcement' && col === 'id') {
                                if (updates.password) {
                                    try { await updateAnnouncement(JSON.parse(updates.password)); }
                                    catch (e) { await updateAnnouncement({ text: updates.password, buttonText: '', buttonUrl: '' }); }
                                }
                                return { error: null };
                            }

                            if (col === 'id') {
                                await updateRecord(table, val, updates);
                            } else {
                                await updateRecordByField(table, col, val, updates);
                            }
                            return { error: null };
                        } catch (e) {
                            return { error: e };
                        }
                    }
                };
            },

            // INSERT
            insert(records) {
                const doInsert = async () => {
                    const insertedItems = [];
                    for (const rec of records) {
                        // Intercept: insert ANNOUNCEMENT_DATA → settings sheet
                        if (table === 'users' && rec.username === 'ANNOUNCEMENT_DATA') {
                            if (rec.password) {
                                try { await updateAnnouncement(JSON.parse(rec.password)); }
                                catch (e) { await updateAnnouncement({ text: rec.password, buttonText: '', buttonUrl: '' }); }
                            }
                            insertedItems.push({ id: 'announcement', ...rec });
                        } else {
                            insertedItems.push(await addRecord(table, rec));
                        }
                    }
                    return insertedItems;
                };
                return {
                    select: () => ({
                        single: async () => { const items = await doInsert(); return { data: items[0], error: null }; },
                        then: async (res) => { const items = await doInsert(); return res({ data: items, error: null }); }
                    }),
                    then: async (res) => { const items = await doInsert(); return res({ data: items, error: null }); }
                };
            },

            // DELETE
            delete() {
                return {
                    eq: async (col, val) => {
                        try {
                            // Intercept: delete ANNOUNCEMENT_DATA → settings sheet
                            if (table === 'users' && col === 'id' && val === 'announcement') {
                                await deleteAnnouncement();
                                return { error: null };
                            }
                            if (col === 'id') {
                                await deleteRecord(table, val);
                            } else {
                                const allData = await getAllData();
                                const rows = allData[table] || [];
                                const row = rows.find(r => String(r[col]) === String(val));
                                if (row && row.id) await deleteRecord(table, row.id);
                            }
                            return { error: null };
                        } catch (e) {
                            return { error: e };
                        }
                    },
                    in: async (col, arr) => {
                        try {
                            const allData = await getAllData();
                            const rows = allData[table] || [];
                            const toDelete = rows.filter(r => arr.map(String).includes(String(r[col])));
                            for (const row of toDelete) {
                                if (row.id) await deleteRecord(table, row.id);
                            }
                            return { error: null };
                        } catch (e) {
                            return { error: e };
                        }
                    }
                };
            }
        };

        return self;
    }
};

export const createClient = () => supabase;

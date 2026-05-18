/**
 * Modern LMS v3 - Database Layer (Google Sheets via API)
 */

const isLocal = window.location.hostname === 'localhost' || 
                window.location.hostname === '127.0.0.1' || 
                window.location.hostname === '' ||
                window.location.protocol === 'file:';

const API_URL = isLocal ? 'https://doma1.gt.tc' : '';

const DB = {
    async getData() {
        try {
            const res = await fetch(API_URL + '/api/data');
            const result = await res.json();
            if (result.success) {
                return result.data;
            }
            return null;
        } catch (e) {
            console.error('getData Error:', e);
            return null;
        }
    },

    async getCoupon(code) {
        try {
            const res = await fetch(API_URL + '/api/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get_coupon', payload: { code } })
            });
            const result = await res.json();
            return result.success ? result.data : null;
        } catch (e) {
            console.error('getCoupon Error:', e);
            return null;
        }
    },

    async addLesson(lesson) {
        const { id, ...lessonData } = lesson;
        try {
            const res = await fetch(API_URL + '/api/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'add', table: 'lessons', payload: lessonData })
            });
            const result = await res.json();
            if (result.success) {
                return { success: true, data: result.data };
            }
            return { success: false, error: result.error };
        } catch (error) {
            console.error('addLesson Error:', error);
            return { success: false, error };
        }
    },

    async addUser(user) {
        const { id, ...userData } = user;
        try {
            const res = await fetch(API_URL + '/api/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'add', table: 'users', payload: userData })
            });
            const result = await res.json();
            if (result.success) {
                return { success: true, data: result.data };
            }
            return { success: false, error: result.error };
        } catch (error) {
            console.error('addUser Error:', error);
            return { success: false, error };
        }
    },

    async addCoupon(coupon) {
        const { id, ...couponData } = coupon;
        try {
            const res = await fetch(API_URL + '/api/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'add', table: 'coupons', payload: couponData })
            });
            const result = await res.json();
            if (result.success) {
                return { success: true, data: result.data };
            }
            return { success: false, error: result.error };
        } catch (error) {
            console.error('addCoupon Error:', error);
            return { success: false, error };
        }
    },

    async updateLesson(id, updates) {
        try {
            const res = await fetch(API_URL + '/api/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'update', table: 'lessons', payload: { id, updates } })
            });
            const result = await res.json();
            return { success: result.success };
        } catch (error) {
            console.error('updateLesson Error:', error);
            return { success: false, error };
        }
    },

    async deleteLesson(id) {
        try {
            const res = await fetch(API_URL + '/api/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'delete', table: 'lessons', payload: { id } })
            });
            const result = await res.json();
            return { success: result.success };
        } catch (error) {
            console.error('deleteLesson Error:', error);
            return { success: false, error };
        }
    },

    async deleteUser(id) {
        try {
            const res = await fetch(API_URL + '/api/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'delete', table: 'users', payload: { id } })
            });
            const result = await res.json();
            return { success: result.success };
        } catch (error) {
            console.error('deleteUser Error:', error);
            return { success: false, error };
        }
    },

    async deleteCoupon(id) {
        try {
            const res = await fetch(API_URL + '/api/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'delete', table: 'coupons', payload: { id } })
            });
            const result = await res.json();
            return { success: result.success };
        } catch (error) {
            console.error('deleteCoupon Error:', error);
            return { success: false, error };
        }
    },

    async updateUser(id, updates) {
        try {
            const res = await fetch(API_URL + '/api/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'update', table: 'users', payload: { id, updates } })
            });
            const result = await res.json();
            return { success: result.success };
        } catch (error) {
            console.error('updateUser Error:', error);
            return { success: false, error };
        }
    },

    async restoreData(backupData) {
        try {
            const res = await fetch(API_URL + '/api/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'restore', payload: backupData })
            });
            const result = await res.json();
            return { success: result.success };
        } catch (error) {
            console.error('restoreData Error:', error);
            return { success: false, error };
        }
    },

    // Real-time sync is handled by polling in store.js
    onDataChange(callback) {
        return () => {};
    }
};

window.DB = DB;

/**
 * Modern LMS v3 - Database Layer (v2.9.3)
 */

// --- SUPABASE CREDENTIALS (Base64 Encoded) ---
const SUPABASE_URL = atob('aHR0cHM6Ly9sYWtnZGNzeXRvd25vaXlydmxpcS5zdXBhYmFzZS5jbw==');
const SUPABASE_KEY = atob('c2JfcHVibGlzaGFibGVfT2IxUjF0Ql9TV3ctcDBWeUh6R3RKQV9mbjJCREthdQ==');
// -----------------------------

let supabaseClient = null;

const DB = {
    async connect() {
        if (!window.supabase) {
            console.error('❌ Supabase SDK not loaded');
            return false;
        }

        if (SUPABASE_URL.includes('YOUR_SUPABASE')) {
            console.warn('⚠️ Supabase Credentials Missing in db.js');
            return false;
        }

        try {
            supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
            console.log('✅ Supabase Client Initialized');
            return true;
        } catch (e) {
            console.error('❌ Supabase Connection Failed:', e);
            return false;
        }
    },

    // Get all initial data
    async getData() {
        if (!supabaseClient) await this.connect();
        if (!supabaseClient) return null;

        try {
            const { data: users, error: usersError } = await supabaseClient.from('users').select('*');
            const { data: lessons, error: lessonsError } = await supabaseClient.from('lessons').select('*');
            const { data: coupons, error: couponsError } = await supabaseClient.from('coupons').select('*');

            if (usersError) console.error('Users fetch error:', usersError);
            if (lessonsError) console.error('Lessons fetch error:', lessonsError);
            if (couponsError) console.error('Coupons fetch error:', couponsError);

            console.log('📥 Data loaded from Supabase:', {
                users: users?.length || 0,
                lessons: lessons?.length || 0,
                coupons: coupons?.length || 0
            });

            return {
                users: users || [],
                lessons: lessons || [],
                coupons: coupons || []
            };
        } catch (e) {
            console.error('getData Error:', e);
            return null;
        }
    },

    // Fetch a single coupon directly to bypass any agg caching
    async getCoupon(code) {
        if (!supabaseClient) await this.connect();
        if (!supabaseClient) return null;

        try {
            const { data, error } = await supabaseClient.from('coupons').select('*').eq('code', code).maybeSingle();
            if (error) throw error;
            return data;
        } catch (e) {
            console.error('getCoupon Error:', e);
            return null;
        }
    },

    // Add new lesson (INSERT only)
    async addLesson(lesson) {
        if (!supabaseClient) await this.connect();
        if (!supabaseClient) return { success: false };

        // Remove local ID, let Supabase generate it
        const { id, ...lessonData } = lesson;

        const { data, error } = await supabaseClient
            .from('lessons')
            .insert([lessonData])
            .select();

        if (error) {
            console.error('❌ Add Lesson Error:', error);
            return { success: false, error };
        }

        console.log('✅ Lesson added to Supabase:', data);
        return { success: true, data: data[0] };
    },

    // Add new user (INSERT only)
    async addUser(user) {
        if (!supabaseClient) await this.connect();
        if (!supabaseClient) return { success: false };

        const { id, ...userData } = user;

        const { data, error } = await supabaseClient
            .from('users')
            .insert([userData])
            .select();

        if (error) {
            console.error('❌ Add User Error:', error);
            return { success: false, error };
        }

        console.log('✅ User added to Supabase:', data);
        return { success: true, data: data[0] };
    },

    // Add new coupon (INSERT only)
    async addCoupon(coupon) {
        if (!supabaseClient) await this.connect();
        if (!supabaseClient) return { success: false };

        const { id, ...couponData } = coupon;

        const { data, error } = await supabaseClient
            .from('coupons')
            .insert([couponData])
            .select();

        if (error) {
            console.error('❌ Add Coupon Error:', error);
            return { success: false, error };
        }

        console.log('✅ Coupon added to Supabase:', data);
        return { success: true, data: data[0] };
    },

    // Update existing lesson
    async updateLesson(id, updates) {
        if (!supabaseClient) await this.connect();
        if (!supabaseClient) return { success: false };

        const { error } = await supabaseClient
            .from('lessons')
            .update(updates)
            .eq('id', id);

        if (error) {
            console.error('❌ Update Lesson Error:', error);
            return { success: false, error };
        }

        console.log('✅ Lesson updated in Supabase');
        return { success: true };
    },

    // Delete lesson
    async deleteLesson(id) {
        if (!supabaseClient) await this.connect();
        if (!supabaseClient) return { success: false };

        const { error } = await supabaseClient
            .from('lessons')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('❌ Delete Lesson Error:', error);
            return { success: false, error };
        }

        console.log('✅ Lesson deleted from Supabase');
        return { success: true };
    },

    // Delete user
    async deleteUser(id) {
        if (!supabaseClient) await this.connect();
        if (!supabaseClient) return { success: false };

        const { error } = await supabaseClient
            .from('users')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('❌ Delete User Error:', error);
            return { success: false, error };
        }

        console.log('✅ User deleted from Supabase');
        return { success: true };
    },

    // Delete coupon
    async deleteCoupon(id) {
        if (!supabaseClient) await this.connect();
        if (!supabaseClient) return { success: false };

        const { error } = await supabaseClient
            .from('coupons')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('❌ Delete Coupon Error:', error);
            return { success: false, error };
        }

        console.log('✅ Coupon deleted from Supabase');
        return { success: true };
    },

    // Update user
    async updateUser(id, updates) {
        if (!supabaseClient) await this.connect();
        if (!supabaseClient) return { success: false };

        const { error } = await supabaseClient
            .from('users')
            .update(updates)
            .eq('id', id);

        if (error) {
            console.error('❌ Update User Error:', error);
            return { success: false, error };
        }

        console.log('✅ User updated in Supabase');
        return { success: true };
    },

    // Real-time synchronization
    onDataChange(callback) {
        if (!supabaseClient) {
            this.connect().then(() => this.onDataChange(callback));
            return;
        }

        const tables = ['users', 'lessons', 'coupons'];
        const channels = tables.map(table => {
            const channel = supabaseClient
                .channel(`realtime-${table}`)
                .on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
                    console.log(`🔔 Real-time ${table} change:`, payload.eventType);
                    callback(table, payload);
                })
                .subscribe((status) => {
                    if (status === 'SUBSCRIBED') {
                        console.log(`📡 Subscribed to ${table} changes`);
                    }
                });
            return channel;
        });

        return () => {
            channels.forEach(ch => supabaseClient.removeChannel(ch));
        };
    }
};

window.DB = DB;

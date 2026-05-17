/**
 * Modern LMS v3 - Modular State Management (v2.9.6)
 */

// Broadcast Channel for strict single-session enforcement across tabs/windows
const sessionBroadcast = (() => {
    try {
        return new BroadcastChannel('doma_ai_session');
    } catch (e) {
        console.warn('Broadcast Channel not supported');
        return null;
    }
})();

const Store = {
    state: {
        currentUser: null,
        users: [],
        lessons: [
            { id: 1, title: 'مقدمة في البرمجة', url: 'https://vjs.zencdn.net/v/oceans.mp4', description: 'درس تعريفي عن أساسيات البرمجة للمبتدئين.' },
            { id: 2, title: 'تصميم المواقع', url: 'https://www.youtube.com/watch?v=Get7rqXYrbQ', description: 'كيف تبدأ في مجال تصميم ومواقع الويب.' }
        ],
        coupons: [
            { id: 1, code: 'TRIAL2H', duration: 2, type: 'hours' },
            { id: 2, code: 'ELITE30', duration: 30, type: 'days' }
        ],
        view: 'landing',
        selectedLessonId: null,
        scrollPositions: {},
        visibleUsers: 20,
        studentSearch: '',
        studentFilter: 'all', // all, pending, active, banned
        announcement: { text: '', buttonText: '', buttonUrl: '' }
    },

    async broadcastBot(message) {
        try {
            await fetch('/api/webhook', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'broadcast',
                    secret: '8598472216:AAE7gQmUpaWPeEgq7ZFlnTGuzedGUAQfFoU',
                    message: message
                })
            });
        } catch (e) { console.error('Bot Broadcast Error:', e); }
    },

    async init() {
        try {
            // Load data from Server
            const data = await DB.getData();

            if (data) {
                this.state.users = (data.users || []).filter(u => u.username !== 'ANNOUNCEMENT_DATA').sort((a, b) => (b.id || 0) - (a.id || 0));
                this.state.lessons = (data.lessons || []).sort((a, b) => (b.id || 0) - (a.id || 0));
                this.state.coupons = (data.coupons || []).sort((a, b) => (b.id || 0) - (a.id || 0));
                if (data.announcement) this.state.announcement = data.announcement;
            }
        } catch (e) {
            console.log('Server offline, using empty state');
        }

        // Session user stays in localStorage for convenience
        this.state.currentUser = JSON.parse(localStorage.getItem('v3_user')) || null;

        // Restore last view and scroll state
        const savedView = localStorage.getItem('v3_view');
        this.state.scrollPositions = JSON.parse(localStorage.getItem('v3_scroll')) || {};

        if (this.state.currentUser && savedView) {
            this.state.view = savedView;
        } else if (!this.state.currentUser) {
            this.state.view = 'landing';
        }

        console.log('Doma Ai Database Connected & Synchronized (Server Mode).');

        // Start Real-time Monitoring
        DB.onDataChange((table, payload) => {
            console.log(`🔄 Real-time ${table} change detected`);
            this.refreshData().then(({ changed, type }) => {
                if (changed && window.App) {
                    window.App.smartRender();

                    // Specific Notifications for Students
                    if (this.state.currentUser && this.state.currentUser.role !== 'admin') {
                        if (type === 'lessons' && payload.eventType === 'INSERT') {
                            window.App.showToast('📚 تم إضافة درس جديد!', 'auto_stories');
                        }
                        if (type === 'announcement') {
                            window.App.showToast('📢 تحديث في إعلان الموقع', 'campaign');
                        }
                    }
                }
            });
        });

        // Background Polling Fallback (Fast 1s poll for instant conversations/announcements)
        setInterval(() => {
            this.refreshData().then(({ changed, type }) => {
                if (changed && window.App) {
                    if (type === 'announcement') {
                        console.log('⚡ High-Speed Sync: Announcement Updated');
                        window.App.refreshAnnouncementOnly();
                    } else {
                        window.App.smartRender();
                    }
                }
            });
        }, 1000);

        // Start heartbeat if user already logged in
        if (this.state.currentUser && this.state.currentUser.role !== 'admin') {
            this.startHeartbeat();
        }

        // Set up strict single-session listener
        if (sessionBroadcast) {
            sessionBroadcast.onmessage = (event) => {
                const { type, userId } = event.data;
                if (type === 'LOGOUT_OTHER_SESSIONS') {
                    if (this.state.currentUser && this.state.currentUser.id === userId) {
                        if (window._sessionAlertActive) return;
                        window._sessionAlertActive = true;

                        console.warn('⚠️ Session terminated: Same user logged in from another tab/window');
                        const dialog = document.getElementById('session-alert-dialog');
                        if (dialog) {
                            dialog.classList.add('md-dialog-overlay--active');
                        } else {
                            alert('تنبيه: تم تسجيل الدخول إلى حسابك من متصفح أو جهاز آخر. سيتم تسجيل الخروج الآن للحفاظ على أمان حسابك.');
                        }

                        this.logout();
                        if (window.App) window.App.smartRender();
                    }
                }
            };
        }

        // Auto-cleanup: delete pending accounts older than 3 days
        this.autoCleanPendingUsers();
        setInterval(() => this.autoCleanPendingUsers(), 60 * 60 * 1000); // Every hour
    },

    async autoCleanPendingUsers() {
        try {
            const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
            const now = new Date();

            const expiredPending = this.state.users.filter(u => {
                if (u.status !== 'pending') return false;
                if (u.username === 'ANNOUNCEMENT_DATA') return false;
                if (!u.created_at) return false;
                const created = new Date(u.created_at);
                return (now - created) > THREE_DAYS_MS;
            });

            if (expiredPending.length === 0) return;

            console.log(`🧹 Auto-cleanup: حذف ${expiredPending.length} حساب غير مفعل منذ أكثر من 3 أيام`);

            for (const user of expiredPending) {
                const result = await DB.deleteUser(user.id);
                if (result.success) {
                    this.state.users = this.state.users.filter(u => u.id !== user.id);
                    console.log(`✅ تم حذف الحساب المنتهي: ${user.username}`);
                }
            }

            // Re-render if admin is viewing the dashboard
            if (expiredPending.length > 0 && window.App && this.state.currentUser?.role === 'admin') {
                window.App.smartRender();
            }
        } catch (e) {
            console.warn('Auto-cleanup error:', e);
        }
    },

    // Refresh data (for real-time updates)
    async refreshData() {
        try {
            const data = await DB.getData();
            if (data) {
                // Filter out system rows
                const newUsers = (data.users || []).filter(u => u.username !== 'ANNOUNCEMENT_DATA').sort((a, b) => (b.id || 0) - (a.id || 0));
                const newLessons = (data.lessons || []).sort((a, b) => (b.id || 0) - (a.id || 0));
                const newCoupons = (data.coupons || []).sort((a, b) => (b.id || 0) - (a.id || 0));

                const isAdmin = this.state.currentUser && this.state.currentUser.role === 'admin';
                const simplifyUser = u => ({
                    id: u.id, username: u.username, role: u.role, status: u.status,
                    is_active: u.is_active, expiry_date: u.expiry_date,
                    session_token: isAdmin ? u.session_token : undefined
                });

                const isUsersChanged = JSON.stringify(newUsers.map(simplifyUser)) !== JSON.stringify(this.state.users.map(simplifyUser));
                const isLessonsChanged = JSON.stringify(newLessons) !== JSON.stringify(this.state.lessons);
                const isCouponsChanged = JSON.stringify(newCoupons) !== JSON.stringify(this.state.coupons);

                // Read announcement from dedicated field
                const newAnnouncement = data.announcement || { text: '', buttonText: '', buttonUrl: '' };
                const isAnnounceChanged = JSON.stringify(newAnnouncement) !== JSON.stringify(this.state.announcement);

                // Admin-specific: online users count
                let onlineCountChanged = false;
                if (isAdmin) {
                    const getOnlineCount = (users) => users.filter(u => u && u.role !== 'admin' && u.session_token && u.last_active && (new Date() - new Date(u.last_active.replace(' ', 'T')) < 3 * 60 * 1000)).length;
                    if (getOnlineCount(newUsers) !== getOnlineCount(this.state.users)) onlineCountChanged = true;
                }

                if (isUsersChanged || isLessonsChanged || isCouponsChanged || onlineCountChanged || isAnnounceChanged) {
                    this.state.users = newUsers;
                    this.state.announcement = newAnnouncement;
                    this.state.lessons = newLessons;
                    this.state.coupons = newCoupons;
                    console.log('🔄 Data refreshed (Significant changes detected)');

                    let type = 'general';
                    if (isLessonsChanged) type = 'lessons';
                    else if (isAnnounceChanged) type = 'announcement';
                    else if (isUsersChanged) type = 'users';

                    // Session enforcement
                    if (this.state.currentUser && this.state.currentUser.role !== 'admin') {
                        const localToken = localStorage.getItem('v3_session_token');
                        const serverUser = newUsers.find(u => u.id == this.state.currentUser.id);
                        if (serverUser && localToken && serverUser.session_token && serverUser.session_token !== localToken) {
                            if (!window._sessionAlertActive) {
                                window._sessionAlertActive = true;
                                this.logout().then(() => { if (window.App) window.App.navigate('login'); });
                                return { changed: true, type: 'session' };
                            }
                        }
                    }
                    return { changed: true, type };
                } else {
                    this.state.users = newUsers;
                    this.state.lessons = newLessons;
                    this.state.coupons = newCoupons;
                    return { changed: false };
                }
            }
        } catch (e) {
            console.error('Failed to refresh data:', e);
        }
        return { changed: false };
    },


    // Note: save() method removed - we now use direct DB calls (addLesson, updateLesson, etc.)


    // User Actions
    async register(username, password) {
        const uname = username.trim().toLowerCase();
        if (this.state.users.find(u => u.username && u.username.toLowerCase() === uname)) {
            return { success: false, message: 'اسم المستخدم موجود بالفعل' };
        }

        const newUser = {
            id: Date.now(),
            username: uname,
            password,
            role: 'student',
            is_active: false,
            status: 'pending',
            expiry_date: null
        };

        // Save to Supabase
        const result = await DB.addUser(newUser);
        if (result.success) {
            // Add to local state with Supabase ID (at the top)
            this.state.users.unshift(result.data);
            return { success: true, data: result.data };
        } else {
            return { success: false, message: 'فشل التسجيل. حاول مرة أخرى.' };
        }
    },

    async updateAnnouncement(announceObj) {
        try {
            const res = await fetch('/api/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'update_announcement', payload: announceObj })
            });
            const result = await res.json();
            if (result.success) {
                this.state.announcement = announceObj;
                console.log('✅ تم حفظ الإعلان في Google Sheets');
                if (announceObj.text) {
                    await this.broadcastBot(`🔔 <b>إعلان جديد في الموقع:</b>\n\n${announceObj.text}`);
                }
            }
            return result;
        } catch (e) {
            console.error('updateAnnouncement Error:', e);
            return { success: false };
        }
    },

    async deleteAnnouncement() {
        try {
            const res = await fetch('/api/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'delete_announcement', payload: {} })
            });
            const result = await res.json();
            if (result.success) {
                this.state.announcement = { text: '', buttonText: '', buttonUrl: '' };
                console.log('✅ تم حذف الإعلان من Google Sheets');
            }
            return result;
        } catch (e) {
            console.error('deleteAnnouncement Error:', e);
            return { success: false };
        }
    },

    async approveUser(username, duration) {
        const user = this.state.users.find(u => u.username === username);
        if (!user) return { success: false };

        let ms = 0;
        switch (duration) {
            case '1d': ms = 24 * 3600000; break;
            case '1m': ms = 30 * 24 * 3600000; break;
            case '6m': ms = 180 * 24 * 3600000; break;
            case '1y': ms = 365 * 24 * 3600000; break;
        }

        const expiryDate = new Date(Date.now() + ms).toISOString();
        const updates = {
            is_active: true,
            status: 'active',
            expiry_date: expiryDate
        };

        const result = await DB.updateUser(user.id, updates);
        if (result.success) {
            user.is_active = true;
            user.status = 'active';
            user.expiry_date = expiryDate;
        }
        return result;
    },

    // Helper to get local device IP (Internal IP) via WebRTC
    async getLocalIP() {
        return new Promise((resolve) => {
            const pc = new RTCPeerConnection({ iceServers: [] });
            pc.createDataChannel('');
            pc.createOffer().then(offer => pc.setLocalDescription(offer));

            let found = false;
            pc.onicecandidate = (ice) => {
                if (found || !ice || !ice.candidate || !ice.candidate.candidate) {
                    if (!found && (!ice || !ice.candidate)) {
                        resolve(null);
                    }
                    return;
                }

                const parts = ice.candidate.candidate.split(' ');
                const ip = parts[4];
                if (ip) {
                    found = true;
                    pc.close();
                    resolve(ip);
                }
            };

            // Timeout after 2 seconds
            setTimeout(() => {
                if (!found) {
                    pc.close();
                    resolve(null);
                }
            }, 2000);
        });
    },

    // Helper to get client IP address (Combined Public + Internal)
    async getIP() {
        // Try to get local device IP first
        const localIP = await this.getLocalIP();

        const fetchWithTimeout = async (url, duration = 5000) => {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), duration);
            try {
                const response = await fetch(url, { signal: controller.signal });
                clearTimeout(id);
                return response;
            } catch (e) {
                clearTimeout(id);
                throw e;
            }
        };

        let publicIP = 'Unknown';
        try {
            const res = await fetchWithTimeout('https://api.ipify.org?format=json');
            const data = await res.json();
            publicIP = data.ip || 'Unknown';
        } catch (e) {
            console.warn('Primary IP service failed, trying fallback...');
            try {
                const res = await fetchWithTimeout('https://ipapi.co/json/');
                const data = await res.json();
                publicIP = data.ip || 'Unknown';
            } catch (e2) {
                console.warn('Secondary IP service failed, trying third fallback...');
                try {
                    const res = await fetchWithTimeout('https://api64.ipify.org?format=json');
                    const data = await res.json();
                    publicIP = data.ip || 'Unknown';
                } catch (e3) {
                    console.error('All IP services failed:', e3);
                    publicIP = 'Unknown';
                }
            }
        }

        // Return internal IP alongside public if available
        if (localIP && !publicIP.includes(localIP)) {
            return `${publicIP} [${localIP}]`;
        }

        return publicIP;
    },

    async login(username, password) {
        const uname = username.trim().toLowerCase();
        console.log('Attempting login:', uname, password);
        if (uname === 'admin' && password.trim() === 'admin123') {
            console.log('Admin login detected');
            const admin = { username: 'admin', role: 'admin' };
            this.state.currentUser = admin;
            localStorage.setItem('v3_user', JSON.stringify(admin));
            return { success: true, role: 'admin' };
        }
        const user = this.state.users.find(u => u.username && u.username.toLowerCase() === uname && u.password === password);
        if (user) {
            if (user.status === 'banned') return { success: false, message: 'تم حظر حسابك. يرجى التواصل مع الإدارة.' };

            // Generate Session Token
            const token = Date.now() + '_' + Math.random().toString(36).substr(2);

            // Fetch IP Address
            const ip = await this.getIP();

            // Update DB with token and IP (Try full update first)
            let updates = {
                session_token: token,
                last_active: new Date().toISOString(),
                ip_address: ip
            };

            let updateRes = await DB.updateUser(user.id, updates);

            if (!updateRes.success) {
                console.warn('⚠️ Full login sync failed, trying essential fields only...');
                // Fallback: Try without ip_address in case column is missing
                const { ip_address, ...essentialUpdates } = updates;
                updateRes = await DB.updateUser(user.id, essentialUpdates);

                if (!updateRes.success) {
                    console.error('❌ Login Sync Failed:', updateRes.error);
                    const errorMsg = updateRes.error?.message || 'Unknown Error';
                    alert(`⚠️ فشل التزامن: ${errorMsg}\nتأكد من وجود عامودي last_active و session_token في Supabase.`);
                } else {
                    console.log('✅ Essential login sync succeeded (ip_address column likely missing)');
                }
            }

            // Sync local state (Update local even if DB fails for visual feedback)
            const nowIso = updates.last_active;

            // Critical: Update the user object with new session data
            user.session_token = token;
            user.ip_address = ip;
            user.last_active = nowIso;

            this.state.currentUser = user;
            localStorage.setItem('v3_user', JSON.stringify(user));
            localStorage.setItem('v3_session_token', token); // Local unique token

            // Also update the matching user in the list for immediate UI feedback
            const userInList = this.state.users.find(x => x.id === user.id);
            if (userInList) {
                userInList.last_active = nowIso;
                userInList.session_token = token;
                if (updates.ip_address) userInList.ip_address = updates.ip_address;
            }

            // Broadcast to all other tabs/windows to logout
            if (sessionBroadcast) {
                sessionBroadcast.postMessage({
                    type: 'LOGOUT_OTHER_SESSIONS',
                    userId: user.id
                });
            }

            // Start heartbeat to keep last_active updated and maintain online status
            this.startHeartbeat();

            return { success: true, role: user.role };
        }
        return { success: false, message: 'بيانات خاطئة' };
    },

    async logout() {
        if (this.state.currentUser && this.state.currentUser.role !== 'admin') {
            try {
                // Clear token but keep ACTUAL last_active time (current time) instead of erasing it with year 2000
                await DB.updateUser(this.state.currentUser.id, {
                    session_token: null,
                    last_active: new Date().toISOString()
                });
            } catch (e) {
                console.error('Logout sync error', e);
            }
        }
        this.state.currentUser = null;
        localStorage.removeItem('v3_user');
        localStorage.removeItem('v3_session_token');
        localStorage.removeItem('v3_view');
        // stop heartbeat
        this.stopHeartbeat();
        return true;
    },

    async addUser(username, password, duration) {
        if (this.state.users.find(u => u.username === username)) return { success: false, msg: 'المستخدم موجود' };

        let ms = 0;
        switch (duration) {
            case '1d': ms = 24 * 3600000; break;
            case '1m': ms = 30 * 24 * 3600000; break;
            case '6m': ms = 180 * 24 * 3600000; break;
            case '1y': ms = 365 * 24 * 3600000; break;
        }

        const expiryDate = new Date(Date.now() + ms).toISOString();
        const newUser = {
            id: Date.now(),
            username,
            password,
            role: 'student',
            is_active: true,
            status: 'active',
            expiry_date: expiryDate
        };

        const result = await DB.addUser(newUser);
        if (result.success) {
            this.state.users.unshift(result.data);
        }
        return result;
    },

    async addLesson(title, url, desc) {
        const newLesson = { id: Date.now(), title, url, description: desc };
        const result = await DB.addLesson(newLesson);
        if (result.success) {
            // Replace local ID with Supabase ID (at the top)
            this.state.lessons.unshift(result.data);
            const platformUrl = window.location.origin;
            await this.broadcastBot(`📚 <b>درس جديد بانتظارك في المنصة!</b>\n\n📖 العنوان: <b>${title}</b>\n\n🌐 <a href="${platformUrl}">اضغط هنا لمشاهدة الدرس الآن</a>`);
        }
        return result;
    },

    async addCoupon(code, duration, type) {
        const newCoupon = { id: Date.now(), code, duration, type };
        const result = await DB.addCoupon(newCoupon);
        if (result.success) {
            this.state.coupons.unshift(result.data);
        }
        return result;
    },

    async deleteCoupon(id) {
        const result = await DB.deleteCoupon(id);
        if (result.success) {
            this.state.coupons = this.state.coupons.filter(c => c.id !== id);
        }
        return result;
    },

    async updateLesson(id, title, url, description) {
        const lesson = this.state.lessons.find(l => l.id === id);
        if (!lesson) return { success: false };

        const result = await DB.updateLesson(id, { title, url, description });
        if (result.success) {
            lesson.title = title;
            lesson.url = url;
            lesson.description = description;
        }
        return result;
    },

    async toggleBan(username) {
        const user = this.state.users.find(u => u.username === username);
        if (!user || user.role === 'admin') return { success: false, msg: 'لا يمكن حظر هذا المستخدم' };

        const newStatus = user.status === 'banned' ? (user.is_active ? 'active' : 'pending') : 'banned';
        const result = await DB.updateUser(user.id, { status: newStatus });
        if (result.success) {
            user.status = newStatus;
        }
        return result;
    },

    async deleteUser(username) {
        const user = this.state.users.find(u => u.username === username);
        if (!user || user.role === 'admin') return { success: false, msg: 'لا يمكن حذف هذا المستخدم' };

        const result = await DB.deleteUser(user.id);
        if (result.success) {
            this.state.users = this.state.users.filter(u => u.username !== username);
        }
        return result;
    },

    async updateUser(id, updates) {
        const user = this.state.users.find(u => u.id === id);
        if (!user) return { success: false, msg: 'المستخدم غير موجود' };

        const result = await DB.updateUser(id, updates);
        if (result.success) {
            Object.assign(user, updates);
            // If active user updated (e.g. password change), update localStorage
            if (this.state.currentUser && this.state.currentUser.id === id) {
                Object.assign(this.state.currentUser, updates);
                localStorage.setItem('v3_user', JSON.stringify(this.state.currentUser));
            }
        }
        return result;
    },

    // Data Management
    exportData() {
        const data = JSON.stringify(this.state, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `doma_ai_backup_${new Date().toLocaleDateString('en-GB').replace(/\//g, '-')}.json`;
        a.click();
    },

    async importData(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    // Minimal validation
                    if (data.users && data.lessons) {
                        // WARNING: Replacing state on a remote Supabase DB is complex.
                        // For now, we only update the local state for session preview.
                        // A true migration tool would need to clear and re-insert into Supabase.
                        this.state = { ...this.state, ...data };
                        resolve({ success: true, msg: 'تم استيراد البيانات محلياً. للمزامنة الدائمة، يرجى التواصل مع الدعم.' });
                    } else {
                        reject({ success: false, msg: 'ملف غير متوافق' });
                    }
                } catch (err) {
                    reject({ success: false, msg: 'خطأ في قراءة الملف' });
                }
            };
            reader.readAsText(file);
        });
    }
};

window.Store = Store;

// Heartbeat utilities (keeps last_active updated and online count accurate)
Store._heartbeatTimer = null;
Store.startHeartbeat = function (intervalMs = 20000) {
    this.stopHeartbeat();
    if (!this.state.currentUser || this.state.currentUser.role === 'admin') return;

    const run = async () => {
        try {
            const userId = this.state.currentUser?.id;
            const localToken = localStorage.getItem('v3_session_token');
            if (!userId || !localToken) {
                this.stopHeartbeat();
                return;
            }

            let updates = { last_active: new Date().toISOString() };

            // Refresh IP on first run or every 5 minutes
            if (!this._lastIpFetch || (Date.now() - this._lastIpFetch > 5 * 60 * 1000)) {
                const ip = await this.getIP();
                if (ip && ip !== 'Unknown') {
                    updates.ip_address = ip;
                    this._lastIpFetch = Date.now();
                }
            }

            let res = await DB.updateUser(userId, updates);

            // Fallback if update fails (e.g. missing ip_address column)
            if (!res.success) {
                console.warn('⚠️ Heartbeat full update failed:', res.error);
                console.log('🔄 Trying essential fields only (last_active)...');
                res = await DB.updateUser(userId, { last_active: updates.last_active });

                if (!res.success) {
                    console.error('❌ Heartbeat failed completely:', res.error);
                    if (res.error?.message) console.error('DB Error Message:', res.error.message);
                } else {
                    console.log('✅ Heartbeat recovered using essential fields');
                    // Mark IP alert since it failed in the first attempt
                    if (!window._ipAlertShown) {
                        console.error('❌ Database Missing ip_address column or RLS error');
                        alert('⚠️ تنبيه: تعذر تحديث بيانات الجهاز (IP). قد يكون العامود غير موجود أو الصلاحيات غير مكتملة.');
                        window._ipAlertShown = true;
                    }
                }
            }

            // Sync local state (Update local even if DB fails for visual feedback)
            const nowIso = updates.last_active;
            const u = this.state.users.find(x => x.id === userId);
            if (u) {
                u.last_active = nowIso;
                if (updates.ip_address) u.ip_address = updates.ip_address;
            }
            if (this.state.currentUser) {
                this.state.currentUser.last_active = nowIso;
                if (updates.ip_address) {
                    this.state.currentUser.ip_address = updates.ip_address;
                }
                localStorage.setItem('v3_user', JSON.stringify(this.state.currentUser));
            }
        } catch (e) {
            console.error('Heartbeat error:', e);
        }
    };

    run(); // Run immediately
    this._heartbeatTimer = setInterval(run, intervalMs);
};

Store.stopHeartbeat = function () {
    if (this._heartbeatTimer) {
        clearInterval(this._heartbeatTimer);
        this._heartbeatTimer = null;
    }
};

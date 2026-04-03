/**
 * Modern LMS v3 - Modular State Management (v2.9.4)
 */

const App = {
    currentView: 'landing',
    currentLesson: null,
    currentDelete: null,
    timerInterval: null,
    lastActivity: Date.now(),
    sessionCheckCounter: 0, // Counter for session checks

    telegram: {
        token: '8598472216:AAE7gQmUpaWPeEgq7ZFlnTGuzedGUAQfFoU',
        adminChatId: localStorage.getItem('v3_admin_chat_id') || '682572594',
        async sendMessage(text, keyboard, inline_keyboard) {
            if (!this.token || !this.adminChatId) return;
            try {
                const body = { chat_id: this.adminChatId, text: text, parse_mode: 'HTML' };
                if (inline_keyboard) body.reply_markup = { inline_keyboard: inline_keyboard };
                else if (keyboard) body.reply_markup = { keyboard: keyboard, resize_keyboard: true };
                await fetch(`https://api.telegram.org/bot${this.token}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
            } catch (e) { console.error('Telegram Error:', e); }
        }
    },

    async init() {
        console.log('🚀 Doma AI v2.9.4 Initializing...');
        await Store.init();

        // Inject Modals Container
        const modalsContainer = document.getElementById('v3-modals-container');
        if (modalsContainer) modalsContainer.innerHTML = UI.modals(Store.state);

        // Register Back Button Handler
        window.addEventListener('popstate', (e) => this.handlePopState(e));

        // Initial Navigation
        const hash = window.location.hash.replace('#', '');
        const savedView = localStorage.getItem('v3_view') || 'landing';

        if (hash) {
            const [view, id] = hash.split('-');
            this.navigate(view, id || null, true, true); // replace initial state
        } else {
            this.navigate(savedView, null, true, true); // replace initial state
        }

        this.render(true); // Ensure scroll restoration on refresh

        this.setupListeners();
        this.setupNumberConversion();
        this.setupInactivityTracking();
        this.startTimer();
    },

    setupInactivityTracking() {
        this.lastActivity = Date.now();
        const reset = () => this.lastActivity = Date.now();
        window.addEventListener('mousemove', reset);
        window.addEventListener('keypress', reset);
        window.addEventListener('click', reset);
        window.addEventListener('touchstart', reset);
        window.addEventListener('scroll', reset);
    },



    setupNumberConversion() {
        document.addEventListener('input', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                const originalValue = e.target.value;
                const convertedValue = this.utils.convertDigits(originalValue);
                if (originalValue !== convertedValue) {
                    const start = e.target.selectionStart;
                    const end = e.target.selectionEnd;
                    e.target.value = convertedValue;
                    e.target.setSelectionRange(start, end);
                }
            }
        });
    },

    showToast(message, icon = 'notifications') {
        let container = document.getElementById('v3-toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'v3-toast-container';
            container.className = 'v3-toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `v3-toast ${icon === 'error' ? 'v3-toast-error' : ''}`;
        
        const displayIcon = icon === 'error' ? 'cancel' : icon;
        toast.innerHTML = `<span class="material-icons v3-toast-icon">${displayIcon}</span> ${message}`;
        
        container.appendChild(toast);

        // Auto remove
        setTimeout(() => {
            toast.classList.add('v3-toast--exit');
            setTimeout(() => toast.remove(), 500);
        }, 4000);
    },

    utils: {
        convertDigits(str) {
            if (typeof str !== 'string') return str;
            const arabicNumbers = [/٠/g, /١/g, /٢/g, /٣/g, /٤/g, /٥/g, /٦/g, /٧/g, /٨/g, /٩/g];
            for (let i = 0; i < 10; i++) {
                str = str.replace(arabicNumbers[i], i);
            }
            return str;
        },

        getYTMeta(url) {
            let videoId = '';
            if (!url) return { id: '' };

            try {
                const urlObj = new URL(url);
                if (urlObj.hostname.includes('youtube.com')) {
                    if (urlObj.pathname.includes('/shorts/')) {
                        videoId = urlObj.pathname.split('/shorts/')[1].split('/')[0].split('?')[0];
                    } else if (urlObj.pathname.includes('/embed/')) {
                        videoId = urlObj.pathname.split('/embed/')[1].split('/')[0].split('?')[0];
                    } else if (urlObj.pathname.includes('/v/')) {
                        videoId = urlObj.pathname.split('/v/')[1].split('/')[0].split('?')[0];
                    } else {
                        videoId = urlObj.searchParams.get('v');
                    }
                } else if (urlObj.hostname.includes('youtu.be')) {
                    videoId = urlObj.pathname.slice(1).split('/')[0].split('?')[0];
                }
            } catch (e) {
                // Fallback regex if URL constructor fails
                const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/;
                const match = url.match(regExp);
                videoId = (match && match[2].length === 11) ? match[2] : '';
            }

            return { id: videoId };
        },

        getGumletId(url) {
            if (!url) return null;
            if (url.includes('gumlet.tv/watch/') || url.includes('gumlet.com/watch/')) {
                const parts = url.split('/watch/');
                return parts[1] ? parts[1].split('/')[0].split('?')[0].split('#')[0] : null;
            }
            if (url.includes('play.gumlet.io/embed/') || url.includes('play.gumlet.tv/embed/')) {
                const parts = url.split('/embed/');
                return parts[1] ? parts[1].split('/')[0].split('?')[0].split('#')[0] : null;
            }
            return null;
        },

        formatTextWithLinks(text) {
            if (!text) return '';
            const urlRegex = /(https?:\/\/[^\s]+)/g;
            return text.replace(urlRegex, (url) => {
                return `<span class="description-link-container">"<a href="${url}" target="_blank" class="description-link">${url}</a>" <span class="material-icons link-copy-btn" onclick="event.stopPropagation(); App.copyToClipboard('${url}', this)">content_copy</span></span>`;
            });
        }
    },

    async copyToClipboard(text, el) {
        try {
            await navigator.clipboard.writeText(text);
            if (el) {
                const originalIcon = el.innerText;
                el.innerText = 'done';
                el.style.color = '#00e676';
                setTimeout(() => {
                    el.innerText = originalIcon;
                    el.style.color = '';
                }, 2000);
            }
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    },

    async fetchVideoTitle(url) {
        if (!url) return null;
        try {
            // Basic validation
            if (!url.includes('youtu') && !url.includes('vimeo') && !url.includes('gumlet')) return null;

            const response = await fetch(`https://noembed.com/embed?url=${url}`);
            const data = await response.json();
            return data.title || null;
        } catch (e) {
            console.error('Failed to fetch video title:', e);
            return null;
        }
    },

    async handleUrlInput(url, titleInputId) {
        const titleInput = document.getElementById(titleInputId);
        // Only fill if title is empty
        if (!titleInput || titleInput.value.trim() !== '') return;

        const title = await this.fetchVideoTitle(url);
        if (title && titleInput.value.trim() === '') {
            titleInput.value = title;
        }
    },

    render(restoreScroll = false) {
        const root = document.getElementById('v3-content');
        const view = Store.state.view;
        const user = Store.state.currentUser;

        // Capture internal scroll positions of admin tables before clearing
        const tableScrolls = {};
        ['v3-lessons-container', 'v3-coupons-container', 'v3-students-container'].forEach(id => {
            const el = document.getElementById(id);
            if (el) tableScrolls[id] = el.scrollTop;
        });

        root.innerHTML = ''; // Clear for fresh render

        if (view === 'landing') {
            root.innerHTML = UI.landing();
        } else if (view === 'login') {
            root.innerHTML = UI.login();
            setTimeout(() => this.checkLoginPrefill(), 50);
        } else if (view === 'register') {
            root.innerHTML = UI.register();
        } else if (view === 'lesson') {
            const lesson = Store.state.lessons.find(l => l.id == Store.state.selectedLessonId);
            if (lesson) {
                root.innerHTML = UI.lessonPage(lesson);
                // Initialize video player after content is in DOM
                this.initVideoPlayer(lesson);
            } else {
                this.navigate('dashboard');
                return;
            }
        } else if (view === 'dashboard' || view === 'platform') {
            if (!user) { this.navigate('login'); return; }
            if (user && user.role === 'admin' && view !== 'platform') {
                root.innerHTML = UI.adminDashboard();
            } else {
                root.innerHTML = UI.studentDashboard();
            }
        }

        this.updateNav();

        // Restore internal scroll positions for admin tables
        Object.keys(tableScrolls).forEach(id => {
            const el = document.getElementById(id);
            if (el) el.scrollTop = tableScrolls[id];
        });

        // Only restore main scroll position during navigation or initial load
        if (restoreScroll) {
            const savedPos = Store.state.scrollPositions[view] || 0;
            console.log(`Restoring scroll for ${view} to ${savedPos}`);
            if (root) root.scrollTo(0, savedPos);
        }
    },

    goBack() {
        if (window.history.state) {
            window.history.back();
        } else {
            const user = Store.state.currentUser;
            this.navigate(user ? 'dashboard' : 'landing');
        }
    },

    navigate(view, data = null, isBack = false, replace = false) {
        // Save current scroll position
        const currentView = Store.state.view;
        const root = document.getElementById('v3-content');
        if (root) Store.state.scrollPositions[currentView] = root.scrollTop;

        Store.state.view = view;
        if (view === 'lesson' && data) {
            const numericId = Number(data);
            Store.state.selectedLessonId = isNaN(numericId) ? data : numericId;
            Store.state.scrollPositions['lesson'] = 0;
        }

        localStorage.setItem('v3_view', view);
        localStorage.setItem('v3_scroll', JSON.stringify(Store.state.scrollPositions));

        // History API Integration: Only push state if not a back navigation
        if (!isBack) {
            const state = { view, data };
            const url = `#${view}${data ? '-' + data : ''}`;
            if (replace) {
                history.replaceState(state, '', url);
            } else {
                history.pushState(state, '', url);
            }
        }

        this.render(true);
    },

    handlePopState(event) {
        const state = event.state;
        if (state && state.view) {
            console.log('🔙 Browser Back/Forward triggered:', state.view);
            this.navigate(state.view, state.data, true);
        } else {
            // Default fallback if no state (e.g. landing)
            // Replace state to ensure we have a valid history entry
            this.navigate('landing', null, true, true);
        }
    },

    /**
     * Re-renders the app ONLY if it's safe (e.g. not watching a video or typing)
     */
    smartRender() {
        // ALWAYS try to refresh the announcement regardless of typing/watching
        this.refreshAnnouncementOnly();

        const activeElement = document.activeElement;
        const isTyping = activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA');
        const isWatching = Store.state.view === 'lesson';
        const hasOverlay = document.querySelector('.md-dialog-overlay--active');
        const hasSelection = window.getSelection().toString().length > 0;

        const isDrawerOpen = document.getElementById('v3-mobile-drawer')?.classList.contains('active');

        if (!isTyping && !isWatching && !hasOverlay && !hasSelection && !isDrawerOpen) {
            if (Store.state.view === 'dashboard') {
                this.updateDashboardParts();
            } else {
                this.render(true); // Fallback for other views
            }
        }
    },

    refreshAnnouncementOnly() {
        // Update Student/Global Banner
        const bannerContainer = document.getElementById('v3-announcement-container');
        if (bannerContainer) {
            console.log('📢 Refreshing Announcement Banner');
            bannerContainer.innerHTML = UI.renderAnnouncement();
        }

        // Update Admin Dashboard Inputs (if admin is viewing them)
        const textInput = document.getElementById('v3-announcement-input');
        const btnTextInput = document.getElementById('v3-announcement-btn-text');
        const btnUrlInput = document.getElementById('v3-announcement-btn-url');

        if (textInput && document.activeElement !== textInput) {
            textInput.value = (Store.state.announcement && Store.state.announcement.text) || '';
        }
        if (btnTextInput && document.activeElement !== btnTextInput) {
            btnTextInput.value = (Store.state.announcement && Store.state.announcement.buttonText) || '';
        }
        if (btnUrlInput && document.activeElement !== btnUrlInput) {
            btnUrlInput.value = (Store.state.announcement && Store.state.announcement.buttonUrl) || '';
        }
    },

    updateDashboardParts() {
        // Surgically update dashboard parts without clearing the whole screen
        const parts = [
            { id: 'v3-lessons-grid', fn: () => UI.studentLessonsList() },
            { id: 'v3-admin-lessons-list', fn: () => UI.adminLessonsList() },
            { id: 'v3-admin-coupons-list', fn: () => UI.adminCouponsList() },
            { id: 'v3-admin-students-list', fn: () => UI.adminStudentsList() }
        ];

        parts.forEach(part => {
            const el = document.getElementById(part.id);
            if (el) {
                const newHtml = part.fn();
                // Minimal update: check if changed before setting innerHTML
                // (Optional: use a simple diff if needed, but innerHTML compare is enough to avoid flickers if identical)
                if (el.innerHTML !== newHtml) {
                    el.innerHTML = newHtml;
                }
            }
        });
        
        // Update navigation (badges, user role changes, etc.)
        this.updateNav();
    },

    handleLogoClick() {
        window.location.reload();
    },

    checkLoginPrefill() {
        const u = sessionStorage.getItem('temp_username');
        const p = sessionStorage.getItem('temp_password');
        if (u && p) {
            setTimeout(() => {
                const uInput = document.getElementById('login-username');
                const pInput = document.getElementById('login-password');
                if (uInput && pInput) {
                    uInput.value = u;
                    pInput.value = p;
                    // Optional: Clear after filling
                    // sessionStorage.removeItem('temp_username');
                    // sessionStorage.removeItem('temp_password');
                }
            }, 100);
        }
    },

    updateNav() {
        const user = Store.state.currentUser;
        const navActions = document.getElementById('nav-actions');

        const actionsHtml = user ? (
            user.role === 'admin' ? `
                <button class="btn btn-primary" style="height: 40px; background: var(--tertiary);" onclick="App.navigate('platform')">المنصة</button>
                <button class="btn btn-glass" style="height: 40px; color: var(--secondary); border-color: rgba(255,255,255,0.2);" onclick="App.navigate('dashboard')">لوحة التحكم</button>
                <button class="btn btn-glass" style="height: 40px; color: var(--error); border-color: rgba(242, 184, 181, 0.4);" onclick="App.handleLogout()">خروج</button>
            ` : `
                <button class="btn btn-glass" style="height: 40px; color: var(--error); border-color: rgba(242, 184, 181, 0.4);" onclick="App.handleLogout()">خروج</button>
            `
        ) : `
            <button class="btn btn-primary" style="height: 40px;" onclick="App.navigate('register')">انضم إلينا</button>
            <button class="btn btn-glass" style="height: 40px; color: var(--tertiary); border-color: rgba(255, 64, 129, 0.4);" onclick="App.navigate('login')">دخول</button>
        `;

        if (navActions) {
            navActions.innerHTML = `
                ${actionsHtml}
                <div class="mobile-toggle material-icons" onclick="App.toggleMobileMenu(true)">menu</div>
            `;
        }

        // Inject/Update mobile drawer
        let drawer = document.getElementById('v3-mobile-drawer');
        if (!drawer) {
            drawer = document.createElement('div');
            drawer.id = 'v3-mobile-drawer';
            document.body.appendChild(drawer);
        }

        // Only update drawer contents if it's NOT open to prevent UI glitches (flickering/disappearing)
        // or if it's completely empty
        const isDrawerOpen = drawer.classList.contains('active');
        if (!isDrawerOpen || !drawer.innerHTML.trim()) {
            drawer.innerHTML = `
                <div class="mobile-drawer-overlay" onclick="App.toggleMobileMenu(false)"></div>
                <div class="mobile-drawer">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px;">
                        <div class="logo display-font" style="font-size: 20px; font-weight: 700;" onclick="App.handleLogoClick(); App.toggleMobileMenu(false)">DOMA<span style="color: var(--primary);"> AI</span></div>
                        <div class="material-icons" style="cursor: pointer;" onclick="App.toggleMobileMenu(false)">close</div>
                    </div>
                    <div id="mobile-drawer-links" style="display: flex; flex-direction: column; gap: 20px;"></div>
                </div>
            `;
        }

        const drawerLinks = document.getElementById('mobile-drawer-links');
        if (drawerLinks) {
            drawerLinks.innerHTML = user ? (
                user.role === 'admin' ? `
                    <button class="btn btn-primary" style="width: 100%; height: 48px; background: var(--tertiary);" onclick="App.navigate('platform'); App.toggleMobileMenu(false)">المنصة (عرض الطالب)</button>
                    <button class="btn btn-glass" style="width: 100%; height: 48px;" onclick="App.navigate('dashboard'); App.toggleMobileMenu(false)">لوحة التحكم</button>
                    <button class="btn btn-glass" style="width: 100%; height: 48px; color: var(--error);" onclick="App.handleLogout(); App.toggleMobileMenu(false)">تسجيل خروج</button>
                ` : `
                    <button class="btn btn-glass" style="width: 100%; height: 48px; color: var(--error);" onclick="App.handleLogout(); App.toggleMobileMenu(false)">تسجيل خروج</button>
                `
            ) : `
                <button class="btn btn-primary" style="width: 100%; height: 48px;" onclick="App.navigate('register'); App.toggleMobileMenu(false)">انضم إلينا الآن</button>
                <button class="btn btn-glass" style="width: 100%; height: 48px; color: var(--tertiary);" onclick="App.navigate('login'); App.toggleMobileMenu(false)">دخول المنصة</button>
            `;
        }
    },

    toggleMobileMenu(open) {
        console.log('Toggling mobile menu:', open);
        const wrapper = document.getElementById('v3-mobile-drawer');
        const drawer = document.querySelector('.mobile-drawer');
        if (!wrapper || !drawer) {
            console.error('Mobile drawer elements not found');
            return;
        }
        if (open) {
            wrapper.classList.add('active');
            setTimeout(() => {
                drawer.classList.add('mobile-drawer--active');
                console.log('Drawer active class added');
            }, 10);
        } else {
            drawer.classList.remove('mobile-drawer--active');
            setTimeout(() => {
                wrapper.classList.remove('active');
                console.log('Drawer wrapper hidden');
            }, 300);
        }
    },

    setupListeners() {
        let ticking = false;
        const root = document.getElementById('v3-content');
        if (root) {
            root.addEventListener('scroll', () => {
                if (!ticking) {
                    window.requestAnimationFrame(() => {
                        const nav = document.getElementById('v3-nav');
                        if (root.scrollTop > 20) nav.classList.add('scrolled');
                        else nav.classList.remove('scrolled');

                        // PERSIST SCROLL
                        const view = Store.state.view;
                        Store.state.scrollPositions[view] = root.scrollTop;
                        localStorage.setItem('v3_scroll', JSON.stringify(Store.state.scrollPositions));

                        ticking = false;
                    });
                    ticking = true;
                }
            });
        }
    },

    // Handlers
    async handleLogin() {
        const u = document.getElementById('login-username').value.trim().toLowerCase();
        const p = document.getElementById('login-password').value.trim();
        const res = await Store.login(u, p);
        if (res.success) {
            // Clear temp credentials after successful login
            sessionStorage.removeItem('temp_username');
            sessionStorage.removeItem('temp_password');
            this.navigate('dashboard', null, false, true);
            // Notify Bot on successful login
            const role = Store.state.currentUser.role === 'admin' ? '🛡️ أدمن' : '🎓 طالب';
            this.telegram.sendMessage(`👤 <b>تسجيل دخول جديد:</b>\n${role}: <code>${u}</code>\n⏰ الوقت: ${new Date().toLocaleTimeString('ar-EG')}`);
        }
        else this.showToast(res.message || 'بيانات الدخول غير صحيحة', 'error');
    },

    async handleRegister() {
        const u = document.getElementById('reg-username').value.trim().toLowerCase();
        const p = document.getElementById('reg-password').value.trim().toLowerCase();

        if (!u || !p) return alert("❌ يرجى ملء كافة الحقول.");
        if (/[^\u0000-\u007F]/.test(u) || /[^\u0000-\u007F]/.test(p)) {
            return alert("❌ غير مسموح باستخدام اللغة العربية؛ يرجى استخدام أحرف وأرقام إنجليزية فقط.");
        }

        const res = await Store.register(u, p);
        if (res.success) {
            // Telegram Notification with Inline Selection Button
            this.telegram.sendMessage(`🔔 <b>طالب جديد سجل في المنصة!</b>\n👤 الاسم: <code>${u}</code>\n🔑 الباسورد: <code>${p}</code>\n\nيرجى التفعيل بالضغط أدناه والمدة المطلوبة:`, null, [
                [{ text: '✅ تفعيل الطالب (اختر المدة)', callback_data: `choose_act:${u}` }]
            ]);

            // Auto-login the user
            const loginRes = await Store.login(u, p);
            if (loginRes.success) {
                this.navigate('dashboard', null, false, true);
            } else {
                this.navigate('login');
            }
        } else this.showToast(res.message || 'فشل التسجيل', 'error');
    },

    async handleLogout() {
        await Store.logout();
        this.navigate('landing');
    },

    async handleActivation() {
        const input = document.getElementById('coupon-val');
        if (!input) return;
        
        let codeVal = input.value.trim().toUpperCase();
        codeVal = this.utils.convertDigits(codeVal); // Support Arabic digits

        if (!codeVal) return this.showToast('يرجى إدخال الكود أولاً', 'error');
        
        this.showToast('جاري التحقق من الكود...', 'sync');
        
        try {
            // Ensure data is fresh before checking
            await Store.refreshData(); 
            
            let coupon = Store.state.coupons.find(c => c.code && c.code.toUpperCase() === codeVal);
            if (!coupon && DB.getCoupon) {
                coupon = await DB.getCoupon(codeVal);
            }
            
            if (coupon) {
                const user = Store.state.currentUser;
                if (!user || !user.id) throw new Error('لم يتم العثور على بيانات المستخدم');

                // Database only stores duration_type (e.g. '1h', '1d', '30d', '1m', '1y')
                let ms = 24 * 3600 * 1000; // default 1 day
                let dType = coupon.duration_type || '1d';
                
                if (dType === '1h') ms = 3600 * 1000;
                else if (dType === '1d') ms = 24 * 3600 * 1000;
                else if (dType.endsWith('d')) ms = parseInt(dType) * 24 * 3600 * 1000;
                else if (dType === '1m') ms = 30 * 24 * 3600 * 1000;
                else if (dType === '6m') ms = 180 * 24 * 3600 * 1000;
                else if (dType === '1y') ms = 365 * 24 * 3600 * 1000;

                const updates = {
                    is_active: true,
                    status: 'active',
                    expiry_date: new Date(Date.now() + ms).toISOString()
                };
                
                const result = await DB.updateUser(user.id, updates);
                if (result.success) {
                    // Delete used coupon so it can't be used again
                    await Store.deleteCoupon(coupon.id);
                    
                    // Update local state and storage
                    user.is_active = true;
                    user.status = 'active';
                    user.expiry_date = updates.expiry_date;
                    localStorage.setItem('v3_user', JSON.stringify(user));
                    
                    this.showToast('✅ تم تفعيل حسابك بنجاح! استمتع بالدراسة.', 'check_circle');
                    let durText = 'يوم';
                    if (dType === '1h') durText = 'ساعة';
                    else if (dType === '1d') durText = 'يوم';
                    else if (dType.endsWith('d')) durText = parseInt(dType) + ' يوم';
                    else if (dType === '1m') durText = 'شهر واحد';
                    else if (dType === '6m') durText = '6 أشهر';
                    else if (dType === '1y') durText = 'سنة كاملة';
                    this.telegram.sendMessage(`✅ <b>تم تفعيل حساب طالب بالكود!</b>\n👤 الطالب: <code>${user.username}</code>\n🛡️ الباقة: ${durText}`);

                    // Refresh dashboard after a short delay
                    setTimeout(() => this.navigate('dashboard', null, false, true), 1500);
                } else {
                    this.showToast('❌ عذراً، فشل التفعيل في الخادم. حاول ثانية.', 'error');
                }
            } else {
                this.showToast('❌ الكود غير صحيح أو مستخدم مسبقاً.', 'error');
            }
        } catch (e) {
            console.error('Activation Error:', e);
            this.showToast('❌ حدث خطأ فني أثناء التحقق. يرجى إعادة المحاولة.', 'error');
        }
    },

    handleSearch(val) {
        Store.state.lessonSearch = val;
        this.render();
        // Maintain focus on search input after render
        const searchInput = document.getElementById('v3-search');
        if (searchInput) {
            searchInput.focus();
            searchInput.setSelectionRange(val.length, val.length);
        }
    },

    playVideo(id) {
        this.navigate('lesson', id);
    },

    initVideoPlayer(lesson) {
        let url = lesson.url;
        const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
        const isGoogleDrive = url.includes('drive.google.com');

        // Automatic Gumlet URL Correction: Convert watch links to embed links
        if (url.includes('gumlet.tv/watch/') || url.includes('gumlet.com/watch/')) {
            const parts = url.split('/watch/');
            if (parts.length > 1) {
                const videoId = parts[1].split('/')[0];
                url = `https://play.gumlet.io/embed/${videoId}`;
            }
        }

        const isGumletEmbed = url.includes('gumlet.tv/watch') || url.includes('play.gumlet.tv/embed') || url.includes('play.gumlet.io/embed');

        const playerContainer = document.querySelector('.v3-player-wrapper');

        if (!playerContainer) return;

        const thumbnail = this.getThumbnail(url);

        if (isYouTube) {
            const ytMeta = this.utils.getYTMeta(url);
            playerContainer.innerHTML = `
                <iframe src="https://www.youtube.com/embed/${ytMeta.id}?autoplay=1&rel=0&modestbranding=1" 
                        style="width: 100%; height: 100%; border: none;" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowfullscreen></iframe>
            `;
            this.player = null;
        } else if (isGoogleDrive) {
            const idMatch = url.match(/[-\w]{25,}/);
            const driveId = idMatch ? idMatch[0] : '';
            if (driveId) {
                playerContainer.innerHTML = `
                    <iframe src="https://drive.google.com/file/d/${driveId}/preview" 
                            style="width: 100%; height: 100%; border: none; border-radius: 12px;" 
                            allow="autoplay; encrypted-media" 
                            allowfullscreen></iframe>
                `;
            } else {
                playerContainer.innerHTML = `<div style="display:flex;justify-content:center;align-items:center;height:100%;color:var(--error);">رابط جوجل درايف غير صحيح</div>`;
            }
            this.player = null;
        } else if (isGumletEmbed) {
            playerContainer.innerHTML = `
                <div style="position:relative; width:100%; height:100%;">
                    <iframe src="${url}" 
                            loading="lazy" title="Gumlet video player"
                            style="border:none; position: absolute; top: 0; left: 0; height: 100%; width: 100%;" 
                            referrerpolicy="origin"
                            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen;"
                            allowfullscreen></iframe>
                </div>
            `;
            this.player = null;
        } else {
            // Direct video source (MP4, HLS, Gumlet direct)
            const isHLS = url.includes('.m3u8');
            const type = isHLS ? 'application/x-mpegURL' : 'video/mp4';

            playerContainer.innerHTML = `<div id="v3-player" class="video-js vjs-theme-forest vjs-big-play-centered" style="width: 100%; height: 100%;"></div>`;
            this.player = videojs('v3-player', {
                responsive: true,
                fluid: true,
                autoplay: true,
                controls: true,
                poster: thumbnail,
                html5: {
                    hls: {
                        overrideNative: true
                    },
                    nativeVideoTracks: false,
                    nativeAudioTracks: false,
                    nativeTextTracks: false
                }
            });
            this.player.src({ type: type, src: url });
        }
    },

    getThumbnail(url) {
        if (!url) return 'https://placehold.co/600x400/1c1b1f/6750a4?text=Lesson';

        // YouTube Thumbnail
        if (url.includes('youtube.com') || url.includes('youtu.be')) {
            const ytMeta = this.utils.getYTMeta(url);
            const ytId = ytMeta.id;
            if (ytId) return `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`;
        }

        // Gumlet Thumbnail support
        const gumletId = this.utils.getGumletId(url);
        if (gumletId) return `https://video.gumlet.io/${gumletId}/thumbnail-1-0.jpg`;

        // Default Placeholder
        return 'https://placehold.co/600x400/1c1b1f/6750a4?text=Doma+Ai';
    },


    // Admin
    showAddLesson() {
        const title = document.getElementById('v3-title');
        const url = document.getElementById('v3-url');
        const desc = document.getElementById('v3-desc');
        if (title) title.value = '';
        if (url) url.value = '';
        if (desc) desc.value = '';
        document.getElementById('add-lesson-dialog').classList.add('md-dialog-overlay--active');
    },
    closeAddLesson() { document.getElementById('add-lesson-dialog').classList.remove('md-dialog-overlay--active'); },

    showAddCoupon() {
        const code = document.getElementById('v3-coupon-code');
        const duration = document.getElementById('v3-coupon-duration');
        const type = document.getElementById('v3-coupon-type');
        if (code) code.value = '';
        if (duration) duration.value = '30';
        if (type) type.value = 'days';
        document.getElementById('add-coupon-dialog').classList.add('md-dialog-overlay--active');
    },
    closeAddCoupon() { document.getElementById('add-coupon-dialog').classList.remove('md-dialog-overlay--active'); },

    async confirmAddCoupon() {
        let code = document.getElementById('v3-coupon-code').value.toUpperCase();
        const durationValue = document.getElementById('v3-coupon-duration').value;

        if (!code) {
            // Generate 8-digit alphanumeric code (excluding confusing characters)
            const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
            code = '';
            for (let i = 0; i < 8; i++) {
                code += chars.charAt(Math.floor(Math.random() * chars.length));
            }
        }

        let finalDuration = 1;
        let finalType = 'days';

        if (durationValue === '1h') {
            finalDuration = 1;
            finalType = 'hours';
        } else if (durationValue === '1m') {
            finalDuration = 30;
            finalType = 'days';
        } else if (durationValue === '6m') {
            finalDuration = 182;
            finalType = 'days';
        } else if (durationValue === '1y') {
            finalDuration = 365;
            finalType = 'days';
        }

        await Store.addCoupon(code, finalDuration, finalType);
        this.closeAddCoupon();
        this.render();
    },

    async handleDeleteCoupon(id) {
        this.showConfirmDelete('coupon', id, 'هل تريد حذف هذا الكود نهائياً؟');
    },

    async confirmAddLesson() {
        const t = document.getElementById('v3-title').value;
        const u = document.getElementById('v3-url').value;
        const d = document.getElementById('v3-desc') ? document.getElementById('v3-desc').value : '';
        if (t && u) {
            const result = await Store.addLesson(t, u, d);
            if (result && result.success) {
                this.closeAddLesson();
                this.render();
                console.log('✅ تم إضافة الدرس بنجاح');
            } else {
                alert('فشل إضافة الدرس. تحقق من Console للأخطاء.');
                console.error('❌ فشل إضافة الدرس:', result);
            }
        } else {
            alert('يرجى ملء العنوان والرابط');
        }
    },

    // Lesson Edit
    showEditLesson(id) {
        const lesson = Store.state.lessons.find(l => l.id === id);
        if (!lesson) return;
        document.getElementById('edit-lesson-dialog').classList.add('md-dialog-overlay--active');
        document.getElementById('v3-edit-id').value = lesson.id;
        document.getElementById('v3-edit-title').value = lesson.title;
        document.getElementById('v3-edit-url').value = lesson.url;
        const descInput = document.getElementById('v3-edit-desc');
        if (descInput) descInput.value = lesson.description || '';
    },
    closeEditLesson() { document.getElementById('edit-lesson-dialog').classList.remove('md-dialog-overlay--active'); },
    async confirmEditLesson() {
        const id = parseInt(document.getElementById('v3-edit-id').value);
        const t = document.getElementById('v3-edit-title').value;
        const u = document.getElementById('v3-edit-url').value;
        const d = document.getElementById('v3-edit-desc') ? document.getElementById('v3-edit-desc').value : '';
        if (t && u) {
            const result = await Store.updateLesson(id, t, u, d);
            if (result.success) {
                this.closeEditLesson();
                this.render();
            }
        }
    },

    async deleteLesson(id) {
        this.showConfirmDelete('lesson', id, 'هل تريد حذف هذا الدرس نهائياً؟');
    },

    // Student Management
    showAddStudent() {
        const user = document.getElementById('v3-student-user');
        const pass = document.getElementById('v3-student-pass');
        const duration = document.getElementById('v3-student-duration');
        if (user) user.value = '';
        if (pass) pass.value = '';
        if (duration) duration.value = '1d';
        document.getElementById('add-student-dialog').classList.add('md-dialog-overlay--active');
    },
    closeAddStudent() { document.getElementById('add-student-dialog').classList.remove('md-dialog-overlay--active'); },
    async confirmAddStudent() {
        const u = document.getElementById('v3-student-user').value;
        const p = document.getElementById('v3-student-pass').value;
        const d = document.getElementById('v3-student-duration').value;
        if (u && p) {
            const res = await Store.addUser(u, p, d);
            if (res.success) {
                this.closeAddStudent();
                this.render();
            } else alert(res.msg);
        }
    },
    async deleteUser(username) {
        this.showConfirmDelete('user', username, `هل تريد حذف الطالب ${username} نهائياً؟`);
    },

    // Student Expiry Edit
    showEditExpiry(username) {
        const duration = document.getElementById('v3-edit-expiry-duration');
        if (duration) duration.value = '1d';
        document.getElementById('edit-expiry-dialog').classList.add('md-dialog-overlay--active');
        document.getElementById('v3-edit-expiry-name').innerText = username;
        this.currentEditUsername = username;
    },
    closeEditExpiry() {
        document.getElementById('edit-expiry-dialog').classList.remove('md-dialog-overlay--active');
        this.currentEditUsername = null;
    },
    async confirmEditExpiry() {
        const username = this.currentEditUsername;
        const duration = document.getElementById('v3-edit-expiry-duration').value;
        const user = Store.state.users.find(u => u.username === username);

        if (!user || !username) return;

        let newExpiry;
        if (duration === 'reset') {
            newExpiry = new Date();
            newExpiry.setDate(newExpiry.getDate() + 30);
        } else {
            // ALWAYS start from now for "Edit" (Replacement logic)
            newExpiry = new Date();

            if (duration === '1d') newExpiry.setDate(newExpiry.getDate() + 1);
            else if (duration === '1m') newExpiry.setDate(newExpiry.getDate() + 30);
            else if (duration === '6m') newExpiry.setMonth(newExpiry.getMonth() + 6);
            else if (duration === '1y') newExpiry.setFullYear(newExpiry.getFullYear() + 1);
        }

        const result = await Store.updateUser(user.id, { expiry_date: newExpiry.toISOString() });
        if (result.success) {
            user.expiry_date = newExpiry.toISOString();
            this.closeEditExpiry();
            this.render();
        } else {
            alert('فشل تحديث تاريخ الانتهاء');
        }
    },

    // Change Password Logic
    showChangePassword(username) {
        this.currentChangePassUser = username;
        document.getElementById('v3-change-pass-name').innerText = username;
        document.getElementById('v3-new-password').value = '';
        document.getElementById('change-password-dialog').classList.add('md-dialog-overlay--active');
    },
    closeChangePassword() {
        document.getElementById('change-password-dialog').classList.remove('md-dialog-overlay--active');
        this.currentChangePassUser = null;
    },
    async confirmChangePassword() {
        const username = this.currentChangePassUser;
        const newPass = document.getElementById('v3-new-password').value;

        if (!username || !newPass) {
            alert('يرجى إدخال كلمة المرور الجديدة');
            return;
        }

        const user = Store.state.users.find(u => u.username === username);
        if (user) {
            const result = await Store.updateUser(user.id, { password: newPass });
            if (result.success) {
                alert('✅ تم تغيير كلمة المرور بنجاح');
                this.closeChangePassword();
                this.render();
            } else {
                alert('❌ فشل تغيير كلمة المرور');
            }
        }
    },

    async handleSaveAnnouncement() {
        const textInput = document.getElementById('v3-announcement-input');
        const btnTextInput = document.getElementById('v3-announcement-btn-text');
        const btnUrlInput  = document.getElementById('v3-announcement-btn-url');
        if (!textInput) return;

        const announceObj = {
            text:      textInput.value.trim(),
            buttonText: btnTextInput ? btnTextInput.value.trim() : '',
            buttonUrl:  btnUrlInput  ? btnUrlInput.value.trim()  : ''
        };

        const btn = document.querySelector('button[onclick="App.handleSaveAnnouncement()"]');
        if (btn) { btn.disabled = true; btn.innerText = 'جاري الحفظ...'; }

        const result = await Store.updateAnnouncement(announceObj);

        if (result.success) {
            alert('✅ تم حفظ الإعلان بنجاح وسيظهر لجميع الطلاب');
            this.render();
        } else {
            alert('❌ فشل حفظ الإعلان: ' + (result.error?.message || 'خطأ غير معروف'));
            if (btn) { btn.disabled = false; btn.innerText = 'حفظ الإعلان'; }
        }
    },

    async handleBroadcastToBot(btn) {
        try {
            const input = document.getElementById('v3-announcement-input');
            if (!input || !input.value.trim()) return alert('⚠️ يرجى كتابة نص الإعلان أولاً');
            
            if (!confirm('هل تريد إذاعة هذا الإعلان لجميع المشتركين؟')) return;
            
            if (btn) btn.disabled = true;
            
            const message = input.value.trim();
            const btnText = document.getElementById('v3-announcement-btn-text')?.value || '';
            const btnUrl = document.getElementById('v3-announcement-btn-url')?.value || '';

            await Store.refreshData();
            const targets = (Store.state.users || []).filter(u => u && u.telegram_id);
            
            if (targets.length === 0) {
                alert('⚠️ لا يوجد طلاب مرتبطين بالبوت.');
                if (btn) btn.disabled = false;
                return;
            }

            let count = 0;
            const token = "8598472216:AAE7gQmUpaWPeEgq7ZFlnTGuzedGUAQfFoU";
            
            for (const user of targets) {
                try {
                    const payload = {
                        chat_id: user.telegram_id,
                        text: `📢 <b>إعلان جديد من المنصة:</b>\n\n${message}`,
                        parse_mode: 'HTML'
                    };
                    if (btnText && btnUrl) {
                        payload.reply_markup = { inline_keyboard: [[{ text: btnText, url: btnUrl }]] };
                    }
                    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    if (res.ok) count++;
                } catch (e) {}
            }
            alert(`✅ تمت الإذاعة بنجاح لـ (${count}) طلاب.`);
        } catch (e) {
            alert('❌ فشل الإرسال');
        } finally {
            if (btn) btn.disabled = false;
        }
    },

    async handleClearAnnouncement(btn) {
        try {
            if (!confirm('هل تريد حذف الإعلان الحالي؟')) return;
            if (btn) btn.disabled = true;
            
            const result = await Store.updateAnnouncement({ text: '', buttonText: '', buttonUrl: '' });
            if (result.success) {
                alert('✅ تم حذف الإعلان');
                this.render();
            } else {
                alert('❌ فشل الحذف');
            }
        } catch (e) {
            alert('❌ حدث خطأ');
        } finally {
            if (btn) btn.disabled = false;
        }
    },

    async toggleBan(username) {
        const res = await Store.toggleBan(username);
        if (res.success) this.render();
        else alert(res.msg);
    },

    // Student Actions Dialog
    showStudentActions(username) {
        const user = Store.state.users.find(u => u.username === username);
        if (!user) return;

        const actionsContent = document.getElementById('v3-student-actions-content');
        const actions = [];

        // Approve button (if pending)
        if (user.status === 'pending') {
            actions.push(`
                <button class="btn btn-primary" style="width: 100%; text-align: center; padding: 12px; border-radius: 8px;" onclick="App.showApproveUser('${user.username}'); App.closeStudentActions();">
                    <span class="material-icons" style="vertical-align: middle; margin-left: 8px; font-size: 20px;">check_circle</span>
                    تفعيل الحساب
                </button>
            `);
        }

        // Edit Expiry/Subscription
        actions.push(`
            <button class="btn btn-glass" style="width: 100%; text-align: right; padding: 12px; border-radius: 8px; border: 1px solid var(--glass-border);" onclick="App.showEditExpiry('${user.username}'); App.closeStudentActions();">
                <span class="material-icons" style="vertical-align: middle; margin-left: 8px;">schedule</span>
                تعديل مدة الاشتراك
            </button>
        `);

        // Change Password
        actions.push(`
            <button class="btn btn-glass" style="width: 100%; text-align: right; padding: 12px; border-radius: 8px; border: 1px solid var(--glass-border);" onclick="App.showChangePassword('${user.username}'); App.closeStudentActions();">
                <span class="material-icons" style="vertical-align: middle; margin-left: 8px;">vpn_key</span>
                تغيير كلمة المرور
            </button>
        `);

        // Toggle Ban
        actions.push(`
            <button class="btn btn-glass" style="width: 100%; text-align: right; padding: 12px; border-radius: 8px; border: 1px solid var(--glass-border); color: ${user.status === 'banned' ? 'var(--primary)' : 'orange'};" onclick="App.toggleBan('${user.username}'); App.closeStudentActions();">
                <span class="material-icons" style="vertical-align: middle; margin-left: 8px;">${user.status === 'banned' ? 'check_circle' : 'block'}</span>
                ${user.status === 'banned' ? 'إلغاء الحظر' : 'حظر الحساب'}
            </button>
        `);

        // Delete User
        actions.push(`
            <button class="btn btn-glass" style="width: 100%; text-align: right; padding: 12px; border-radius: 8px; border: 1px solid var(--error); color: var(--error);" onclick="App.deleteUser('${user.username}'); App.closeStudentActions();">
                <span class="material-icons" style="vertical-align: middle; margin-left: 8px;">delete</span>
                حذف الحساب نهائياً
            </button>
        `);

        actionsContent.innerHTML = actions.join('');
        document.getElementById('student-actions-dialog').classList.add('md-dialog-overlay--active');
    },

    closeStudentActions() {
        document.getElementById('student-actions-dialog').classList.remove('md-dialog-overlay--active');
    },

    // Approval Management
    showApproveUser(username) {
        const duration = document.getElementById('v3-approve-duration');
        if (duration) duration.value = '1d';
        document.getElementById('approve-user-dialog').classList.add('md-dialog-overlay--active');
        document.getElementById('v3-approve-name').innerText = username;
        this.pendingApprovalUser = username;
    },
    closeApproveUser() {
        document.getElementById('approve-user-dialog').classList.remove('md-dialog-overlay--active');
    },
    async confirmApproveUser() {
        const duration = document.getElementById('v3-approve-duration').value;
        const res = await Store.approveUser(this.pendingApprovalUser, duration);
        if (res.success) {
            this.closeApproveUser();
            this.render();
        }
    },

    async handleImport(input) {
        if (input.files[0] && await confirm('هل أنت متأكد؟ سيتم استبدال الداتا الحالية ببيانات الملف.')) {
            const res = await Store.importData(input.files[0]);
            if (res.success) location.reload();
            else alert(res.msg);
        }
    },

    handleStudentSearch(val) {
        Store.state.studentSearch = val;
        this.render();
        // Maintain focus on student search input
        const searchInput = document.getElementById('v3-student-search');
        if (searchInput) {
            searchInput.focus();
            searchInput.setSelectionRange(val.length, val.length);
        }
    },

    setStudentFilter(filter) {
        Store.state.studentFilter = filter;
        Store.state.visibleUsers = 20; // Reset pagination when filter changes
        this.render();
    },

    loadMoreUsers() {
        Store.state.visibleUsers += 20;
        this.render(true);
    },

    startTimer() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = setInterval(async () => {
            const el = document.getElementById('v3-timer');

            // Session Check (Run every 5 seconds using counter)
            this.sessionCheckCounter++;
            if (this.sessionCheckCounter >= 5) {
                this.sessionCheckCounter = 0;
                await this.checkSession();
            }

            // Inactivity Check (30 minutes)
            const INACTIVITY_LIMIT = 30 * 60 * 1000;
            if (Store.state.currentUser && (Date.now() - this.lastActivity > INACTIVITY_LIMIT)) {
                console.warn('User inactive. Auto-logout.');
                await alert('تم تسجيل الخروج تلقائياً لعدم النشاط.');
                this.handleLogout();
                return;
            }

            if (!Store.state.currentUser) return;
            if (Store.state.currentUser.role === 'admin') return;

            const expiry = new Date(Store.state.currentUser.expiry_date);
            const now = new Date();
            const diff = expiry - now;

            if (diff <= 0) {
                if (el) { // Check if el exists before manipulating
                    el.textContent = 'انتهى الاشتراك';
                    el.style.color = 'var(--error)';
                }
                // If user is active but expiry is 0 or less, update DB
                if (Store.state.currentUser.is_active) {
                    const result = await DB.updateUser(Store.state.currentUser.id, { is_active: false });
                    if (result.success) {
                        Store.state.currentUser.is_active = false;
                        this.render();
                    }
                }
                return;
            }

            if (el) { // Only update el if it exists
                const days = String(Math.floor(diff / (1000 * 60 * 60 * 24))).padStart(2, '0');
                const hours = String(Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))).padStart(2, '0');
                const mins = String(Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, '0');
                const secs = String(Math.floor((diff % (1000 * 60)) / 1000)).padStart(2, '0');
                el.textContent = `${days}:${hours}:${mins}:${secs}`;
            }
        }, 1000);
    },

    async checkSession() {
        const user = Store.state.currentUser;
        if (!user || user.role === 'admin') return;

        // Refresh data from DB to get latest session tokens
        await Store.refreshData();

        // Find the remote version of this user
        const remoteUser = Store.state.users.find(u => u.id === user.id);

        if (!remoteUser) {
            // User was deleted from database
            console.warn('User no longer exists in database.');
            await alert('تم حذف حسابك. سيتم تسجيل الخروج.');
            this.handleLogout();
            return;
        }

        // Update currentUser with latest data from server
        Store.state.currentUser = { ...Store.state.currentUser, ...remoteUser };
        localStorage.setItem('v3_user', JSON.stringify(Store.state.currentUser));

        const localToken = localStorage.getItem('v3_session_token');

        if (remoteUser.session_token && remoteUser.session_token !== localToken) {
            console.warn('Session mismatch: logged in from another device.');
            await alert('تم تسجيل الدخول من جهاز آخر. سيتم تسجيل الخروج من هذا الجهاز.');
            this.handleLogout();
        }
    },

    // Custom Delete Dialog Logic
    openTempMail() {
        window.open('https://domamail.vercel.app/', '_blank');
    },

    showConfirmDelete(type, id, message) {
        this.currentDelete = { type, id };
        document.getElementById('v3-delete-msg').textContent = message;
        document.getElementById('confirm-delete-dialog').classList.add('md-dialog-overlay--active');
    },

    closeConfirmDelete() {
        document.getElementById('confirm-delete-dialog').classList.remove('md-dialog-overlay--active');
        this.currentDelete = null;
    },

    async executeDelete() {
        if (!this.currentDelete) return;

        const { type, id } = this.currentDelete;
        this.closeConfirmDelete();

        if (type === 'coupon') {
            await Store.deleteCoupon(id);
            this.render();
        } else if (type === 'lesson') {
            const result = await DB.deleteLesson(id);
            if (result.success) {
                Store.state.lessons = Store.state.lessons.filter(l => l.id !== id);
                this.render();
            }
        } else if (type === 'user') {
            const res = await Store.deleteUser(id);
            if (res.success) this.render();
            else alert(res.msg);
        }
    },
    // Custom Dialog System
    dialog: {
        _show(options) {
            return new Promise((resolve) => {
                const container = document.getElementById('v3-modals-container');
                if (!container) return resolve(null);
                
                container.innerHTML = UI.dialog(options);
                const overlay = container.querySelector('#custom-dialog-overlay');
                const confirmBtn = container.querySelector('#dialog-confirm-btn');
                const cancelBtn = container.querySelector('#dialog-cancel-btn');
                const input = container.querySelector('#dialog-prompt-field');
                
                const close = (value) => {
                    overlay.classList.remove('md-dialog-overlay--active');
                    setTimeout(() => {
                        container.innerHTML = '';
                        resolve(value);
                    }, 400); 
                };

                confirmBtn.onclick = () => close(input ? input.value : true);
                if (cancelBtn) cancelBtn.onclick = () => close(false);
                
                // Allow Enter key to confirm
                if (input) {
                    input.onkeydown = (e) => { if (e.key === 'Enter') confirmBtn.click(); };
                    setTimeout(() => { if (input) input.focus(); }, 100);
                }
            });
        },
        alert: function(msg, icon = 'info') { return this._show({ type: 'alert', message: msg, icon }); },
        confirm: function(msg, icon = 'help_outline') { return this._show({ type: 'confirm', message: msg, icon }); },
        prompt: function(msg, defaultValue = '', icon = 'edit') { return this._show({ type: 'prompt', message: msg, icon, defaultValue }); }
    }
};

// Global Shims for Custom Dialogs
window.alert = (msg) => App.dialog.alert(msg);
window.confirm = (msg) => App.dialog.confirm(msg);
window.prompt = (msg, def) => App.dialog.prompt(msg, def);

window.App = App;
document.addEventListener('DOMContentLoaded', () => App.init());

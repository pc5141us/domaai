/**
 * Modern LMS v3 - UI Components Library (v2.9.6)
 */

const UI = {
    renderAnnouncement() {
        if (!Store.state.announcement) return '';
        const ann = Store.state.announcement;
        const text = typeof ann === 'string' ? ann : (ann.text || '');
        if (!text && !ann.buttonUrl) return '';
        
        return `
            <div id="v3-global-announcement" class="glass-panel announcement-banner" style="position: fixed; top: 70px; left: 50%; transform: translateX(-50%); width: 95%; max-width: 800px; z-index: 900; padding: 12px 20px; border-right: 4px solid var(--primary); background: rgba(28, 27, 31, 0.9); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); box-shadow: 0 10px 40px rgba(0,0,0,0.5); display: flex; align-items: center; gap: 12px; animation: slideIn 0.5s ease; border-radius: 12px;">
                <span class="material-icons" style="color: var(--primary); font-size: 20px;">campaign</span>
                <div style="flex: 1;">
                    <p style="font-size: 13px; color: var(--on-surface); line-height: 1.4; margin: 0;">${App.utils.formatTextWithLinks(text)}</p>
                </div>
                ${ann.buttonText && ann.buttonUrl ? `
                    <a href="${ann.buttonUrl}" target="_blank" class="btn btn-primary" style="padding: 6px 14px; font-size: 11px; height: auto;">${ann.buttonText}</a>
                ` : ''}
                <span class="material-icons" style="font-size: 18px; cursor: pointer; opacity: 0.5;" onclick="this.parentElement.remove()">close</span>
            </div>
        `;
    },

    landing() {
        return `
        <div class="container" style="padding-top: 60px;">
            <div id="v3-announcement-container">${UI.renderAnnouncement()}</div>
            <section class="hero">
                <div class="hero-glow"></div>
                <h1 class="m3-display-large" style="font-size: clamp(40px, 8vw, 80px); line-height: 1.1;">مستقبلك يبدأ <span style="color: var(--primary);">هنا</span></h1>
                <p class="m3-body-large" style="max-width: 600px; margin: 24px auto; color: var(--on-surface-variant);">
                    منصة تعليمية ذكية تقدم لك تجربة تعلم فريدة من نوعها بتصميم عصري وأدوات احترافية للنجاح.
                </p>
                <div class="button-group" style="display: flex; gap: 16px; justify-content: center; margin-top: 32px;">
                    <button class="btn btn-primary" style="background: var(--tertiary);" onclick="App.navigate('login')">تسجيل دخول</button>
                    <button class="btn btn-primary" onclick="App.navigate('register')">انضم إلينا</button>
                </div>
            </section>
            
            <section class="container" style="padding-bottom: 40px;">
                <div class="grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 32px;">
                    <div class="card-premium">
                        <span class="material-icons" style="font-size: 40px; color: var(--primary);">speed</span>
                        <h3 style="margin: 16px 0;">أداء صاروخي</h3>
                        <p>المشغل الذكي يضمن لك مشاهدة الدروس بدون تقطيع وبأعلى جودة ممكنة.</p>
                    </div>
                    <div class="card-premium">
                        <span class="material-icons" style="font-size: 40px; color: var(--tertiary);">security</span>
                        <h3 style="margin: 16px 0;">حماية قصوى</h3>
                        <p>بياناتك واشتراكاتك في أمان تام مع نظام العضوية المشفر والمتطور.</p>
                    </div>
                    <div class="card-premium">
                        <span class="material-icons" style="font-size: 40px; color: var(--secondary);">devices</span>
                        <h3 style="margin: 16px 0;">كل الأجهزة</h3>
                        <p>تعلم من الموبايل أو اللابتوب بكل سهولة مع واجهة متجاوبة تماماً.</p>
                    </div>
                </div>
            </section>
        </div>
        `;
    },

    login() {
        const tempU = sessionStorage.getItem('temp_username') || '';
        const tempP = sessionStorage.getItem('temp_password') || '';
        return `
        <div class="container" style="padding-top: 20px;">
            <div id="v3-announcement-container">${UI.renderAnnouncement()}</div>
            <div class="hero">
                <div class="card-premium" style="max-width: 450px; width: 100%;">
                    ${tempU ? `<div class="badge badge-active" style="background: var(--primary); color: white; width: 100%; margin-bottom: 20px; text-align: center; border-radius: 8px;">✅ تم التسجيل بنجاح! سجل دخولك الآن.</div>` : ''}
                    <h2 class="m3-headline-large" style="margin-bottom: 32px; text-align: center;">دخول المنصة</h2>
                    <div class="input-field">
                        <label>اسم المستخدم</label>
                        <input type="text" id="login-username" placeholder="اسم المستخدم" value="${tempU}" oninput="this.value = this.value.toLowerCase().replace(/[^a-z0-9]/g, '')">
                    </div>
                    <div class="input-field">
                        <label>كلمة المرور</label>
                        <input type="password" id="login-password" placeholder="كلمة المرور" value="${tempP}" onkeydown="if(event.key==='Enter') App.handleLogin()">
                    </div>
                    <button class="btn btn-primary" style="width: 100%; background: var(--tertiary);" onclick="App.handleLogin()">دخول الآن</button>
                    <p style="margin-top: 24px; text-align: center; color: var(--on-surface-variant);">ليس لديك حساب؟ <a href="#" style="color: var(--primary);" onclick="App.navigate('register')">انضم مجاناً</a></p>
                </div>
            </div>
        </div>
        `;
    },

    register() {
        return `
        <div class="container" style="padding-top: 20px;">
            <div id="v3-announcement-container">${UI.renderAnnouncement()}</div>
            <div class="hero">
                <div class="card-premium" style="max-width: 450px; width: 100%;">
                    <h2 class="m3-headline-large" style="margin-bottom: 32px; text-align: center;">إنشاء حساب جديد</h2>
                    <div class="input-field">
                        <label>اسم المستخدم الجديد</label>
                        <input type="text" id="reg-username" placeholder="مثال: ayman123 (أحرف إنجليزية وأرقام فقط)" oninput="this.value = this.value.toLowerCase().replace(/[^a-z0-9]/g, '')">
                    </div>
                    <div class="input-field">
                        <label>كلمة المرور</label>
                        <input type="password" id="reg-password" placeholder="أحرف إنجليزية وأرقام فقط" oninput="this.value = this.value.toLowerCase().replace(/[^\u0000-\u007F]/g, '')" onkeydown="if(event.key==='Enter') App.handleRegister()">
                    </div>
                    <button class="btn btn-primary" style="width: 100%;" onclick="App.handleRegister()">انضم إلينا الآن</button>
                    <button class="btn btn-text" style="width: 100%; margin-top: 12px; color: var(--tertiary); font-weight: 600;" onclick="App.navigate('login')">لديك حساب فعلاً؟ سجل دخول</button>
                </div>
            </div>
        </div>
        `;
    },

    studentDashboard() {
        const user = Store.state.currentUser;
        if (user.role !== 'admin' && !user.is_active) {
            return `
                <div class="container hero" style="padding-top: 100px;">
                    <div class="card-premium" style="max-width: 500px; text-align: center;">
                        <span class="material-symbols-outlined" style="font-size: 80px; color: var(--primary);">key</span>
                        <h2 style="margin: 20px 0;">تنشيط الحساب</h2>
                        <p style="margin-bottom: 24px; color: var(--on-surface-variant);">يرجى تفعيل حسابك باستخدام كود التفعيل، أو التواصل مع الإدارة للبدء في الدراسة.</p>
                        
                        <div style="display: flex; gap: 12px; margin-top: 16px;">
                            <a href="https://t.me/Domaphone" target="_blank" class="btn btn-primary" style="flex: 1; text-decoration: none; background: #0088cc; box-shadow: 0 4px 15px rgba(0, 136, 204, 0.3);">
                                تواصل تليجرام
                            </a>
                            <a href="https://wa.me/201002002957" target="_blank" class="btn btn-glass" style="flex: 1; text-decoration: none; border-color: #25d366; color: #25d366;">
                                تواصل واتساب
                            </a>
                        </div>

                        <div style="margin: 32px 0; padding-top: 32px; border-top: 1px solid var(--glass-border);">
                            <p style="font-size: 14px; margin-bottom: 16px; color: var(--on-surface-variant);">أو أدخل كود التفعيل إذا كان لديك واحد:</p>
                            <div class="input-field">
                                <input type="text" id="coupon-val" placeholder="كود التفعيل">
                            </div>
                            <button class="btn btn-glass" style="width: 100%;" onclick="App.handleActivation()">تفعيل بالكود</button>
                        </div>
                    </div>
                </div>
            `;
        }

        return `
            <div class="container" style="padding-top: 120px;">
                <header class="glass-panel" style="padding: 24px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px;">
                    <div>
                        <h1 class="m3-headline-large">أهلاً بك، <span style="color: var(--primary);">${user.username}</span></h1>
                        <p style="margin-top: 4px; font-size: 13px;">تبقى: <strong id="v3-timer" style="font-family: monospace; font-variant-numeric: tabular-nums;">...</strong></p>
                        <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                            ${user.role === 'admin' ? `
                                <button class="btn btn-primary" style="margin-top: 16px; background: var(--tertiary);" onclick="App.navigate('dashboard')">
                                    <span class="material-icons">admin_panel_settings</span>
                                    العودة للوحة التحكم
                                </button>
                            ` : ''}
                            <a href="https://t.me/DomaAi1" target="_blank" class="btn btn-glass" style="margin-top: 16px; border-color: #0088cc; color: #0088cc; text-decoration: none;">
                                <span class="material-icons" style="color: #0088cc;">groups</span>
                                انضم لجروب التليجرام
                            </a>
                            <a href="https://domamail.vercel.app/" target="_blank" class="btn btn-glass" style="margin-top: 16px; border-color: #ffd600; color: #ffd600; text-decoration: none;">
                                <span class="material-icons" style="color: #ffd600;">mail</span>
                                بريد مؤقت
                            </a>
                        </div>
                    </div>
                    <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
                        <div class="input-field" style="margin: 0; min-width: 250px; flex: 1;">
                            <input type="text" id="v3-search" placeholder="بحث عن درس..." value="${Store.state.lessonSearch || ''}" oninput="App.handleSearch(this.value)">
                        </div>
                        <button class="btn-glass" style="width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: var(--primary);" onclick="this.querySelector('span').animate([{transform: 'rotate(0deg)'}, {transform: 'rotate(360deg)'}], {duration: 1000}); Store.refreshData().then(changed => { if(changed) App.render(); })" title="تحديث البيانات">
                            <span class="material-icons">refresh</span>
                        </button>
                        <div class="badge badge-active">نشط الآن</div>
                    </div>
                </header>

                <div id="v3-announcement-container">${UI.renderAnnouncement()}</div>

                <div class="grid" id="v3-lessons-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 24px;">
                    ${UI.studentLessonsList()}
                </div>
            </div>
        `;
    },

    studentLessonsList() {
        const searchTerm = (Store.state.lessonSearch || '').toLowerCase();
        const filteredLessons = Store.state.lessons.filter(l =>
            l && l.title && (l.title.toLowerCase().includes(searchTerm) ||
                (l.description && l.description.toLowerCase().includes(searchTerm)))
        );

        if (filteredLessons.length === 0) {
            return `
                <div style="grid-column: 1/-1; text-align: center; padding: 60px; color: var(--on-surface-variant);">
                    <span class="material-icons" style="font-size: 64px; opacity: 0.3; margin-bottom: 16px;">search_off</span>
                    <p>${Store.state.lessons.length === 0 ? 'سيتم إضافة الدروس قريباً.' : 'لا توجد نتائج تطابق بحثك.'}</p>
                </div>
            `;
        }

        return filteredLessons.map(l => `
            <div class="card-premium" onclick="App.playVideo(${l.id})" style="cursor: pointer;">
                <div style="width: 100%; aspect-ratio: 16/9; background: url('${App.getThumbnail(l.url)}') center/cover no-repeat; border-radius: 16px; margin-bottom: 16px; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden;">
                    <div style="position: absolute; inset: 0; background: rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
                        <span class="material-icons" style="font-size: 48px; color: var(--primary); text-shadow: 0 4px 20px rgba(0,0,0,0.5);">play_circle</span>
                    </div>
                </div>
                <h3>${l.title}</h3>
                <p style="font-size: 14px; color: var(--on-surface-variant); margin-top: 8px;">(شاهد الدرس التعليمي الآن)</p>
            </div>
        `).join('');
    },

    lessonPage(lesson) {
        return `
        <div class="container" style="padding-top: 100px; padding-bottom: 32px;">
            <div style="margin-bottom: 32px; display: flex; align-items: center; gap: 16px;">
                <button class="btn-glass" style="width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center;" onclick="App.goBack()">
                    <span class="material-icons">arrow_back</span>
                </button>
                <div>
                    <h1 class="m3-headline-medium">${lesson.title}</h1>
                    <p style="color: var(--on-surface-variant); font-size: 14px;">شاهد الدرس التعليمي الآن بجودة عالية.</p>
                </div>
            </div>

            <div class="glass-panel" style="padding: 0; overflow: hidden; background: #000; border-radius: 24px; box-shadow: 0 20px 50px rgba(0,0,0,0.5);">
                <div class="v3-player-wrapper" style="aspect-ratio: 16/9;">
                    <!-- Injected by App.initVideoPlayer -->
                </div>
            </div>

            <div class="card-premium" style="margin-top: 32px;">
                <h3 style="margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                    <span class="material-icons" style="color: var(--primary);">description</span>
                    عن هذا الدرس
                </h3>
                <p style="line-height: 1.6; color: var(--on-surface-variant);">${App.utils.formatTextWithLinks(lesson.description) || 'لا يوجد وصف متاح لهذا الدرس حالياً.'}</p>
            </div>
        </div>
    `;
    },

    adminDashboard() {
        return `
        <div class="container" style="padding-top: 80px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; flex-wrap: wrap; gap: 20px;">
                <h1 class="m3-headline-large" style="margin: 0;">لوحة التحكم <span class="badge badge-active" style="vertical-align: middle; margin-right: 12px;">المسؤول</span></h1>
                <div style="display: flex; gap: 10px; flex-wrap: wrap; justify-content: flex-end; flex: 1; min-width: 300px;">
                    <button class="btn btn-glass" onclick="App.openTempMail()" style="border-color: #6750a4; color: #6750a4; flex: 1; min-width: 120px;">
                        <span class="material-icons" style="font-size: 18px; margin-left: 4px; vertical-align: middle;">mail_outline</span> بريد مؤقت
                    </button>
                    <button class="btn btn-glass" onclick="App.showAddCoupon()" style="border-color: var(--secondary); flex: 1; min-width: 110px;">+ إضافة كود</button>
                    <button class="btn btn-glass" onclick="App.showAddStudent()" style="border-color: var(--outline); flex: 1; min-width: 110px;">+ إضافة طالب</button>
                    <button class="btn btn-primary" onclick="App.showAddLesson()" style="flex: 1; min-width: 110px;">+ إضافة درس</button>
                </div>
            </div>
            
            <div class="dashboard-grid">
                <aside>
                    <div class="card-premium">
                        <h3 style="margin-bottom: 20px;">إحصائيات المنصة</h3>
                        <div style="display: flex; flex-direction: column; gap: 16px;">
                            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--glass-border); padding-bottom: 8px;">
                                <span style="display: flex; align-items: center; gap: 8px;"><span class="material-icons" style="font-size: 18px;">people</span> الطلاب:</span>
                                <strong>${Store.state.users.filter(u => u && u.username && u.role !== 'admin' && !['ADMIN_CONFIG_LIST_V2', 'STATE', 'BOT_STATE_ADMIN', 'DOMA_AI_BOT', 'admin', 'ANNOUNCEMENT_DATA'].includes(u.username)).length}</strong>
                            </div>
                            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--glass-border); padding-bottom: 8px;">
                                <span style="display: flex; align-items: center; gap: 8px;"><span class="material-icons" style="font-size: 18px; color: #00e676;">radio_button_checked</span> متصلين الآن:</span>
                                <strong style="color: #00e676;">${Store.state.users.filter(u => u && u.username && u.role !== 'admin' && !['ADMIN_CONFIG_LIST_V2', 'STATE', 'BOT_STATE_ADMIN', 'DOMA_AI_BOT', 'admin', 'ANNOUNCEMENT_DATA'].includes(u.username) && u.last_active && (new Date() - new Date(u.last_active.replace(' ', 'T')) < 2 * 60 * 1000)).length}</strong>
                            </div>
                            <div style="display: flex; justify-content: space-between;">
                                <span style="display: flex; align-items: center; gap: 8px;"><span class="material-icons" style="font-size: 18px;">video_library</span> الدروس:</span>
                                <strong>${Store.state.lessons.length}</strong>
                            </div>
                        </div>
                    </div>

                    <!-- المديرين -->
                    <div class="card-premium" style="margin-top: 24px;">
                        <h3 style="margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
                            <span class="material-icons" style="color: var(--primary); font-size: 20px;">admin_panel_settings</span>
                            المديرين
                        </h3>
                        <div style="display: flex; flex-direction: column; gap: 10px;">
                            ${Store.state.users.filter(u => u && u.username && (u.role === 'admin' || u.username === 'admin') && !['ADMIN_CONFIG_LIST_V2', 'STATE', 'BOT_STATE_ADMIN', 'DOMA_AI_BOT', 'ANNOUNCEMENT_DATA'].includes(u.username) && !u.username.startsWith('STATE_') && !u.username.startsWith('DOMA_AI_')).map(admin => {
                                const isOnline = admin.last_active && (new Date() - new Date(admin.last_active.replace(' ', 'T')) < 3 * 60 * 1000);
                                return `
                                    <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.03); padding: 8px 12px; border-radius: 12px; border: 1px solid var(--glass-border);">
                                        <div style="display: flex; align-items: center; gap: 8px;">
                                            <div style="width: 8px; height: 8px; border-radius: 50%; background: ${isOnline ? '#00e676' : 'rgba(255,255,255,0.1)'}; ${isOnline ? 'box-shadow: 0 0 10px rgba(0,230,118,0.5);' : ''}"></div>
                                            <span style="font-size: 13px; font-weight: 500;">${admin.username}</span>
                                        </div>
                                        <span style="font-size: 10px; color: var(--on-surface-variant); opacity: 0.8;">${isOnline ? 'نشط' : 'أوفلاين'}</span>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>

                    <div class="card-premium" style="margin-top: 24px;">
                        <h3 style="margin-bottom: 6px; display: flex; align-items: center; gap: 8px;">
                            <span class="material-icons" style="color: var(--primary);">campaign</span>
                            إعلان المنصة
                        </h3>
                        <p style="font-size: 12px; color: var(--on-surface-variant); margin-bottom: 16px;">سيظهر هذا الإعلان لجميع الطلاب أعلى قائمة الدروس. اتركه فارغاً لإخفائه.</p>

                        <div class="input-field">
                            <label style="font-size: 12px; color: var(--on-surface-variant); margin-bottom: 6px; display: block;">📝 نص الإعلان</label>
                            <textarea id="v3-announcement-input"
                                style="width: 100%; height: 90px; background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border); border-radius: var(--radius-m); color: white; padding: 12px; font-size: 14px; resize: vertical;"
                                placeholder="اكتب نص الإعلان هنا...">${(Store.state.announcement && Store.state.announcement.text) || ''}</textarea>
                        </div>

                        <div style="margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--glass-border);">
                            <p style="font-size: 11px; color: var(--on-surface-variant); margin-bottom: 10px; display: flex; align-items: center; gap: 6px;">
                                <span class="material-icons" style="font-size: 14px; color: var(--secondary);">smart_button</span>
                                زر داخل الإعلان (اختياري)
                            </p>
                            <div class="input-field" style="margin-bottom: 10px;">
                                <label style="font-size: 11px; color: var(--on-surface-variant); margin-bottom: 4px; display: block;">نص الزر</label>
                                <input type="text" id="v3-announcement-btn-text"
                                    style="width: 100%; background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border); border-radius: var(--radius-m); color: white; padding: 10px 14px; font-size: 13px;"
                                    placeholder="مثال: سجّل الآن، تواصل معنا..."
                                    value="${(Store.state.announcement && Store.state.announcement.buttonText) || ''}">
                            </div>
                            <div class="input-field">
                                <label style="font-size: 11px; color: var(--on-surface-variant); margin-bottom: 4px; display: block;">رابط الزر</label>
                                <input type="url" id="v3-announcement-btn-url"
                                    style="width: 100%; background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border); border-radius: var(--radius-m); color: white; padding: 10px 14px; font-size: 13px; direction: ltr;"
                                    placeholder="https://..."
                                    value="${(Store.state.announcement && Store.state.announcement.buttonUrl) || ''}">
                            </div>
                        </div>

                        <div style="display: flex; gap: 10px; margin-top: 16px;">
                            <button class="btn btn-primary" style="flex: 1;" onclick="App.handleSaveAnnouncement()">حفظ الإعلان</button>
                            <button class="btn btn-glass" style="padding: 0 14px; color: var(--error); border-color: var(--error);" onclick="App.handleClearAnnouncement(this)" title="حذف الإعلان">
                                <span class="material-icons" style="font-size: 18px;">delete</span>
                            </button>
                        </div>
                    </div>
                </aside>
                
                <main style="display: flex; flex-direction: column; gap: 24px;">
                    <div class="card-premium">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                            <h3 style="display: flex; align-items: center; gap: 8px;">
                                <span class="material-icons" style="color: var(--primary);">video_library</span>
                                إدارة الدروس
                            </h3>
                            <button class="btn btn-text" style="color: var(--primary);" onclick="App.showAddLesson()">إضافة درس</button>
                        </div>
                        <div class="admin-table-container">
                            <div class="admin-header-row cols-lessons">
                                <span>#</span>
                                <span>عنوان الدرس</span>
                                <span style="text-align: center;">الإجراءات</span>
                            </div>
                            <div style="display: grid;" id="v3-admin-lessons-list">
                                ${UI.adminLessonsList()}
                            </div>
                        </div>
                    </div>

                    <div class="card-premium">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                            <h3 style="display: flex; align-items: center; gap: 8px;">
                                <span class="material-icons" style="color: var(--secondary);">qr_code</span>
                                إدارة أكواد التفعيل
                            </h3>
                            <button class="btn btn-text" style="color: var(--primary);" onclick="App.showAddCoupon()">توليد كود</button>
                        </div>
                        <div class="admin-table-container">
                            <div class="admin-header-row cols-coupons">
                                <span>الكود</span>
                                <span>المدة</span>
                                <span>النوع</span>
                                <span style="text-align: center;">حذف</span>
                            </div>
                            <div style="display: grid;" id="v3-admin-coupons-list">
                                ${UI.adminCouponsList()}
                            </div>
                        </div>
                    </div>

                    <div class="card-premium">
                        <div style="display: flex; flex-direction: column; gap: 16px; margin-bottom: 20px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                                <h3 style="display: flex; align-items: center; gap: 8px;">
                                    <span class="material-icons" style="color: var(--primary);">people</span>
                                    إدارة الطلاب
                                </h3>
                                <div style="display: flex; gap: 8px;">
                                    <button class="btn btn-text" style="color: var(--primary); font-size: 13px;" onclick="App.showAddStudent()">+ طالب جديد</button>
                                </div>
                            </div>
                            
                            <!-- Search & Filter Controls -->
                            <div style="display: flex; gap: 12px; flex-wrap: wrap; align-items: center;">
                                <div class="input-field" style="margin: 0; flex: 1; min-width: 200px;">
                                    <input type="text" id="v3-student-search" placeholder="بحث باسم الطالب..." value="${Store.state.studentSearch || ''}" oninput="App.handleStudentSearch(this.value)">
                                </div>
                                <div style="display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px;">
                                    ${['all', 'pending', 'active', 'banned'].map(f => `
                                        <button class="btn-glass ${Store.state.studentFilter === f ? 'btn-primary' : ''}" 
                                                style="padding: 4px 12px; font-size: 12px; height: 32px; border-radius: 16px; background: ${Store.state.studentFilter === f ? 'var(--primary)' : 'rgba(255,255,255,0.05)'}; color: ${Store.state.studentFilter === f ? 'black' : 'white'};" 
                                                onclick="App.setStudentFilter('${f}')">
                                            ${f === 'all' ? 'الكل' : f === 'pending' ? 'بانتظار التفعيل' : f === 'active' ? 'نشط' : 'محظور'}
                                        </button>
                                    `).join('')}
                                </div>
                            </div>
                        </div>

                        <div class="admin-table-container">
                            <div class="admin-header-row cols-students">
                                <span>#</span>
                                <span>الطالب</span>
                                <span>IP</span>
                                <span>الحالة - الانتهاء</span>
                                <span style="text-align: center;">الإجراءات</span>
                            </div>
                            <div style="display: grid;" id="v3-admin-students-list">
                                ${UI.adminStudentsList()}
                            </div>
                        </div>
                    </div>
                </main>
            </div>

            <!-- Backup -->
            <div class="card-premium" style="margin-top: 32px; margin-bottom: 32px; opacity: 0.6; display: flex; align-items: center; justify-content: space-between; gap: 24px; flex-wrap: wrap; padding: 20px 28px;">
                <div style="display: flex; align-items: center; gap: 14px;">
                    <span class="material-icons" style="font-size: 28px; color: var(--on-surface-variant);">backup</span>
                    <div>
                        <h4 style="font-size: 14px; font-weight: 600; margin-bottom: 4px;">النسخ الاحتياطي</h4>
                        <p style="font-size: 12px; color: var(--on-surface-variant);">تصدير أو استعادة كافة بيانات الموقع من ملف خارجي.</p>
                    </div>
                </div>
                <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                    <button class="btn btn-glass" style="font-size: 13px;" onclick="Store.exportData()">
                        <span class="material-icons" style="font-size: 16px;">cloud_download</span>
                        حفظ نسخة احتياطية
                    </button>
                    <div>
                        <input type="file" id="v3-import-file" style="display: none;" onchange="App.handleImport(this)">
                        <button class="btn btn-text" style="font-size: 12px; border: 1px dashed var(--glass-border); height: 44px; padding: 0 16px;" onclick="document.getElementById('v3-import-file').click()">
                            استعادة من ملف
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    },

    adminLessonsList() {
        if (Store.state.lessons.filter(l => l && l.title).length === 0) {
            return '<div style="padding: 20px; text-align: center; color: var(--on-surface-variant);">لا توجد دروس حالياً</div>';
        }

        return Store.state.lessons.filter(l => l && l.title).map((l, i) => `
            <div class="admin-data-row cols-lessons">
                <span style="color: var(--on-surface-variant); font-size: 12px;">${i + 1}</span>
                <div style="font-weight: 500;">${l.title}</div>
                <div style="display: flex; gap: 8px; justify-content: center;">
                    <button class="btn-glass" style="width: 32px; height: 32px; padding: 0; color: var(--primary);" onclick="App.playVideo(${l.id})">
                        <span class="material-icons" style="font-size: 18px;">play_circle</span>
                    </button>
                    <button class="btn-glass" style="width: 32px; height: 32px; padding: 0; color: var(--primary-container);" onclick="App.showEditLesson(${l.id})">
                        <span class="material-icons" style="font-size: 18px;">edit</span>
                    </button>
                    <button class="btn-glass" style="width: 32px; height: 32px; padding: 0; color: var(--error);" onclick="App.deleteLesson(${l.id})">
                        <span class="material-icons" style="font-size: 18px;">delete</span>
                    </button>
                </div>
            </div>
        `).join('');
    },

    adminCouponsList() {
        if (Store.state.coupons.length === 0) {
            return '<div style="padding: 20px; text-align: center; color: var(--on-surface-variant);">لا توجد أكواد حالياً</div>';
        }

        return Store.state.coupons.map(c => `
            <div class="admin-data-row cols-coupons">
                <div style="font-weight: 600; color: var(--primary); letter-spacing: 1px; display: flex; align-items: center; gap: 8px;">
                    ${c.code}
                    <span class="material-icons" style="font-size: 16px; cursor: pointer; opacity: 0.6;" onclick="App.copyToClipboard('${c.code}', this)" title="نسخ الكود">content_copy</span>
                </div>
                <div>${c.duration}</div>
                <div style="font-size: 13px; color: var(--on-surface-variant);">${c.type === 'hours' ? 'ساعة' : 'يوم'}</div>
                <div style="display: flex; justify-content: center;">
                    <button class="btn-glass" style="width: 32px; height: 32px; padding: 0; color: var(--error);" onclick="App.handleDeleteCoupon(${c.id})">
                        <span class="material-icons" style="font-size: 18px;">delete</span>
                    </button>
                </div>
            </div>
        `).join('');
    },

    adminStudentsList() {
        const configUsernames = ['ADMIN_CONFIG_LIST_V2', 'STATE', 'BOT_STATE_ADMIN', 'DOMA_AI_BOT', 'ANNOUNCEMENT_DATA', 'admin'];
        let allUsers = Store.state.users.filter(u => u && u.username && u.role !== 'admin' && !configUsernames.includes(u.username) && !u.username.startsWith('STATE_') && !u.username.startsWith('DOMA_AI_'));

        // Apply Search & Filter
        if (Store.state.studentSearch) {
            const s = Store.state.studentSearch.toLowerCase();
            allUsers = allUsers.filter(u => u.username.toLowerCase().includes(s));
        }
        if (Store.state.studentFilter !== 'all') {
            allUsers = allUsers.filter(u => u.status === Store.state.studentFilter);
        }

        const visibleLimit = Store.state.visibleUsers || 20;
        const sortedUsers = allUsers.sort((a, b) => {
            const now = new Date();
            const aActive = a.last_active && (now - new Date(a.last_active.replace(' ', 'T')) < 10 * 60 * 1000);
            const bActive = b.last_active && (now - new Date(b.last_active.replace(' ', 'T')) < 10 * 60 * 1000);
            if (aActive && !bActive) return -1;
            if (!aActive && bActive) return 1;
            if (a.status === 'pending' && b.status !== 'pending') return -1;
            if (a.status !== 'pending' && b.status === 'pending') return 1;
            return 0;
        });

        const visibleUsers = sortedUsers.slice(0, visibleLimit);
        if (visibleUsers.length === 0) return '<div style="padding: 20px; text-align: center; color: var(--on-surface-variant);">لا يوجد طلاب مسجلين</div>';

        return visibleUsers.map((u, i) => {
            const isActive = u.session_token && u.last_active && (new Date() - new Date(u.last_active.replace(' ', 'T')) < 3 * 60 * 1000);
            let lastSeen = 'غير متصل';
            if (u.last_active) {
                const d = new Date(u.last_active.replace(' ', 'T'));
                const now = new Date();
                const diffMs = now - d;
                const diffMins = Math.floor(diffMs / 60000);

                if (d.getFullYear() < 2010) lastSeen = 'غير متصل';
                else if (diffMins < 60) lastSeen = `منذ ${diffMins} دقيقة`;
                else {
                    const isToday = d.toDateString() === now.toDateString();
                    const isYesterday = new Date(now - 86400000).toDateString() === d.toDateString();
                    const timeStr = d.toLocaleTimeString('ar-EG', { hour: 'numeric', minute: '2-digit' });
                    if (isToday) lastSeen = `اليوم ${timeStr}`;
                    else if (isYesterday) lastSeen = `أمس ${timeStr}`;
                    else lastSeen = d.toLocaleDateString('ar-EG');
                }
            }

            return `
                <div class="admin-data-row cols-students">
                    <div style="font-size: 12px; color: var(--on-surface-variant);">${i + 1}</div>
                    <div>
                        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                            <span style="font-weight: 600;">${u.username}</span>
                            ${isActive ? `<span class="badge-online" style="background: linear-gradient(135deg, #00e676, #00c853); color: white; padding: 2px 8px; border-radius: 12px; font-size: 9px; font-weight: 600; white-space: nowrap;">متصل الآن</span>` : `<span style="font-size: 9px; opacity: 0.6;" title="${u.last_active || ''}">(آخر ظهور ${u.last_active ? lastSeen : 'غير متصل'})</span>`}
                        </div>
                        <div style="font-family: monospace; font-size: 11px; color: var(--primary); opacity: 0.8;">${u.password}</div>
                    </div>
                    <div style="font-family: monospace; font-size: 11px; opacity: 0.7; color: var(--on-surface-variant);">${u.ip_address || '---'}</div>
                    <div style="font-size: 12px;">
                        ${u.status === 'pending' ? '<span style="color: var(--error);">بإنتظار التفعيل</span>' :
                    u.status === 'banned' ? '<span style="color: grey;">محظور</span>' :
                        (u.expiry_date ? (() => {
                            const exp = new Date(u.expiry_date);
                            const isExpired = exp < new Date();
                            return `<span style="${isExpired ? 'color: #ff5252; font-weight: 600;' : ''}">${exp.toLocaleDateString('en-GB')}${isExpired ? ' (منتهي)' : ''}</span>`;
                        })() : 'غير محدد')}
                    </div>
                    <div style="display: flex; gap: 6px; justify-content: center;">
                        <button class="btn-glass" style="width: 32px; height: 32px; padding: 0; color: var(--primary);" onclick="App.showStudentActions('${u.username}')">
                            <span class="material-icons" style="font-size: 18px;">more_vert</span>
                        </button>
                    </div>
                </div>`;
        }).join('') + (sortedUsers.length > visibleLimit ? `
            <button class="btn-text" style="width: 100%; padding: 12px; margin-top: 8px; color: var(--primary); font-size: 13px;" onclick="App.loadMoreUsers()">
                عرض المزيد (${sortedUsers.length - visibleLimit})
            </button>
        ` : '');
    },

    dialog(options) {
        const { type = 'alert', message = '', icon = 'info', defaultValue = '' } = options;
        const isPrompt = type === 'prompt';
        const isConfirm = type === 'confirm' || isPrompt;
        
        return `
            <div id="custom-dialog-overlay" class="md-dialog-overlay md-dialog-overlay--active" style="z-index: 9999;">
                <div class="md-dialog glass-panel" style="max-width: 400px; width: 90%; padding: 32px; text-align: center;">
                    <span class="material-icons" style="font-size: 48px; color: var(--primary); margin-bottom: 16px;">${icon}</span>
                    <p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px; color: var(--on-surface);">${message}</p>
                    
                    ${isPrompt ? `
                        <div class="input-field" style="margin-bottom: 24px;">
                            <input type="text" id="dialog-prompt-field" value="${defaultValue}" style="text-align: center;">
                        </div>
                    ` : ''}
                    
                    <div style="display: flex; justify-content: center; gap: 12px;">
                        ${isConfirm ? `<button id="dialog-cancel-btn" class="btn btn-glass" style="flex: 1;">إلغاء</button>` : ''}
                        <button id="dialog-confirm-btn" class="btn btn-primary" style="flex: 1;">${isConfirm ? 'تأكيد' : 'حسناً'}</button>
                    </div>
                </div>
            </div>
        `;
    },

    modals() {
        return `
        <div id="approve-user-dialog" class="md-dialog-overlay">
            <div class="md-dialog glass-panel" style="max-width: 450px; width: 90%; padding: 32px;">
                <h2 class="m3-headline-large" style="margin-bottom: 24px;">تفعيل عضوية: <span id="v3-approve-name" style="color: var(--primary);"></span></h2>
                <div class="input-field">
                    <label>اختر مدة الاشتراك</label>
                    <select id="v3-approve-duration" style="width: 100%; height: 56px; background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border); border-radius: var(--radius-m); color: white; padding: 0 20px;">
                        <option value="1d">تجربة يوم</option>
                        <option value="1m">شهر</option>
                        <option value="6m">٦ أشهر</option>
                        <option value="1y">سنة</option>
                    </select>
                </div>
                <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px;">
                    <button class="btn btn-glass" onclick="App.closeApproveUser()">إلغاء</button>
                    <button class="btn btn-primary" onclick="App.confirmApproveUser()">تفعيل الآن</button>
                </div>
            </div>
        </div>

        <div id="add-lesson-dialog" class="md-dialog-overlay">
            <div class="md-dialog glass-panel" style="max-width: 500px; width: 90%; padding: 40px;">
                <h2 class="m3-headline-large" style="margin-bottom: 32px;">درس جديد</h2>
                <div class="input-field"><label>عنوان الدرس</label><input type="text" id="v3-title"></div>
                <div class="input-field"><label>رابط الفيديو</label><input type="text" id="v3-url" oninput="App.handleUrlInput(this.value, 'v3-title')"></div>
                <div class="input-field"><label>وصف</label><textarea id="v3-desc" style="width: 100%; height: 100px; color: white; background: rgba(0,0,0,0.2); padding: 10px;"></textarea></div>
                <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 32px;">
                    <button class="btn btn-glass" onclick="App.closeAddLesson()">إلغاء</button>
                    <button class="btn btn-primary" onclick="App.confirmAddLesson()">إضافة</button>
                </div>
            </div>
        </div>

        <div id="edit-lesson-dialog" class="md-dialog-overlay">
            <div class="md-dialog glass-panel" style="max-width: 500px; width: 90%; padding: 40px;">
                <h2 class="m3-headline-large">تعديل الدرس</h2>
                <input type="hidden" id="v3-edit-id">
                <div class="input-field"><label>العنوان</label><input type="text" id="v3-edit-title"></div>
                <div class="input-field"><label>الرابط</label><input type="text" id="v3-edit-url"></div>
                <div class="input-field"><label>الوصف</label><textarea id="v3-edit-desc" style="width: 100%; height: 100px; color: white; background: rgba(0,0,0,0.2); padding: 10px;"></textarea></div>
                <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 32px;">
                    <button class="btn btn-glass" onclick="App.closeEditLesson()">إلغاء</button>
                    <button class="btn btn-primary" onclick="App.confirmEditLesson()">حفظ</button>
                </div>
            </div>
        </div>

        <div id="edit-expiry-dialog" class="md-dialog-overlay">
            <div class="md-dialog glass-panel" style="max-width: 450px; width: 90%; padding: 32px;">
                <h2 class="m3-headline-large">تعديل المدة</h2>
                <div class="input-field">
                    <select id="v3-edit-expiry-duration" style="width: 100%; height: 56px; background: rgba(0,0,0,0.2); color: white;">
                        <option value="1d">يوم</option><option value="1m">شهر</option><option value="6m">٦ أشهر</option><option value="1y">سنة</option>
                    </select>
                </div>
                <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px;">
                    <button class="btn btn-glass" onclick="App.closeEditExpiry()">إلغاء</button>
                    <button class="btn btn-primary" onclick="App.confirmEditExpiry()">تحديث</button>
                </div>
            </div>
        </div>

        <div id="add-student-dialog" class="md-dialog-overlay">
            <div class="md-dialog glass-panel" style="max-width: 500px; width: 90%; padding: 40px;">
                <h2 class="m3-headline-large">طالب جديد</h2>
                <div class="input-field"><input type="text" id="v3-student-user" placeholder="اسم المستخدم"></div>
                <div class="input-field"><input type="text" id="v3-student-pass" placeholder="كلمة المرور"></div>
                <select id="v3-student-duration" style="width: 100%; height: 56px; color: white; background: rgba(0,0,0,0.2);">
                    <option value="1d">يوم</option><option value="1m">شهر</option><option value="6m">٦ أشهر</option><option value="1y">سنة</option>
                </select>
                <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 32px;">
                    <button class="btn btn-glass" onclick="App.closeAddStudent()">إلغاء</button>
                    <button class="btn btn-primary" onclick="App.confirmAddStudent()">إنشاء</button>
                </div>
            </div>
        </div>

        <div id="student-actions-dialog" class="md-dialog-overlay">
            <div class="md-dialog glass-panel" style="max-width: 500px; width: 90%; padding: 32px;">
                <div id="v3-student-actions-content" style="display: flex; flex-direction: column; gap: 12px;"></div>
                <button class="btn btn-glass" style="width: 100%; margin-top: 16px;" onclick="App.closeStudentActions()">إغلاق</button>
            </div>
        </div>

        <div id="confirm-delete-dialog" class="md-dialog-overlay">
            <div class="md-dialog glass-panel" style="max-width: 400px; width: 90%; padding: 32px; text-align: center;">
                <h2 class="m3-headline-medium">تأكيد الحذف</h2>
                <p id="v3-delete-msg">هل أنت متأكد؟</p>
                <div style="display: flex; justify-content: center; gap: 16px; margin-top: 24px;">
                    <button class="btn btn-glass" onclick="App.closeConfirmDelete()">إلغاء</button>
                    <button class="btn btn-primary" style="background: var(--error);" onclick="App.executeDelete()">حذف</button>
                </div>
            </div>
        </div>

        <div id="add-coupon-dialog" class="md-dialog-overlay">
            <div class="md-dialog glass-panel" style="max-width: 450px; width: 90%; padding: 40px;">
                <h2 class="m3-headline-large" style="margin-bottom: 24px;">توليد كود جديد</h2>
                <div class="input-field" style="margin-bottom: 20px;">
                    <label style="color: var(--primary); font-size: 14px;">كود مخصص (اختياري)</label>
                    <input type="text" id="v3-coupon-code" placeholder="8 خانات..." style="text-transform: uppercase;">
                </div>
                <div class="input-field">
                    <label style="color: var(--primary); font-size: 14px;">مدة الاشتراك</label>
                    <select id="v3-coupon-duration" style="background: rgba(0,0,0,0.4); color: white; border: 1px solid var(--glass-border); padding: 12px; border-radius: 8px; width: 100%;">
                        <option value="1h">ساعة واحدة</option>
                        <option value="1m">شهر واحد</option>
                        <option value="6m">6 أشهر</option>
                        <option value="1y">سنة كاملة</option>
                    </select>
                </div>
                <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 32px;">
                    <button class="btn btn-glass" onclick="App.closeAddCoupon()">إلغاء</button>
                    <button class="btn btn-primary" onclick="App.confirmAddCoupon()">توليد الكود</button>
                </div>
            </div>
        </div>

        <div id="session-alert-dialog" class="md-dialog-overlay">
            <div class="md-dialog glass-panel" style="max-width: 400px; width: 90%; padding: 32px; text-align: center;">
                <h2 class="m3-headline-medium" style="color: var(--primary);">تنبيه أمني</h2>
                <p>حسابك في خطر. تم تسجيل الدخول من جهاز آخر.</p>
                <button class="btn btn-primary" onclick="window.location.reload()">فهمت</button>
            </div>
        </div>
    `;
    }
};

window.UI = UI;

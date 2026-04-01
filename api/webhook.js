/**
 * Doma AI Bot - Rebuilt from scratch (v3.0.0)
 * Optimized for Vercel Serverless & Supabase
 */
import { createClient } from '@supabase/supabase-js';

// --- CONFIGURATION ---
const BOT_TOKEN = '8598472216:AAE7gQmUpaWPeEgq7ZFlnTGuzedGUAQfFoU';
const SUPER_ADMIN = '682572594';
const SUPABASE_URL = 'https://lakgdcsytownoiyrvliq.supabase.co';
const SUPABASE_KEY = atob('c2JfcHVibGlzaGFibGVfT2IxUjF0Ql9TV3ctcDBWeUh6R3RKQV9mbjJCREthdQ==');
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const PERMISSIONS = {
    stats: '📊 إحصائيات',
    broadcast: '📢 إذاعة تليجرام',
    site_ann: '📢 إعلان الموقع',
    lessons: '📚 إدارة الدروس',
    students: '👥 إدارة الطلاب',
    codes: '🎫 الأكواد'
};

// --- CORE UTILITIES ---

async function tg(method, payload) {
    try {
        const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        return await response.json();
    } catch (e) {
        console.error(`TG API ERROR [${method}]:`, e);
        return { ok: false, error: e.message };
    }
}

async function getBotConfig() {
    try {
        const { data } = await supabase.from('users').select('password').eq('username', 'DOMA_AI_BOT').maybeSingle();
        return data?.password ? JSON.parse(data.password) : { admins: {}, announcement: {}, all_users: [], names: {}, sessions: {} };
    } catch (e) {
        return { admins: {}, announcement: {}, all_users: [], names: {}, sessions: {} };
    }
}

async function saveBotConfig(config) {
    const jsonStr = JSON.stringify(config);
    const { data: botUser } = await supabase.from('users').select('id').eq('username', 'DOMA_AI_BOT').maybeSingle();
    if (botUser) {
        await supabase.from('users').update({ password: jsonStr }).eq('id', botUser.id);
    } else {
        await supabase.from('users').insert([{ username: 'DOMA_AI_BOT', password: jsonStr, role: 'system' }]);
    }
}

async function getState(cid) {
    const config = await getBotConfig();
    return config.sessions?.[cid?.toString()] || {};
}

async function updateState(cid, newState) {
    const config = await getBotConfig();
    if (!config.sessions) config.sessions = {};
    config.sessions[cid.toString()] = { ...(config.sessions[cid.toString()] || {}), ...newState };
    await saveBotConfig(config);
}

async function clearState(cid) {
    const config = await getBotConfig();
    if (config.sessions?.[cid.toString()]) {
        delete config.sessions[cid.toString()];
        await saveBotConfig(config);
    }
}

function hasPermission(userId, perm, admins) {
    const uid = userId?.toString();
    if (uid === SUPER_ADMIN) return true;
    const userPerms = admins[uid] || [];
    return userPerms.includes(perm);
}

// --- UI COMPONENTS ---

const getAdminKeyboard = (userId, admins) => {
    const buttons = [];
    const uid = userId?.toString();
    
    if (hasPermission(uid, 'stats', admins)) buttons.push({ text: '📊 إحصائيات المنصة' });
    if (hasPermission(uid, 'broadcast', admins)) buttons.push({ text: '📢 إذاعة إعلان' });
    if (hasPermission(uid, 'site_ann', admins)) buttons.push({ text: '📢 إعلان الموقع' });
    
    if (hasPermission(uid, 'lessons', admins)) {
        buttons.push({ text: '📚 إدارة الدروس' });
        buttons.push({ text: '➕ إضافة درس' });
        buttons.push({ text: '🔍 بحث عن درس' });
    }
    
    if (hasPermission(uid, 'students', admins)) {
        buttons.push({ text: '👥 إدارة الطلاب' });
        buttons.push({ text: '➕ إضافة طالب' });
        buttons.push({ text: '🔍 بحث عن طالب' });
    }
    
    if (hasPermission(uid, 'codes', admins)) {
        buttons.push({ text: '🎫 توليد الأكواد' });
        buttons.push({ text: '🏷️ عرض الأكواد' });
    }
    
    if (uid === SUPER_ADMIN) buttons.push({ text: '⚙️ إعدادات الإدارة' });
    
    buttons.push({ text: '❓ مساعدة' });

    // Chunk layout: 2 per row
    const keyboard = [];
    for (let i = 0; i < buttons.length; i += 2) {
        keyboard.push(buttons.slice(i, i + 2));
    }
    return keyboard;
};

const getStudentKeyboard = () => [[{ text: '✉️ تواصل مع الإدارة' }]];

const getBackKeyboard = () => [[{ text: '🔙 رجوع' }]];

// --- MESSAGE HANDLERS ---

async function sendMsg(cid, text, keyboard = null, isInline = false) {
    const payload = {
        chat_id: cid,
        text,
        parse_mode: 'HTML',
        reply_markup: keyboard ? (isInline ? { inline_keyboard: keyboard } : { keyboard, resize_keyboard: true }) : { remove_keyboard: true }
    };
    return await tg('sendMessage', payload);
}

// --- LOGIC HANDLERS ---

async function handleAdmin(cid, text, state, config) {
    const admins = config.admins || {};
    
    // Main Commands
    if (text === '/start' || text === '🏠 الرئيسية' || text === '🔙 العودة للقائمة الرئيسية') {
        await clearState(cid);
        return await sendMsg(cid, "🏠 <b>لوحة تحكم Doma AI</b>\nأهلاً بك يا أدمن. اختر من الخيارات أدناه:", getAdminKeyboard(cid, admins));
    }

    if (text === '📊 إحصائيات المنصة' && hasPermission(cid, 'stats', admins)) {
        const [{ count: userCount, data: userData }, { count: lessonCount }, { count: codeCount }] = await Promise.all([
            supabase.from('users').select('*', { count: 'exact' }).neq('role', 'system'),
            supabase.from('lessons').select('*', { count: 'exact', head: true }),
            supabase.from('coupons').select('*', { count: 'exact', head: true })
        ]);
        
        const now = Date.now();
        const online = (userData || []).filter(u => u.last_active && (now - new Date(u.last_active).getTime() < 180000)).length;
        const active = (userData || []).filter(u => u.status === 'active' && (!u.expiry_date || new Date(u.expiry_date) > now)).length;
        const expired = (userData || []).filter(u => ['active', 'pending'].includes(u.status) && u.expiry_date && new Date(u.expiry_date) <= now).length;
        const banned = (userData || []).filter(u => u.status === 'banned').length;

        const msg = `📊 <b>إحصائيات المنصة:</b>\n\n👥 الإجمالي: ${userCount}\n🟢 نشط: ${active}\n⏳ منتهية: ${expired}\n🔴 محظور: ${banned}\n🌐 متصل الآن: ${online}\n📚 الدروس: ${lessonCount}\n🎫 الأكواد: ${codeCount}`;
        const kb = [[{ text: '⏳ عرض المنتهيين' }], [{ text: '🔙 رجوع' }]];
        return await sendMsg(cid, msg, kb);
    }

    if (text === '⏳ عرض المنتهيين' && hasPermission(cid, 'stats', admins)) {
        const { data: users } = await supabase.from('users').select('*').neq('role', 'system');
        const now = Date.now();
        const expired = (users || []).filter(u => ['active', 'pending'].includes(u.status) && u.expiry_date && new Date(u.expiry_date) <= now);
        if (!expired.length) return await sendMsg(cid, "✅ لا يوجد طلاب منتهية اشتراكاتهم حالياً.", getAdminKeyboard(cid, admins));
        let msg = `⏳ <b>قائمة المنتهيين (${expired.length}):</b>\n\n`;
        const kb = expired.slice(0, 15).map(u => [{ text: `👤 🔴 ${u.username}`, callback_data: `st:${u.id}` }]);
        kb.push([{ text: '🔙 رجوع' }]);
        return await sendMsg(cid, msg, kb, true);
    }

    if (text === '📢 إذاعة إعلان' && hasPermission(cid, 'broadcast', admins)) {
        await updateState(cid, { action: 'awaiting_broadcast' });
        return await sendMsg(cid, "📢 <b>إرسال إذاعة:</b>\nأرسل الرسالة التي تريد إرسالها لجميع الطلاب:", [[{ text: '🔙 إلغاء' }]]);
    }

    if (text === '📢 إعلان الموقع' && hasPermission(cid, 'site_ann', admins)) {
        const kb = [[{ text: '📝 تعديل النص' }, { text: '🔗 تعديل الرابط' }], [{ text: '🗑️ حذف الإعلان' }], [{ text: '🔙 رجوع' }]];
        return await sendMsg(cid, "📢 <b>إعدادات شريط الموقع:</b>", kb);
    }

    if (text === '📝 تعديل النص' && hasPermission(cid, 'site_ann', admins)) {
        await updateState(cid, { action: 'site_ann_text' });
        return await sendMsg(cid, "📝 أرسل <b>نص الإعلان</b> الجديد المكتوب في شريط الموقع:", [[{ text: '🔙 رجوع' }]]);
    }
    
    if (text === '🔗 تعديل الرابط' && hasPermission(cid, 'site_ann', admins)) {
        await updateState(cid, { action: 'site_ann_url' });
        return await sendMsg(cid, "🔗 أرسل <b>رابط الزر</b> الجديد:", [[{ text: '🔙 رجوع' }]]);
    }

    if (text === '🗑️ حذف الإعلان' && hasPermission(cid, 'site_ann', admins)) {
        await updateSiteAnnouncement({ text: '', buttonText: '', buttonUrl: '' });
        return await sendMsg(cid, "✅ تم حذف إعلان الموقع بنجاح.", getAdminKeyboard(cid, admins));
    }
    
    // Lessons
    if (text === '➕ إضافة درس' && hasPermission(cid, 'lessons', admins)) {
        await updateState(cid, { action: 'add_lesson_title' });
        return await sendMsg(cid, "📚 <b>إضافة درس جديد:</b>\nأرسل عنوان الدرس:", getBackKeyboard());
    }

    if (text === '📚 إدارة الدروس' && hasPermission(cid, 'lessons', admins)) {
        return await sendLessonsList(cid, 0);
    }

    // Students
    if (text === '👥 إدارة الطلاب' && hasPermission(cid, 'students', admins)) {
        return await sendStudentsList(cid, 0);
    }
    
    if (text === '🔍 بحث عن درس' && hasPermission(cid, 'lessons', admins)) {
        await updateState(cid, { action: 'search_lesson' });
        return await sendMsg(cid, "🔍 <b>البحث عن درس:</b>\nأرسل عنوان الدرس للبحث:", getBackKeyboard());
    }

    if (text === '➕ إضافة طالب' && hasPermission(cid, 'students', admins)) {
        await updateState(cid, { action: 'add_student_name' });
        return await sendMsg(cid, "👤 <b>إضافة طالب جديد:</b>\nأرسل اسم المستخدم المفضل للطالب:", getBackKeyboard());
    }

    // Codes
    if (text === '🎫 توليد الأكواد' && hasPermission(cid, 'codes', admins)) {
        const kb = [
            [{ text: '🎫 كود ساعة', callback_data: 'gen:1h' }, { text: '🎫 كود يوم', callback_data: 'gen:1d' }],
            [{ text: '🎫 كود شهر', callback_data: 'gen:30d' }, { text: '🎫 كود سنة', callback_data: 'gen:365d' }]
        ];
        return await sendMsg(cid, "🎫 <b>توليد أكواد تفعيل:</b>\nاختر المدة المطلوبة:", kb, true);
    }

    if (text === '🏷️ عرض الأكواد' && hasPermission(cid, 'codes', admins)) {
        const { data: codes } = await supabase.from('coupons').select('*').order('created_at', { ascending: false }).limit(20);
        if (!codes?.length) return await sendMsg(cid, "❌ لا توجد أكواد حالياً.", getAdminKeyboard(cid, admins));
        let msg = "🏷️ <b>أحدث 20 كود:</b>\n\n";
        codes.forEach(c => msg += `• <code>${c.code}</code> (${c.duration}${c.type === 'hours' ? 'س' : 'ي'})\n`);
        return await sendMsg(cid, msg, getAdminKeyboard(cid, admins));
    }

    // Super Admin Config
    if (text === '⚙️ إعدادات الإدارة' && cid.toString() === SUPER_ADMIN) {
        await updateState(cid, { action: 'admin_settings' });
        const kb = [[{ text: '➕ إضافة مسؤول' }], [{ text: '📋 قائمة المسؤولين' }], [{ text: '🔙 رجوع' }]];
        return await sendMsg(cid, "⚙️ <b>إعدادات الإدارة العليا:</b>", kb);
    }

    if (text === '➕ إضافة مسؤول' && cid.toString() === SUPER_ADMIN) {
        await updateState(cid, { action: 'add_admin_id' });
        return await sendMsg(cid, "👤 أرسل <b>Telegram ID</b> للشخص المراد إضافته:", getBackKeyboard());
    }

    if (text === '📋 قائمة المسؤولين' && cid.toString() === SUPER_ADMIN) {
        const config = await getBotConfig();
        const names = config.names || {};
        const staff = Object.keys(config.admins || {});
        let msg = "📋 <b>قائمة المسؤولين:</b>\n\n";
        const kb = staff.map(id => [{ text: `⚙️ ${names[id] || id}`, callback_data: `edit_adm:${id}` }]);
        kb.push([{ text: '🔙 رجوع' }]);
        return await sendMsg(cid, msg, kb, true);
    }

    // State Handling Logic
    if (state.action) {
        switch (state.action) {
            case 'awaiting_broadcast':
                await clearState(cid);
                await sendMsg(cid, "⏳ جاري الإذاعة... قد يستغرق هذا وقتاً.");
                const count = await doBroadcast(`📢 <b>إعلان جديد:</b>\n\n${text}`, config.all_users || []);
                return await sendMsg(cid, `✅ تم الإرسال بنجاح لـ <b>${count}</b> مستخدم.`, getAdminKeyboard(cid, admins));
            
            case 'add_lesson_title':
                await updateState(cid, { action: 'add_lesson_url', temp_data: { ...(state.temp_data || {}), title: text } });
                return await sendMsg(cid, `✅ العنوان: ${text}\nأرسل الآن <b>رابط الفيديو:</b>`, getBackKeyboard());
            
            case 'add_lesson_url':
                const lessonData = { ...(state.temp_data || {}), url: text, created_at: new Date().toISOString() };
                await supabase.from('lessons').insert([lessonData]);
                await clearState(cid);
                await notifyAdmins(`🆕 <b>تم إضافة درس جديد:</b>\n📖 ${lessonData.title}`);
                return await sendMsg(cid, "✅ تم إضافة الدرس بنجاح!", getAdminKeyboard(cid, admins));
                
            case 'search_student':
                const { data: users } = await supabase.from('users').select('*').ilike('username', `%${text}%`).limit(10);
                if (!users?.length) return await sendMsg(cid, "❌ لم يتم العثور على نتائج.", getAdminKeyboard(cid, admins));
                const ik_st = users.map(u => [{ text: `👤 ${u.username}`, callback_data: `st:${u.id}` }]);
                return await sendMsg(cid, `🔍 <b>نتائج البحث للـ "${text}":</b>`, ik_st, true);

            case 'search_lesson':
                const { data: lessons } = await supabase.from('lessons').select('*').ilike('title', `%${text}%`).limit(10);
                if (!lessons?.length) return await sendMsg(cid, "❌ لم يتم العثور على نتائج.", getAdminKeyboard(cid, admins));
                const ik_ls = lessons.map(l => [{ text: `📖 ${l.title}`, callback_data: `ls:${l.id}` }]);
                return await sendMsg(cid, `🔍 <b>نتائج البحث للـ "${text}":</b>`, ik_ls, true);

            case 'add_student_name':
                await updateState(cid, { action: 'add_student_pass', temp_data: { ...(state.temp_data || {}), username: text.toLowerCase() } });
                return await sendMsg(cid, `✅ الاسم: ${text}\nأرسل الآن <b>كلمة المرور</b> للطالب:`, getBackKeyboard());

            case 'add_student_pass':
                const newStudent = { 
                    username: state.temp_data.username, 
                    password: text, 
                    role: 'student', 
                    status: 'active',
                    expiry_date: new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)).toISOString() // Default 30 days
                };
                await supabase.from('users').insert([newStudent]);
                await clearState(cid);
                return await sendMsg(cid, `✅ تم إضافة الطالب <b>${newStudent.username}</b> بنجاح بمدة 30 يوم.`, getAdminKeyboard(cid, admins));

            case 'site_ann_text':
                await updateState(cid, { action: 'site_ann_btn_text', temp_data: { ...(state.temp_data || {}), text } });
                return await sendMsg(cid, "🔘 أرسل <b>نص الزر</b> (مثال: اشترك الآن) أو أرسل 'لا يوجد':", getBackKeyboard());
            
            case 'site_ann_btn_text':
                const btnText = text === 'لا يوجد' ? '' : text;
                await updateState(cid, { action: 'site_ann_finish', temp_data: { ...(state.temp_data || {}), buttonText: btnText } });
                return await sendMsg(cid, "🔗 أرسل <b>رابط الزر</b> (مثال: https://...) أو أرسل 'لا يوجد':", getBackKeyboard());

            case 'site_ann_finish':
                const btnUrl = text === 'لا يوجد' ? '' : text;
                const finalAnn = { ...state.temp_data, buttonUrl: btnUrl };
                await updateSiteAnnouncement(finalAnn);
                await clearState(cid);
                return await sendMsg(cid, "✅ تم تحديث إعلان الموقع بنجاح!", getAdminKeyboard(cid, admins));

            case 'add_admin_id':
                const newAdminId = text.trim();
                const newConfig = await getBotConfig();
                if (!newConfig.admins) newConfig.admins = {};
                newConfig.admins[newAdminId] = [];
                await saveBotConfig(newConfig);
                await clearState(cid);
                return await sendMsg(cid, `✅ تمت إضافة <b>${newAdminId}</b> كمسؤول بنجاح.`, getAdminKeyboard(cid, admins));

            case 'edit_user_pass':
                await supabase.from('users').update({ password: text }).eq('id', state.target_id);
                await clearState(cid);
                return await sendMsg(cid, `✅ تم تغيير كلمة المرور بنجاح.`, getAdminKeyboard(cid, admins));

            case 'edit_user_dur':
                const days = parseInt(text);
                if (isNaN(days)) return await sendMsg(cid, "❌ يرجى إرسال رقم صحيح للأيام.");
                const expiry = new Date(Date.now() + (days * 24 * 60 * 60 * 1000)).toISOString();
                await supabase.from('users').update({ expiry_date: expiry, status: 'active' }).eq('id', state.target_id);
                await clearState(cid);
                return await sendMsg(cid, `✅ تم تمديد الاشتراك لـ <b>${days}</b> يوم.`, getAdminKeyboard(cid, admins));

            case 'rep_st':
                await tg('sendMessage', { chat_id: state.target_id, text: `💬 <b>رد من الإدارة:</b>\n\n${text}`, parse_mode: 'HTML' });
                await clearState(cid);
                return await sendMsg(cid, "✅ تم إرسال الرد للمستخدم بنجاح.", getAdminKeyboard(cid, admins));
        }
    }

    if (text === '🔙 رجوع' || text === '🔙 إلغاء') {
        await clearState(cid);
        return await sendMsg(cid, "🏠 العودة للقائمة الرئيسية", getAdminKeyboard(cid, admins));
    }


    // Default Fallback
    return await sendMsg(cid, "❓ أمر غير معروف. استخدم القائمة للتحكم.", getAdminKeyboard(cid, admins));
}

async function handleStudent(cid, text, state, config) {
    if (text === '/start' || text === '🔙 إلغاء') {
        await clearState(cid);
        return await sendMsg(cid, "👋 <b>أهلاً بك في منصة Doma AI</b>\nيسعدنا تواصلك معنا.", getStudentKeyboard());
    }

    if (text === '✉️ تواصل مع الإدارة') {
        await updateState(cid, { action: 'contact_admin' });
        return await sendMsg(cid, "✍️ أرسل رسالتك الآن وسيرد عليك أحد المشرفين قريباً:", [[{ text: '🔙 إلغاء' }]]);
    }

    if (state.action === 'contact_admin') {
        await clearState(cid);
        // Notify Admins
        await notifyAdmins(`📨 <b>رسالة من طالب:</b>\n🆔 <code>${cid}</code>\n📝 ${text}`, [[{ text: '🙋‍♂️ رد على الطالب', callback_data: `rep:${cid}` }]]);
        return await sendMsg(cid, "✅ تم إرسال رسالتك للإدارة بنجاح.", getStudentKeyboard());
    }

    // Default Help
    return await sendMsg(cid, "👋 أهلاً بك! يمكنك الربط بحساب الموقع عن طريق إرسال <b>اسم المستخدم</b> الخاص بك هنا.", getStudentKeyboard());
}

// --- HELPER LOGIC ---

async function sendStudentsList(cid, page) {
    const { data: users } = await supabase.from('users').select('*').neq('role', 'system').order('created_at', { ascending: false });
    const pageSize = 10;
    const start = page * pageSize;
    const slice = users.slice(start, start + pageSize);
    
    if (!slice.length) return await sendMsg(cid, "❌ لا يوجد طلاب.");
    
    const kb = slice.map(u => [{ text: `👤 ${u.username}`, callback_data: `st:${u.id}` }]);
    const nav = [];
    if (page > 0) nav.push({ text: '⬅️ السابق', callback_data: `pg_st:${page - 1}` });
    if (start + pageSize < users.length) nav.push({ text: 'التالي ➡️', callback_data: `pg_st:${page + 1}` });
    if (nav.length) kb.push(nav);
    
    return await sendMsg(cid, `👥 <b>قائمة الطلاب (صفحة ${page + 1}):</b>`, kb, true);
}

async function sendLessonsList(cid, page) {
    const { data: lessons } = await supabase.from('lessons').select('*').order('created_at', { ascending: false });
    const pageSize = 10;
    const start = page * pageSize;
    const slice = lessons.slice(start, start + pageSize);
    
    const kb = slice.map(l => [{ text: `📖 ${l.title}`, callback_data: `ls:${l.id}` }]);
    const nav = [];
    if (page > 0) nav.push({ text: '⬅️ السابق', callback_data: `pg_ls:${page - 1}` });
    if (start + pageSize < lessons.length) nav.push({ text: 'التالي ➡️', callback_data: `pg_ls:${page + 1}` });
    if (nav.length) kb.push(nav);
    
    return await sendMsg(cid, `📚 <b>قائمة الدروس (صفحة ${page + 1}):</b>`, kb, true);
}

async function doBroadcast(text, users) {
    let success = 0;
    for (const uid of users) {
        try {
            const res = await tg('sendMessage', { chat_id: uid, text, parse_mode: 'HTML' });
            if (res.ok) success++;
        } catch (e) {}
    }
    return success;
}

async function notifyAdmins(text, keyboard = null) {
    const config = await getBotConfig();
    const admins = [SUPER_ADMIN, ...Object.keys(config.admins || {})];
    for (const aid of admins) {
        await tg('sendMessage', { chat_id: aid, text, parse_mode: 'HTML', reply_markup: keyboard ? { inline_keyboard: keyboard } : undefined });
    }
}

async function updateSiteAnnouncement(obj) {
    const jsonStr = JSON.stringify(obj);
    const { data: ann } = await supabase.from('users').select('id').eq('username', 'ANNOUNCEMENT_DATA').maybeSingle();
    if (ann) {
        await supabase.from('users').update({ password: jsonStr }).eq('id', ann.id);
    } else {
        await supabase.from('users').insert([{ username: 'ANNOUNCEMENT_DATA', password: jsonStr, role: 'system', status: 'active', is_active: true }]);
    }
}

async function handleCallback(cid, data, config) {
    const admins = config.admins || {};
    const isAdmin = (id) => id?.toString() === SUPER_ADMIN || !!admins[id?.toString()];

    if (!isAdmin(cid)) return;

    if (data.startsWith('st:')) {
        const id = data.split(':')[1];
        const { data: user } = await supabase.from('users').select('*').eq('id', id).single();
        if (!user) return await sendMsg(cid, "❌ الطالب غير موجود.");
        
        await updateState(cid, { target_id: id });
        const icon = user.status === 'banned' ? '🔴' : '🟢';
        const msg = `${icon} <b>بيانات الطالب:</b>\n👤 اليوزر: <code>${user.username}</code>\n🔑 الباسورد: <code>${user.password}</code>\n📅 الانتهاء: ${user.expiry_date ? new Date(user.expiry_date).toLocaleDateString() : 'غير محدد'}`;
        
        const kb = [
            [{ text: '🔑 تغيير الباسورد', callback_data: `ed_pass:${id}` }, { text: '⏳ تمديد الاشتراك', callback_data: `ed_dur:${id}` }],
            [{ text: user.status === 'banned' ? '✅ رفع الحظر' : '🚫 حظر الطالب', callback_data: `ban:${id}` }, { text: '🗑️ حذف الطالب', callback_data: `del_st:${id}` }],
            [{ text: '🔙 رجوع', callback_data: 'pg_st:0' }]
        ];
        return await sendMsg(cid, msg, kb, true);
    }

    if (data.startsWith('ls:')) {
        const id = data.split(':')[1];
        const { data: lesson } = await supabase.from('lessons').select('*').eq('id', id).single();
        if (!lesson) return;
        
        const kb = [[{ text: '🗑️ حذف الدرس', callback_data: `del_ls:${id}` }], [{ text: '🔙 رجوع', callback_data: 'pg_ls:0' }]];
        return await sendMsg(cid, `📖 <b>${lesson.title}</b>\n🔗 ${lesson.url}`, kb, true);
    }

    if (data.startsWith('gen:')) {
        const dur = data.split(':')[1];
        let d = 1, t = 'days';
        if (dur === '1h') t = 'hours';
        else d = parseInt(dur);

        const code = Math.random().toString(36).substring(2, 10).toUpperCase();
        await supabase.from('coupons').insert([{ code, duration: d, type: t, created_at: new Date().toISOString() }]);
        return await sendMsg(cid, `✅ تم توليد كود جديد:\n<code>${code}</code>\n⏳ ${d} ${t === 'hours' ? 'ساعة' : 'يوم'}`, getAdminKeyboard(cid, admins));
    }

    if (data.startsWith('ed_pass:')) {
        await updateState(cid, { action: 'edit_user_pass', target_id: data.split(':')[1] });
        return await sendMsg(cid, "🔑 أرسل <b>كلمة المرور الجديدة</b> للطالب:", getBackKeyboard());
    }

    if (data.startsWith('ed_dur:')) {
        await updateState(cid, { action: 'edit_user_dur', target_id: data.split(':')[1] });
        return await sendMsg(cid, "⏳ أرسل <b>عدد الأيام</b> للتمديد (مثال: 30):", getBackKeyboard());
    }

    if (data.startsWith('ban:')) {
        const id = data.split(':')[1];
        const { data: u } = await supabase.from('users').select('status').eq('id', id).single();
        const newStatus = u.status === 'banned' ? 'active' : 'banned';
        await supabase.from('users').update({ status: newStatus }).eq('id', id);
        return await handleCallback(cid, `st:${id}`, config);
    }

    if (data.startsWith('del_st:')) {
        await supabase.from('users').delete().eq('id', data.split(':')[1]);
        return await sendMsg(cid, "✅ تم حذف الطالب نهائياً.", getAdminKeyboard(cid, admins));
    }

    if (data.startsWith('del_ls:')) {
        await supabase.from('lessons').delete().eq('id', data.split(':')[1]);
        return await sendMsg(cid, "✅ تم حذف الدرس بنجاح.", getAdminKeyboard(cid, admins));
    }

    if (data.startsWith('pg_st:')) await sendStudentsList(cid, parseInt(data.split(':')[1]));
    if (data.startsWith('pg_ls:')) await sendLessonsList(cid, parseInt(data.split(':')[1]));

    if (data.startsWith('act:')) {
        const [, userId, dur] = data.split(':');
        let days = 1;
        if (dur === '1h') days = 0.04; // ~1 hour
        else if (dur === '30d') days = 30;
        else if (dur === '365d') days = 365;
        
        const expiry = new Date(Date.now() + (days * 24 * 60 * 60 * 1000)).toISOString();
        await supabase.from('users').update({ expiry_date: expiry, status: 'active' }).eq('id', userId);
        return await sendMsg(cid, `✅ تم تفعيل الاشتراك بنجاح.`);
    }

    if (data.startsWith('rep:')) {
        const userId = data.split(':')[1];
        await updateState(cid, { action: 'rep_st', target_id: userId });
        return await sendMsg(cid, `✍️ أرسل رسالتك للرد على الطالب (ID: <code>${userId}</code>):`, getBackKeyboard());
    }

    if (data.startsWith('edit_adm:')) {
        if (cid.toString() !== SUPER_ADMIN) return;
        const targetId = data.split(':')[1];
        await updateState(cid, { target_admin: targetId });
        const perms = config.admins[targetId] || [];
        let msg = `⚙️ <b>صلاحيات المسؤول:</b> (<code>${targetId}</code>)\nاختر لتفعيل/تعطيل:`;
        const kb = Object.keys(PERMISSIONS).map(pk => [{ 
            text: `${perms.includes(pk) ? '✅' : '❌'} ${PERMISSIONS[pk]}`, 
            callback_data: `tog_adm:${targetId}:${pk}` 
        }]);
        kb.push([{ text: '🗑️ حذف المسؤول', callback_data: `rem_adm:${targetId}` }]);
        kb.push([{ text: '🔙 رجوع', callback_data: 'admin_list' }]);
        return await sendMsg(cid, msg, kb, true);
    }

    if (data.startsWith('tog_adm:')) {
        if (cid.toString() !== SUPER_ADMIN) return;
        const [, targetId, pk] = data.split(':');
        const currentConfig = await getBotConfig();
        const perms = currentConfig.admins[targetId] || [];
        currentConfig.admins[targetId] = perms.includes(pk) ? perms.filter(p => p !== pk) : [...perms, pk];
        await saveBotConfig(currentConfig);
        return await handleCallback(cid, `edit_adm:${targetId}`, currentConfig);
    }

    if (data === 'admin_list') {
        const currentConfig = await getBotConfig();
        const staff = Object.keys(currentConfig.admins || {});
        const kb = staff.map(id => [{ text: `⚙️ ${id}`, callback_data: `edit_adm:${id}` }]);
        kb.push([{ text: '🔙 رجوع' }]);
        return await sendMsg(cid, "📋 <b>قائمة المسؤولين:</b>", kb, true);
    }
}

// --- VERCEL HANDLER ---

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(200).send('Bot is ready.');
    
    const body = req.body;
    if (!body) return res.status(200).send('OK');

    try {
        const config = await getBotConfig();
        const admins = config.admins || {};
        const isAdmin = (id) => id?.toString() === SUPER_ADMIN || !!admins[id?.toString()];

        if (body.message) {
            const cid = body.message.chat.id;
            const text = body.message.text;
            const state = config.sessions?.[cid.toString()] || {};

            // Track user
            if (!config.all_users) config.all_users = [];
            const isNew = !config.all_users.map(String).includes(cid.toString());
            if (isNew) {
                config.all_users.push(cid);
                await saveBotConfig(config);
                const uname = body.message.from.first_name || body.message.from.username || "مجهول";
                const ik = [[{ text: '🕒 ساعة', callback_data: `act:${cid}:1h` }, { text: '📅 يوم', callback_data: `act:${cid}:1d` }], [{ text: '📅 شهر', callback_data: `act:${cid}:30d` }]];
                await notifyAdmins(`🔔 <b>مستخدم جديد انضم للبوت!</b>\n👤 الاسم: ${uname}\n🆔 المعرف: <code>${cid}</code>`, ik);
            }

            // Student Account Linking (if sending a word)
            if (!isAdmin(cid) && text && text.length > 2 && !text.includes(' ')) {
                const { data: user } = await supabase.from('users').select('id, username').eq('username', text.toLowerCase()).maybeSingle();
                if (user) {
                    await supabase.from('users').update({ telegram_id: cid.toString() }).eq('id', user.id);
                    return await sendMsg(cid, `✅ تم ربط حسابك بنجاح يا <b>${user.username}</b>!`);
                }
            }

            if (isAdmin(cid)) {
                await handleAdmin(cid, text, state, config);
            } else {
                await handleStudent(cid, text, state, config);
            }
        } else if (body.callback_query) {
            const cid = body.callback_query.from.id;
            const data = body.callback_query.data;
            await tg('answerCallbackQuery', { callback_query_id: body.callback_query.id });
            await handleCallback(cid, data, config);
        }

    } catch (error) {
        console.error("WEBHOOK ERROR:", error);
    }

    return res.status(200).send('OK');
}

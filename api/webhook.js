import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = atob('aHR0cHM6Ly9sYWtnZGNzeXRvd25vaXlydmxpcS5zdXBhYmFzZS5jbw==');
const SUPABASE_KEY = atob('c2JfcHVibGlzaGFibGVfT2IxUjF0Ql9TV3ctcDBWeUh6R3RKQV9mbjJCREthdQ==');
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const BOT_TOKEN = '8598472216:AAE7gQmUpaWPeEgq7ZFlnTGuzedGUAQfFoU';
const SUPER_ADMIN = '682572594';
const PERMISSIONS_MAP = {
    stats: '📊 إحصائيات',
    broadcast: '📢 إذاعة تليجرام',
    site_ann: '📢 إعلان الموقع',
    lessons: '📚 إدارة الدروس',
    students: '👥 إدارة الطلاب',
    codes: '🎫 الأكواد',
};

let CACHED_ADMINS_PERMS = {}; // { ID: [perms] }

async function fetchAdmins() {
    try {
        const { data } = await supabase.from('users').select('password').eq('username', 'ADMIN_CONFIG_LIST_V2').single();
        if (data && data.password) {
            CACHED_ADMINS_PERMS = JSON.parse(data.password);
        } else {
            // الهجرة من النسخة القديمة إذا وجدت
            const old = await supabase.from('users').select('password').eq('username', 'ADMIN_CONFIG_LIST').single();
            if (old.data && old.data.password) {
                const list = JSON.parse(old.data.password);
                list.forEach(id => { CACHED_ADMINS_PERMS[id.toString()] = Object.keys(PERMISSIONS_MAP); });
                await saveAdmins(CACHED_ADMINS_PERMS);
            }
        }
    } catch (e) {
        CACHED_ADMINS_PERMS = {};
    }
    return CACHED_ADMINS_PERMS;
}

async function saveAdmins(permsMap) {
    const jsonStr = JSON.stringify(permsMap);
    const { data } = await supabase.from('users').select('id').eq('username', 'ADMIN_CONFIG_LIST_V2').single();
    if (data) {
        await supabase.from('users').update({ password: jsonStr }).eq('id', data.id);
    } else {
        await supabase.from('users').insert([{ username: 'ADMIN_CONFIG_LIST_V2', password: jsonStr, role: 'admin' }]);
    }
    CACHED_ADMINS_PERMS = permsMap;
}

function isAdmin(id) {
    return id?.toString() === SUPER_ADMIN || !!CACHED_ADMINS_PERMS[id?.toString()];
}

function hasPerm(id, perm) {
    if (id?.toString() === SUPER_ADMIN) return true;
    const perms = CACHED_ADMINS_PERMS[id?.toString()] || [];
    return perms.includes(perm);
}

async function getState() {
    const { data } = await supabase.from('users').select('password').eq('username', 'BOT_STATE_ADMIN').single();
    if (data && data.password) {
        try { return JSON.parse(data.password); } catch (e) { return {}; }
    }
    return {};
}

async function saveState(state) {
    try {
        const jsonStr = JSON.stringify(state);
        const { data } = await supabase.from('users').select('id').eq('username', 'BOT_STATE_ADMIN').single();
        if (data) {
            const { error } = await supabase.from('users').update({ password: jsonStr }).eq('username', 'BOT_STATE_ADMIN');
            if (error) await sendMsg(`⚠️ Error updating state: ${error.message}`);
        } else {
            const { error } = await supabase.from('users').insert([{ username: 'BOT_STATE_ADMIN', password: jsonStr, role: 'admin', status: 'active', is_active: true, created_at: new Date().toISOString() }]);
            if (error) await sendMsg(`⚠️ Error inserting state: ${error.message}`);
        }
    } catch (e) {
        await sendMsg(`⚠️ Exception in saveState: ${e.message}`);
    }
}
async function clearState() { await saveState({}); }

async function tg(method, payload) {
    try {
        const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        return await response.json();
    } catch (e) {
        console.error(e);
        return { ok: false, error: e.message };
    }
}

const mainKb = (chatId) => {
    const kb = [];
    const id = chatId?.toString();
    
    const row1 = [];
    if (hasPerm(id, 'stats')) row1.push({ text: '📊 إحصائيات المنصة' });
    if (hasPerm(id, 'broadcast')) row1.push({ text: '📢 إذاعة إعلان' });
    if (row1.length) kb.push(row1);

    const row2 = [];
    if (hasPerm(id, 'site_ann')) row2.push({ text: '📢 إعلان الموقع' });
    if (hasPerm(id, 'lessons')) row2.push({ text: '➕ إضافة درس' });
    if (row2.length) kb.push(row2);

    const row3 = [];
    if (hasPerm(id, 'students')) row3.push({ text: '👥 إدارة الطلاب' });
    if (hasPerm(id, 'lessons')) row3.push({ text: '📚 إدارة الدروس' });
    if (row3.length) kb.push(row3);

    const row4 = [];
    if (hasPerm(id, 'students')) row4.push({ text: '🔍 بحث عن طالب' });
    if (hasPerm(id, 'lessons')) row4.push({ text: '🔍 بحث عن درس' });
    if (row4.length) kb.push(row4);

    const row5 = [];
    if (hasPerm(id, 'codes')) {
        row5.push({ text: "🎫 توليد الأكواد" });
        row5.push({ text: "🏷️ عرض الأكواد" });
    }
    if (row5.length) kb.push(row5);

    const lastRow = [];
    if (hasPerm(id, 'students')) lastRow.push({ text: '➕ إضافة طالب' });
    
    // أضف زر الإعدادات فقط للأدمن الرئيسي
    if (id === SUPER_ADMIN) {
        lastRow.push({ text: '⚙️ إعدادات الإدارة' });
    }
    if (lastRow.length) kb.push(lastRow);
    
    kb.push([{ text: '❓ المساعدة' }]);
    return kb;
};
const codesKb = [
    [{ text: '🎫 كود ساعة' }, { text: '🎫 كود يوم' }],
    [{ text: '🎫 كود 30 يوم' }, { text: '🎫 كود 365 يوم' }],
    [{ text: '🔙 العودة للقائمة الرئيسية' }]
];

async function sendMsg(text, ik = null, kb = null, targetChatId = null) {
    const cid = targetChatId || SUPER_ADMIN;
    const p = { chat_id: cid, text, parse_mode: 'HTML' };
    if (ik) p.reply_markup = { inline_keyboard: ik };
    else if (kb) p.reply_markup = { keyboard: kb, resize_keyboard: true };
    else if (isAdmin(cid)) p.reply_markup = { keyboard: mainKb(cid), resize_keyboard: true };
    await tg('sendMessage', p);
}

async function broadcast(message) {
    const { data: users } = await supabase.from('users').select('telegram_id');
    const ids = Array.from(new Set(users?.map(u => u.telegram_id).filter(id => !!id) || []));
    let count = 0;
    for (const id of ids) {
        try {
            await tg('sendMessage', { chat_id: id, text: message, parse_mode: 'HTML' });
            count++;
        } catch (e) {}
    }
    return count;
}

export default async function handler(req, res) {
    await fetchAdmins();
    
    if (req.method !== 'POST') return res.status(200).send('Doma AI Webhook Vercel Endpoint OK');
    
    const update = req.body;
    if (!update) return res.status(200).send('OK');

    // Handle incoming broadcast from Website
    if (update.action === 'broadcast' && update.secret === BOT_TOKEN) {
        const count = await broadcast(update.message);
        return res.status(200).json({ success: true, count });
    }

    try {
        if (update.message) {
            const userId = update.message.from?.id;
            const chatId = update.message.chat.id;
            if (isAdmin(userId)) {
                await handleMessage(update.message.text, chatId);
            } else {
                await handleStudentMessage(update.message);
            }
        } else if (update.callback_query) {
            const userId = update.callback_query.from?.id;
            const chatId = update.callback_query.message.chat.id;
            if (isAdmin(userId)) {
                await tg('answerCallbackQuery', { callback_query_id: update.callback_query.id });
                await handleCallback(update.callback_query.data, chatId);
            }
        }
    } catch (e) {
        console.error(e);
        await sendMsg(`❌ <b>System Error!</b>\n<pre>${e.message}\n${e.stack}</pre>`);
    }

    res.status(200).send('OK');
}

async function handleStudentMessage(msg) {
    const text = msg.text?.trim();
    if (text === '/start') {
        return sendMsg("👋 <b>أهلاً بك في بوت منصة Doma AI</b>\n\nأرسل اسم المستخدم الخاص بك في الموقع لربط حسابك وتلقي الإشعارات.", null, null, msg.chat.id);
    }
    
    // Attempt to link username
    if (text && text.length > 2) {
        const { data: user } = await supabase.from('users').select('id, username').eq('username', text).single();
        if (user) {
            await supabase.from('users').update({ telegram_id: msg.chat.id.toString() }).eq('id', user.id);
            return sendMsg(`✅ تم ربط حسابك بنجاح يا <b>${user.username}</b>!\nستصلك الآن كافة التحديثات والإعلانات هنا.`, null, null, msg.chat.id);
        }
    }
    return sendMsg("⚠️ يرجى إرسال اسم المستخدم الخاص بك بشكل صحيح لتمكين الإشعارات.", null, null, msg.chat.id);
}

async function handleMessage(text) {
    if (!text) return;
    const input = text.trim();
    if (!input) return;

    if (input === '🔙 العودة للقائمة الرئيسية' || input === '❓ المساعدة' || input === '/start' || input === '/help') {
        await clearState();
        const helpMsg = `👋 <b>دليل استخدام لوحة تحكم Doma Ai</b>

💡 <b>وظائف الأزرار:</b>

📊 <b>إحصائيات المنصة:</b>
ملخص شامل لعدد الطلاب (نشط/منتهي/محظور)، الدروس، الأكواد، والمتصلين الآن.

📢 <b>إذاعة إعلان:</b>
إرسال رسالة تليجرام فورية لكل الطلاب الذين قاموا بربط حساباتهم بالبوت.

📢 <b>إعلان الموقع:</b>
التحكم الكامل في الشريط العلوي بالموقع (تغيير النص، نص الزر، ورابط الزر).

➕ <b>إضافة درس:</b>
إضافة فيديو جديد للمنصة (يدعم يوتيوب، جوجل درايف، وروابط مباشرة).

👥 <b>إدارة الطلاب:</b>
عرض قائمة الطلاب وقبولي طلباتهم وحظر الحسابات أو تغيير كلمات المرور ومدة الاشتراك.

📚 <b>إدارة الدروس:</b>
تعديل بيانات الدروس المرفوعة مسبقاً أو حذفها نهائياً.

🔍 <b>البحث (طلاب/دروس):</b>
العثور بسرعة على أي ملف أو طالب داخل قاعدة البيانات.

🎫 <b>الأكواد:</b>
توليد أكواد تفعيل (من ساعة إلى سنة) لإهدائها للطلاب أو بيعها.

👤 <b>ربط الحساب (للطلاب):</b>
يجب على الطالب إرسال "اسم المستخدم" الخاص به لهذا البوت ليتم ربط حسابه واستلام الإعلانات.`;

        return sendMsg(helpMsg);
    }

    if (input === '📊 إحصائيات المنصة') return handleCallback('stats');
    if (input === '👥 إدارة الطلاب') return sendStudentsList(0);
    if (input === '📚 إدارة الدروس') return sendLessonsList(0);
    if (input === '➕ إضافة طالب') return handleCallback('add_student');
    if (input === '⚙️ إعدادات الإدارة') return handleCallback('admin_settings');
    if (input === '📢 إعلان الموقع') return handleCallback('site_announcement');
    if (input === '➕ إضافة درس') return handleCallback('add_lesson');
    if (input === '📢 إذاعة إعلان') return handleCallback('start_broadcast');
    if (input === '🔍 بحث عن طالب') return handleCallback('search_student');
    if (input === '🔍 بحث عن درس') return handleCallback('search_lesson');
    if (input === '🎫 توليد الأكواد') return sendMsg('🎫 <b>اختر مدة الكود:</b>', null, codesKb);
    if (input === '🏷️ عرض الأكواد') return handleCallback('show_codes');

    if (input.startsWith('🎫 كود')) {
        let dur = '1d';
        if (input.includes('ساعة')) dur = '1h';
        else if (input.includes('365')) dur = '365d';
        else if (input.includes('30')) dur = '30d';
        return handleCallback(`gen_code:${dur}`);
    }

    if (input.startsWith('👤 ')) {
        const uname = input.replace(/^👤\s*[🟢🔴🟡✅]\s*/u, '').trim();
        const { data: users } = await supabase.from('users').select('id, username');
        const f = users?.find(u => u.username.trim().toLowerCase() === uname.toLowerCase());
        if (f) return handleCallback(`student_info:${f.id}`);
        return sendMsg(`❌ الطالب غير موجود: ${uname}`);
    }
    if (input.startsWith('📖 ')) {
        const title = input.replace(/^📖\s*/u, '').trim();
        const { data: lessons } = await supabase.from('lessons').select('id, title');
        const f = lessons?.find(l => l.title.trim().toLowerCase() === title.toLowerCase());
        if (f) return handleCallback(`lesson_info:${f.id}`);
        return sendMsg(`❌ الدرس غير موجود: ${title}`);
    }
    const cmatch = input.match(/([a-zA-Z0-9_\-]+)\s*\(/);
    if (cmatch) return handleCallback(`coupon_info:${cmatch[1]}`);

    const p1 = input.match(/طلاب ص (\d+)/);
    if (p1) return sendStudentsList(parseInt(p1[1]) - 1);
    const p2 = input.match(/دروس ص (\d+)/);
    if (p2) return sendLessonsList(parseInt(p2[1]) - 1);

    // STATE HANDLING
    const state = await getState();
    if (state.action) {
        const action = state.action;

        if (action === 'edit_coupon_text') {
            await clearState();
            const newCode = input.toUpperCase();
            await supabase.from('coupons').update({ code: newCode }).eq('id', state.targetId);
            return sendMsg(`✅ تم تغيير الكود بنجاح!\nالكود الجديد: <code>${newCode}</code>`);
        }

        if (action === 'broadcast_mode') {
            await clearState();
            await sendMsg("⏳ جاري الإذاعة...");
            const count = await broadcast(`📢 <b>إعلان جديد:</b>\n\n${input}`);
            return sendMsg(`✅ تم إرسال الإعلان إلى <b>${count}</b> مستخدم.`);
        }

        if (action === 'add_admin_id') {
            await clearState();
            const newId = input.trim();
            if (!/^\d+$/.test(newId)) return sendMsg("❌ يرجى إرسال معرف (ID) صحيح (أرقام فقط).");
            const permsMap = await fetchAdmins();
            if (permsMap[newId]) return sendMsg("⚠️ هذا المستخدم أدمن بالفعل.");
            permsMap[newId] = []; // يبدأ بدون صلاحيات، قم بتعديلها من لوحة الإدارة
            await saveAdmins(permsMap);
            return sendMsg(`✅ تم إضافة الأدمن بنجاح!\nID: <code>${newId}</code>\n\nقم الآن بتخصيص صلاحياته من قائمة "إدارة الأدمنز".`);
        }

        if (action === 'site_ann_text') {
            state.tempText = input;
            state.action = 'site_ann_btn_text';
            await saveState(state);
            return sendMsg(`📝 النص: <b>${input}</b>\nأرسل <b>نص الزر</b> (مثال: اشترك الآن) أو أرسل "بدون":`);
        }
        if (action === 'site_ann_btn_text') {
            state.tempBtn = input === 'بدون' ? '' : input;
            state.action = 'site_ann_url';
            await saveState(state);
            return sendMsg(`🔘 الزر: <b>${state.tempBtn || 'بدون'}</b>\nأرسل <b>رابط الزر</b> (مثال: https://...) أو "بدون":`);
        }
        if (action === 'site_ann_url') {
            const url = input === 'بدون' ? '' : input;
            const announceObj = { text: state.tempText, buttonText: state.tempBtn, buttonUrl: url };
            await clearState();
            await updateSiteAnnouncement(announceObj);
            await broadcast(`🔔 <b>إعلان جديد في الموقع:</b>\n\n${state.tempText}`);
            return sendMsg("✅ تم تحديث إعلان الموقع وإرسال تنبيه للطلاب!");
        }

        if (action === 'add_user_name') {
            state.tempName = input;
            state.action = 'add_user_pass';
            await saveState(state);
            return sendMsg(`👤 الاسم: <b>${input}</b>\nأرسل <b>كلمة المرور</b>:`);
        }
        if (action === 'add_user_pass') {
            state.tempPass = input;
            state.action = 'add_user_dur';
            await saveState(state);
            const ik = [
                [{ text: '🕒 ساعة', callback_data: `new_user_dur:1h` }, { text: '📅 يوم', callback_data: `new_user_dur:1d` }],
                [{ text: '📅 30 يوم', callback_data: `new_user_dur:30d` }, { text: '📅 سنة', callback_data: `new_user_dur:365d` }]
            ];
            return sendMsg(`✅ تم حفظ البيانات.\nاختر مدة التفعيل المبدئية للطالب:`, ik);
        }
        if (action === 'edit_user_pass') {
            await clearState();
            await supabase.from('users').update({ password: input }).eq('id', state.targetId);
            return sendMsg(`✅ تم تحديث كلمة مرور الطالب إلى:\n<code>${input}</code>`);
        }

        if (action === 'search_student') {
            await clearState();
            const { data: users } = await supabase.from('users').select('*');
            const q = input.toLowerCase();
            const res = (users || []).filter(u => u.role !== 'admin' && (u.username || '').toLowerCase().includes(q));
            if (!res.length) return sendMsg('🔍 لا توجد نتائج.');
            if (res.length === 1) return sendMsg('🔍 تم العثور على طالب واحد:', [[{ text: `🟢 ${res[0].username}`, callback_data: `student_info:${res[0].id}` }]]);
            const ik = res.slice(0, 15).map(u => [{ text: `👤 ${u.username}`, callback_data: `student_info:${u.id}` }]);
            return sendMsg(`🔍 <b>نتائج البحث (${res.length}):</b>`, ik);
        }
        if (action === 'search_lesson') {
            await clearState();
            const q = input.toLowerCase();
            const { data: lessons } = await supabase.from('lessons').select('*');
            const res = (lessons || []).filter(l => (l.title || '').toLowerCase().includes(q) || (l.description || '').toLowerCase().includes(q));
            if (!res.length) return sendMsg('🔍 لا توجد دروس.');
            if (res.length === 1) return sendMsg('🔍 تم العثور على درس واحد:', [[{ text: `📖 ${res[0].title}`, callback_data: `lesson_info:${res[0].id}` }]]);
            const ik = res.slice(0, 15).map(l => [{ text: `📖 ${l.title}`, callback_data: `lesson_info:${l.id}` }]);
            return sendMsg(`🔍 <b>نتائج البحث (${res.length}):</b>`, ik);
        }

        if (action === 'add_lesson_title') {
            state.tempTitle = input;
            state.action = 'add_lesson_url';
            await saveState(state);
            return sendMsg(`📚 العنوان: <b>${input}</b>\nأرسل <b>رابط الدرس</b>:`);
        }
        if (action === 'add_lesson_url') {
            state.tempUrl = input;
            state.action = 'add_lesson_desc';
            await saveState(state);
            return sendMsg(`📝 أرسل <b>الوصف</b> (أو "لا يوجد"):`);
        }
        if (action === 'add_lesson_desc') {
            await clearState();
            const desc = input === 'لا يوجد' ? '' : input;
            await supabase.from('lessons').insert([{ title: state.tempTitle, url: state.tempUrl, description: desc, created_at: new Date().toISOString() }]);
            await broadcast(`📖 <b>درس جديد بانتظارك:</b>\n\nالعنوان: <b>${state.tempTitle}</b>\n${desc ? `الوصف: ${desc}` : ''}`);
            return sendMsg(`✅ تم إضافة الدرس وإرسال تنبيه للطلاب!`);
        }

        if (action === 'edit_lesson_title') {
            if (input !== 'نفسه') state.tempTitle = input;
            state.action = 'edit_lesson_url';
            await saveState(state);
            return sendMsg(`🔗 أرسل <b>الرابط الجديد</b>\n(أو "نفسه"):`);
        }
        if (action === 'edit_lesson_url') {
            if (input !== 'نفسه') state.tempUrl = input;
            state.action = 'edit_lesson_desc';
            await saveState(state);
            return sendMsg(`📝 أرسل <b>الوصف الجديد</b>\n(أو "نفسه"):`);
        }
        if (action === 'edit_lesson_desc') {
            await clearState();
            const { data } = await supabase.from('lessons').select('*').eq('id', state.targetId).single();
            if (!data) return sendMsg('❌ الدرس غير موجود.');
            const upd = {
                title: state.tempTitle || data.title,
                url: state.tempUrl || data.url,
                description: input === 'نفسه' ? data.description : (input === 'لا يوجد' ? '' : input)
            };
            await supabase.from('lessons').update(upd).eq('id', state.targetId);
            return sendMsg(`✅ تم تحديث الدرس!`);
        }
    }
}

async function sendStudentsList(page) {
    const { data: users } = await supabase.from('users').select('*');
    const stds = (users || []).filter(u => u.role !== 'admin').sort((a, b) => b.id - a.id);
    const pageSize = 10;
    const totalPages = Math.max(1, Math.ceil(stds.length / pageSize));
    const slice = stds.slice(page * pageSize, (page * pageSize) + pageSize);
    if (!slice.length) return sendMsg("📭 لا يوجد طلاب مسجلون.");

    const kb = [];
    for (let i = 0; i < slice.length; i += 2) {
        const row = [];
        for (let j = i; j < Math.min(i + 2, slice.length); j++) {
            const s = slice[j];
            const icon = s.status === 'active' ? '🟢' : (s.status === 'banned' ? '🔴' : '🟡');
            row.push({ text: `👤 ${icon} ${s.username}` });
        }
        kb.push(row);
    }
    const navRow = [];
    if (page > 0) navRow.push({ text: `⬅️ طلاب ص ${page}` });
    if (page < totalPages - 1) navRow.push({ text: `طلاب ص ${page + 2} ➡️` });
    if (navRow.length > 0) kb.push(navRow);
    kb.push([{ text: '🔙 العودة للقائمة الرئيسية' }]);

    return sendMsg(`👥 <b>قائمة الطلاب (صفحة ${page + 1}/${totalPages}):</b>\nاختر من الأسفل:`, null, kb);
}

async function sendLessonsList(page) {
    const { data: lessons } = await supabase.from('lessons').select('*');
    const ls = (lessons || []).sort((a, b) => b.id - a.id);
    const pageSize = 10;
    const totalPages = Math.max(1, Math.ceil(ls.length / pageSize));
    const slice = ls.slice(page * pageSize, (page * pageSize) + pageSize);
    if (!slice.length) return sendMsg("📭 لا توجد دروس.");

    const kb = [];
    for (let i = 0; i < slice.length; i += 2) {
        const row = [];
        for (let j = i; j < Math.min(i + 2, slice.length); j++) {
            row.push({ text: `📖 ${slice[j].title}` });
        }
        kb.push(row);
    }
    const navRow = [];
    if (page > 0) navRow.push({ text: `⬅️ دروس ص ${page}` });
    if (page < totalPages - 1) navRow.push({ text: `دروس ص ${page + 2} ➡️` });
    if (navRow.length > 0) kb.push(navRow);
    kb.push([{ text: '🔙 العودة للقائمة الرئيسية' }]);

    return sendMsg(`📚 <b>قائمة الدروس (صفحة ${page + 1}/${totalPages}):</b>\nاختر من الأسفل:`, null, kb);
}

async function handleCallback(data) {
    if (data.startsWith('list_students')) {
        const p = data.split(':')[1];
        return sendStudentsList(p ? parseInt(p) : 0);
    }
    if (data.startsWith('student_info:')) {
        const id = data.split(':')[1];
        const { data: user } = await supabase.from('users').select('*').eq('id', id).single();
        if (!user) return sendMsg("❌ الطالب غير موجود.");
        const icon = user.status === 'active' ? '🟢' : (user.status === 'banned' ? '🔴' : '🟡');
        const stLabel = user.status === 'active' ? 'فعّال' : (user.status === 'banned' ? 'محظور' : 'معلّق');
        const expiry = user.expiry_date ? new Date(user.expiry_date).toLocaleDateString() : 'غير محدد';
        const msg = `${icon} <b>بيانات الطالب:</b>\n👤 اسم المستخدم: <code>${user.username}</code>\n🔑 كلمة المرور: <code>${user.password || 'غير متاح'}</code>\n📊 الحالة: ${stLabel}\n📅 انتهاء الاشتراك: ${expiry}`;
        const ik = [
            [{ text: '⏳ تغيير مدة الاشتراك', callback_data: `choose_act:${user.username}` }, { text: '🔑 تغيير كلمة المرور', callback_data: `edit_user_pass:${id}` }],
            [{ text: user.status === 'banned' ? '✅ رفع الحظر' : '🚫 حظر', callback_data: `toggle_ban:${id}` }, { text: '🗑️ حذف', callback_data: `conf_del_user:${id}` }],
            [{ text: '🔙 رجوع للقائمة', callback_data: 'list_students' }]
        ];
        return sendMsg(msg, ik);
    }
    if (data.startsWith('choose_act:')) {
        const u = data.split(':')[1];
        const ik = [
            [{ text: '🕒 ساعة', callback_data: `act_dur:${u}:1h` }, { text: '📅 يوم', callback_data: `act_dur:${u}:1d` }],
            [{ text: '📅 30 يوم', callback_data: `act_dur:${u}:30d` }, { text: '📅 سنة', callback_data: `act_dur:${u}:365d` }],
            [{ text: '🔙 رجوع', callback_data: 'list_students' }]
        ];
        return sendMsg(`⚙️ <b>تفعيل: ${u}</b>\nاختر مدة الاشتراك:`, ik);
    }
    if (data.startsWith('new_user_dur:')) {
        const state = await getState();
        if (!state.tempName) return sendMsg("❌ انتهت الجلسة.");
        const dur = data.split(':')[1];
        const [u, p] = [state.tempName, state.tempPass];
        await clearState();
        let ms = 30 * 86400000, label = '30 يوم';
        if (dur === '1h') { ms = 3600000; label = 'ساعة واحدة'; }
        else if (dur === '1d') { ms = 86400000; label = 'يوم واحد'; }
        else if (dur === '365d') { ms = 365 * 86400000; label = 'سنة كاملة'; }
        const exp = new Date(Date.now() + ms).toISOString();
        await supabase.from('users').insert([{ username: u, password: p, role: 'student', status: 'active', is_active: true, expiry_date: exp, created_at: new Date().toISOString() }]);
        return sendMsg(`✅ تم إضافة وتفعيل الطالب!\n👤 <b>الاسم:</b> <code>${u}</code>\n🔑 <b>كلمة المرور:</b> <code>${p}</code>\n⏳ <b>التفعيل:</b> ${label}`);
    }
    if (data.startsWith('act_dur:')) {
        const parts = data.split(':');
        const dur = parts[parts.length - 1];
        const u = parts.slice(1, -1).join(':');
        let ms = 30 * 86400000, label = '30 يوم';
        if (dur === '1h') { ms = 3600000; label = 'ساعة واحدة'; }
        else if (dur === '1d') { ms = 86400000; label = 'يوم واحد'; }
        else if (dur === '365d') { ms = 365 * 86400000; label = 'سنة كاملة'; }
        const exp = new Date(Date.now() + ms).toISOString();
        await supabase.from('users').update({ status: 'active', is_active: true, expiry_date: exp }).eq('username', u);
        return sendMsg(`✅ <b>تم تفعيل: ${u}</b>\n⏳ ${label}`);
    }
    if (data.startsWith('toggle_ban:')) {
        const id = data.split(':')[1];
        const { data: user } = await supabase.from('users').select('*').eq('id', id).single();
        if (!user) return;
        const ns = user.status === 'banned' ? 'active' : 'banned';
        await supabase.from('users').update({ status: ns, is_active: ns === 'active' }).eq('id', id);
        return sendMsg(ns === 'banned' ? `🚫 تم حظر: <b>${user.username}</b>` : `✅ تم رفع الحظر عن: <b>${user.username}</b>`);
    }
    if (data.startsWith('conf_del_user:')) {
        const id = data.split(':')[1];
        return sendMsg(`❓ هل أنت متأكد من الحذف؟`, [[{ text: '⚠️ نعم', callback_data: `del_user:${id}` }, { text: '❌ لا', callback_data: `student_info:${id}` }]]);
    }
    if (data.startsWith('del_user:')) {
        await supabase.from('users').delete().eq('id', data.split(':')[1]);
        return sendMsg(`✅ تم حذف الطالب.`);
    }
    if (data.startsWith('edit_user_pass:')) {
        await saveState({ action: 'edit_user_pass', targetId: data.split(':')[1] });
        return sendMsg(`🔑 أرسل <b>كلمة المرور الجديدة</b> للمتسخدم:`);
    }

    if (data.startsWith('list_lessons')) return sendLessonsList(parseInt(data.split(':')[1] || 0));
    if (data.startsWith('lesson_info:')) {
        const id = data.split(':')[1];
        const { data: l } = await supabase.from('lessons').select('*').eq('id', id).single();
        if (!l) return;
        return sendMsg(`📖 <b>${l.title}</b>\n🔗 ${l.url || 'بدون'}\n📝 ${l.description || 'بدون'}`, [
            [{ text: '✏️ تعديل الدرس', callback_data: `edit_lesson:${id}` }, { text: '🗑️ حذف', callback_data: `conf_del_lesson:${id}` }],
            [{ text: '🔙 للقائمة', callback_data: 'list_lessons' }]
        ]);
    }
    if (data.startsWith('conf_del_lesson:')) return sendMsg(`❓ تأكيد الحذف؟`, [[{ text: '⚠️ نعم', callback_data: `del_lesson:${data.split(':')[1]}` }, { text: '❌ لا', callback_data: `lesson_info:${data.split(':')[1]}` }]]);
    if (data.startsWith('del_lesson:')) { await supabase.from('lessons').delete().eq('id', data.split(':')[1]); return sendMsg(`✅ تم الحذف.`); }
    if (data.startsWith('edit_lesson:')) { await saveState({ action: 'edit_lesson_title', targetId: data.split(':')[1] }); return sendMsg(`✏️ أرسل <b>العنوان الجديد</b> (أو "نفسه"):`); }

    if (data.startsWith('coupon_info:')) {
        const k = data.split(':')[1];
        const { data: cols } = await supabase.from('coupons').select('*');
        const c = cols?.find(x => x.id == k || x.code == k);
        if (!c) return sendMsg('❌ الكود غير موجود.');
        const icon = '🟢';
        const usedBy = c.used_by || 'غير محدد';
        return sendMsg(`${icon} <b>كود: <code>${c.code}</code></b>\n⏳ ${c.duration} ${c.type === 'hours' ? 'ساعة' : 'يوم'}\n👤: ${usedBy}`, [
            [{ text: '📋 للنسخ', callback_data: `copy_coupon:${c.code}` }],
            [{ text: '✏️ تعديل الاسم', callback_data: `edit_coupon_name:${c.id}` }, { text: '✏️ المدة', callback_data: `edit_coupon:${c.id}` }],
            [{ text: '🗑️ حذف', callback_data: `del_coupon:${c.id}` }]
        ]);
    }
    if (data.startsWith('copy_coupon:')) { await sendMsg("اضغط للنسخ:"); return sendMsg(`<code>${data.split(':')[1]}</code>`); }
    if (data.startsWith('edit_coupon_name:')) { await saveState({ action: 'edit_coupon_text', targetId: data.split(':')[1] }); return sendMsg(`✏️ أرسل <b>الكود الجديد</b> الآن:`); }
    if (data.startsWith('edit_coupon:')) return sendMsg(`⚙️ اختر المدة:`, [[{ text: '🕒 ساعة', callback_data: `upd_coupon:${data.split(':')[1]}:1h` }, { text: '📅 يوم', callback_data: `upd_coupon:${data.split(':')[1]}:1d` }], [{ text: '📅 30 يوم', callback_data: `upd_coupon:${data.split(':')[1]}:30d` }, { text: '📅 سنة', callback_data: `upd_coupon:${data.split(':')[1]}:365d` }]]);
    if (data.startsWith('upd_coupon:')) {
        const parts = data.split(':'); const d = parts[2]; const id = parts[1];
        const upd = { duration: 1, type: 'days' };
        if (d === '1h') { upd.type = 'hours'; } else if (d === '30d') { upd.duration = 30; } else if (d === '365d') { upd.duration = 365; }
        await supabase.from('coupons').update(upd).eq('id', id);
        return sendMsg(`✅ تم التعديل.`);
    }
    if (data.startsWith('del_coupon:')) { await supabase.from('coupons').delete().eq('id', data.split(':')[1]); return sendMsg(`✅ تم حذف الكود.`); }

    if (data === 'start_broadcast') {
        await saveState({ action: 'broadcast_mode' });
        return sendMsg("📢 أرسل نص الإعلان الذي ترغب في إذاعته لجميع الطلاب:");
    }
    if (data === 'site_announcement') {
        const ik = [
            [{ text: '📝 تعديل النص والزر', callback_data: 'edit_site_ann' }],
            [{ text: '🗑️ حذف الإعلان', callback_data: 'clear_site_ann' }],
            [{ text: '🔙 رجوع', callback_data: 'cancel' }]
        ];
        return sendMsg("📢 <b>إعدادات إعلان الموقع:</b>\nتحكم في الشريط الذي يظهر أعلى الدروس للطلاب.", ik);
    }
    if (data === 'edit_site_ann') {
        await saveState({ action: 'site_ann_text' });
        return sendMsg("📝 أرسل <b>نص الإعلان الجديد</b>:");
    }
    if (data === 'clear_site_ann') {
        await updateSiteAnnouncement({ text: '', buttonText: '', buttonUrl: '' });
        return sendMsg("✅ تم حذف الإعلان من الموقع.");
    }
    if (data === 'cancel') {
        await clearState();
        return sendMsg("تم الإلغاء.");
    }
    if (data === 'stats') {
        const [{ data: users }, { data: lessons }, { data: coupons }] = await Promise.all([supabase.from('users').select('*'), supabase.from('lessons').select('id'), supabase.from('coupons').select('id')]);
        const std = (users || []).filter(u => u.role !== 'admin');
        const now = Date.now();
        const online = std.filter(u => u.last_active && (now - new Date(u.last_active).getTime() < 180000)).length;
        const active = std.filter(u => u.status === 'active' && (!u.expiry_date || new Date(u.expiry_date) > now)).length;
        const expired = std.filter(u => ['active', 'pending'].includes(u.status) && u.expiry_date && new Date(u.expiry_date) <= now).length;
        return sendMsg(`📊 <b>إحصائيات:</b>\n👥 إجمالي: ${std.length}\n🟢 نشطون: ${active}\n⏳ منتهية: ${expired}\n🔴 محظورون: ${std.filter(u => u.status === 'banned').length}\n🌐 الان: ${online}\n📚 دروس: ${lessons?.length || 0}\n🎫 أكواد: ${coupons?.length || 0}`);
    }
    if (data === 'show_codes') {
        const { data: cols } = await supabase.from('coupons').select('*');
        const filtered = (cols || []).filter(c => c.code !== 'BOT_STATE_ADMIN').sort((a, b) => b.id - a.id).slice(0, 20);
        if (!filtered.length) return sendMsg('📭 فارغ');
        const kb = [];
        for (let i = 0; i < filtered.length; i += 2) {
            const row = [];
            for (let j = i; j < Math.min(i + 2, filtered.length); j++) {
                const c = filtered[j];
                const icon = '🟢';
                row.push({ text: `${icon} ${c.code} (${c.type === 'hours' ? c.duration + 'س' : c.duration + 'ي'})` });
            }
            kb.push(row);
        }
        kb.push([{ text: '🔙 العودة للقائمة الرئيسية' }]);
        return sendMsg(`🏷️ <b>أحدث الأكواد:</b>`, null, kb);
    }

    if (data === 'admin_settings') {
        const ik = [
            [{ text: '➕ إضافة أدمن جديد', callback_data: 'add_admin_start' }],
            [{ text: '📋 التحكم في الصلاحيات والأدمنز', callback_data: 'list_admins' }],
            [{ text: '🔙 رجوع', callback_data: 'cancel' }]
        ];
        return sendMsg("⚙️ <b>إعدادات الإدارة:</b>\nيمكنك إضافة أدمنز وتحديد ما يمكن لكل واحد عمله.", ik);
    }
    if (data === 'add_admin_start') {
        await saveState({ action: 'add_admin_id' });
        return sendMsg("👤 أرسل <b>Telegram ID</b> للأدمن الجديد:");
    }
    if (data === 'list_admins') {
        const permsMap = await fetchAdmins();
        const ids = Object.keys(permsMap);
        
        const { data: userData } = await supabase.from('users').select('username, telegram_id').in('telegram_id', ids);
        const nameMap = {};
        userData?.forEach(u => { nameMap[u.telegram_id] = u.username; });

        let msg = "📋 <b>إدارة الأدمنز:</b>\n\n";
        msg += `👑 <b>أنت (Super Admin)</b>\n\n`;
        const ik = [];
        
        for (const id of ids) {
            let name = nameMap[id];
            let errorHint = "";
            
            if (!name) {
                const res = await tg('getChat', { chat_id: id });
                if (res.ok) {
                    name = res.result.first_name + (res.result.last_name ? ' ' + res.result.last_name : '');
                    if (res.result.username) name += ` (@${res.result.username})`;
                } else {
                    errorHint = ` (خطأ: ${res.description || 'فشل الاتصال'})`;
                }
            }
            
            const display = name || `أدمن رقم ${id}${errorHint}`;
            msg += `• 👤 <b>${display}</b>\n`;
            ik.push([{ text: `⚙️ صلاحيات ${name ? name.substring(0, 15) : id}`, callback_data: `edit_perms:${id}` }, { text: `🗑️ حذف`, callback_data: `conf_del_admin:${id}` }]);
        }
        
        ik.push([{ text: '🔙 رجوع', callback_data: 'admin_settings' }]);
        return sendMsg(msg, ik);
    }
    if (data.startsWith('edit_perms:')) {
        const id = data.split(':')[1];
        const perms = CACHED_ADMINS_PERMS[id] || [];
        
        let name = null;
        const { data: user } = await supabase.from('users').select('username').eq('telegram_id', id).single();
        if (user) name = user.username;
        else {
            const res = await tg('getChat', { chat_id: id });
            if (res.ok) name = res.result.first_name + (res.result.last_name ? ' ' + res.result.last_name : '');
        }

        const display = name || id;
        let msg = `⚙️ <b>صلاحيات الأدمن:</b> ${display}\nاختر الصلاحية لتغيير حالتها:`;
        const ik = [];
        Object.keys(PERMISSIONS_MAP).forEach(pk => {
            const has = perms.includes(pk);
            ik.push([{ 
                text: `${has ? '✅' : '❌'} ${PERMISSIONS_MAP[pk]}`, 
                callback_data: `tog_perm:${id}:${pk}` 
            }]);
        });
        ik.push([{ text: '🔙 رجوع للقائمة', callback_data: 'list_admins' }]);
        return sendMsg(msg, ik);
    }
    if (data.startsWith('tog_perm:')) {
        const [, id, pk] = data.split(':');
        const perms = CACHED_ADMINS_PERMS[id] || [];
        if (perms.includes(pk)) CACHED_ADMINS_PERMS[id] = perms.filter(x => x !== pk);
        else CACHED_ADMINS_PERMS[id] = [...perms, pk];
        await saveAdmins(CACHED_ADMINS_PERMS);
        return handleCallback(`edit_perms:${id}`);
    }
    if (data.startsWith('conf_del_admin:')) {
        const id = data.split(':')[1];
        return sendMsg(`❓ حذف الأدمن <code>${id}</code>؟`, [[{ text: '⚠️ نعم', callback_data: `del_admin:${id}` }, { text: '❌ لا', callback_data: 'list_admins' }]]);
    }
    if (data.startsWith('del_admin:')) {
        const id = data.split(':')[1];
        delete CACHED_ADMINS_PERMS[id];
        await saveAdmins(CACHED_ADMINS_PERMS);
        return sendMsg(`✅ تم حذف <code>${id}</code>.`);
    }

    if (data === 'add_student') { await saveState({ action: 'add_user_name' }); return sendMsg("👤 أرسل <b>اسم الطالب</b>:"); }
    if (data === 'add_lesson') { await saveState({ action: 'add_lesson_title' }); return sendMsg("📚 أرسل <b>عنوان الدرس</b>:"); }
    if (data === 'search_student') { await saveState({ action: 'search_student' }); return sendMsg("🔍 أرسل <b>اسم الطالب</b>:"); }
    if (data === 'search_lesson') { await saveState({ action: 'search_lesson' }); return sendMsg("🔍 أرسل <b>عنوان الدرس</b>:"); }

    if (data.startsWith('gen_code:')) {
        const dStr = data.split(':')[1];
        let d = 1, t = 'days', ar = 'يوم';
        if (dStr === '1h') { t = 'hours'; ar = 'ساعة'; } else if (dStr === '30d') { d = 30; } else if (dStr === '365d') { d = 365; }
        const code = Math.random().toString(36).substring(2, 10).toUpperCase();
        await supabase.from('coupons').insert([{ code, duration: d, type: t, created_at: new Date().toISOString() }]);
        return sendMsg(`🎫 <b>كود:</b>\n<code>${code}</code>\n⏳ ${d} ${ar}`, null, codesKb);
    }
}

async function updateSiteAnnouncement(obj) {
    const jsonStr = JSON.stringify(obj);
    const { data } = await supabase.from('users').select('id').eq('username', 'ANNOUNCEMENT_DATA').single();
    if (data) {
        await supabase.from('users').update({ password: jsonStr }).eq('id', data.id);
    } else {
        await supabase.from('users').insert([{
            username: 'ANNOUNCEMENT_DATA',
            password: jsonStr,
            role: 'system',
            status: 'active',
            is_active: true,
            created_at: new Date().toISOString()
        }]);
    }
}

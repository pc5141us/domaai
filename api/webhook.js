/**
 * Doma AI Bot - Rebuilt from scratch (v3.1.0)
 * Optimized for Vercel Serverless & Supabase
 * Matching Site Logic & Schema (No created_at, using id for ordering)
 */
import { createClient } from '@supabase/supabase-js';

// --- CONFIGURATION ---
const BOT_TOKEN = '8598472216:AAE7gQmUpaWPeEgq7ZFlnTGuzedGUAQfFoU';
const SUPER_ADMIN = '682572594';

// Matching db.js encoding for consistency as requested
const SUPABASE_URL = atob('aHR0cHM6Ly9sYWtnZGNzeXRvd25vaXlydmxpcS5zdXBhYmFzZS5jbw==');
const SUPABASE_KEY = atob('c2JfcHVibGlzaGFibGVfT2IxUjF0Ql9TV3ctcDBWeUh6R3RKQV9mbjJCREthdQ==');

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const PERMISSIONS = {
    stats: '📊 إحصائيات',
    students: '👥 الطلاب',
    lessons: '📚 الدروس',
    codes: '🏷️ الأكواد',
    settings: '⚙️ الإعدادات'
};

// --- CORE HANDLER ---
export default async (req, res) => {
    if (req.method !== 'POST') return res.status(200).send('OK');

    const { message, callback_query } = req.body;
    const data = message || callback_query?.message;
    if (!data) return res.status(200).send('OK');

    const cid = data.chat.id.toString();
    const mid = data.message_id;
    const text = message?.text;
    const cbData = callback_query?.data;

    try {
        const admins = await getAdmins();
        if (!isAdmin(cid, admins) && cid !== SUPER_ADMIN) {
            if (text === '/start') await sendMsg(cid, "❌ عذراً، أنت لست مسؤولاً في هذا النظام.");
            return res.status(200).send('OK');
        }

        if (cbData) {
            await handleCallback(cid, mid, cbData, admins);
        } else if (text) {
            await handleMessage(cid, text, admins);
        }
    } catch (err) {
        console.error('Bot Error:', err);
    }

    res.status(200).send('OK');
};

// --- MESSAGE HANDLER ---
async function handleMessage(cid, text, admins) {
    if (text === '/start' || text === '🏠 القائمة الرئيسية') {
        await sendMsg(cid, "👋 أهلاً بك في لوحة تحكم Doma AI\nاختر من القائمة أدناه:", getMainKeyboard(cid, admins));
        await clearState(cid);
        return;
    }

    const state = await getState(cid);

    // 1. STATS
    if (text === PERMISSIONS.stats && hasPermission(cid, 'stats', admins)) {
        const [uCount, lCount, cCount] = await Promise.all([
            supabase.from('users').select('*', { count: 'exact', head: true }).neq('role', 'system'),
            supabase.from('lessons').select('*', { count: 'exact', head: true }),
            supabase.from('coupons').select('*', { count: 'exact', head: true })
        ]);
        const msg = `📊 <b>إحصائيات المنصة:</b>\n\n👥 الطلاب: ${uCount.count || 0}\n📚 الدروس: ${lCount.count || 0}\n🏷️ الأكواد: ${cCount.count || 0}`;
        return await sendMsg(cid, msg, getMainKeyboard(cid, admins));
    }

    // 2. STUDENTS
    if (text === PERMISSIONS.students && hasPermission(cid, 'students', admins)) {
        return await sendStudentsList(cid, 0);
    }

    // 3. LESSONS
    if (text === PERMISSIONS.lessons && hasPermission(cid, 'lessons', admins)) {
        const kb = {
            inline_keyboard: [
                [{ text: "➕ إضافة درس جديد", callback_data: "add_lesson_start" }],
                [{ text: "📜 عرض قائمة الدروس", callback_data: "list_lessons_0" }]
            ]
        };
        return await sendMsg(cid, "📚 إدارة الدروس:", kb);
    }

    // 4. CODES (COUPONS)
    if (text === PERMISSIONS.codes && hasPermission(cid, 'codes', admins)) {
        const kb = {
            inline_keyboard: [
                [{ text: "➕ توليد كود جديد", callback_data: "gen_code_start" }],
                [{ text: "📜 عرض قائمة الأكواد", callback_data: "list_codes_0" }]
            ]
        };
        return await sendMsg(cid, "🏷️ إدارة أكواد التفعيل:", kb);
    }

    // 5. SETTINGS
    if (text === PERMISSIONS.settings && cid === SUPER_ADMIN) {
        const adminList = admins.map(a => `• ${a.name} (${a.id})`).join('\n') || "لا يوجد مسؤولين حالياً.";
        const kb = {
            inline_keyboard: [[{ text: "➕ إضافة مسؤول", callback_data: "add_admin_start" }]]
        };
        return await sendMsg(cid, `⚙️ <b>إعدادات النظام:</b>\n\n👥 المسؤولون الحاليون:\n${adminList}`, kb);
    }

    // --- STATE FLOWS ---
    if (state) {
        switch (state.action) {
            case 'add_admin_id':
                await saveState(cid, { action: 'add_admin_name', target_id: text });
                return await sendMsg(cid, "👤 حسناً، أرسل اسم المسؤول:");
            case 'add_admin_name':
                admins.push({ id: state.target_id, name: text, permissions: Object.keys(PERMISSIONS) });
                await updateAdmins(admins);
                await clearState(cid);
                return await sendMsg(cid, `✅ تم إضافة المسؤول ${text} بنجاح!`, getMainKeyboard(cid, admins));
            
            case 'add_lesson_title':
                await saveState(cid, { action: 'add_lesson_url', temp_data: { title: text } });
                return await sendMsg(cid, "🔗 أرسل رابط الفيديو (Vimeo/YouTube):");
            case 'add_lesson_url':
                await saveState(cid, { action: 'add_lesson_desc', temp_data: { ...state.temp_data, video_url: text } });
                return await sendMsg(cid, "📝 أرسل وصف الدرس (أو أرسل - للتخطي):");
            case 'add_lesson_desc':
                const finalData = { ...state.temp_data, description: text === '-' ? '' : text };
                const { error: lErr } = await supabase.from('lessons').insert([finalData]);
                await clearState(cid);
                if (lErr) return await sendMsg(cid, "❌ فشل إضافة الدرس.");
                return await sendMsg(cid, "✅ تم إضافة الدرس بنجاح!", getMainKeyboard(cid, admins));
        }
    }
}

// --- CALLBACK HANDLER ---
async function handleCallback(cid, mid, data, admins) {
    const [action, val, extra] = data.split('_');

    if (action === 'list' && val === 'students') return await sendStudentsList(cid, parseInt(extra));
    if (action === 'list' && val === 'lessons') return await sendLessonsList(cid, parseInt(extra));
    if (action === 'list' && val === 'codes') return await sendCodesList(cid, parseInt(extra));

    if (action === 'view' && val === 'user') {
        const { data: user } = await supabase.from('users').select('*').eq('id', extra).maybeSingle();
        if (!user) return await editMsg(cid, mid, "❌ مستخدم غير موجود.");
        const status = user.is_active ? "✅ مفعل" : "❌ غير مفعل";
        const msg = `👤 <b>بيانات الطالب:</b>\n\nاسم المستخدم: <code>${user.username}</code>\nالحالة: ${status}\nانتهاء الاشتراك: ${user.expiry_date || 'N/A'}`;
        const kb = {
            inline_keyboard: [
                [{ text: "🗑️ حذف الطالب", callback_data: `del_user_${user.id}` }],
                [{ text: "🔙 عودة", callback_data: "list_students_0" }]
            ]
        };
        return await editMsg(cid, mid, msg, kb);
    }

    if (action === 'del' && val === 'user') {
        await supabase.from('users').delete().eq('id', extra);
        return await editMsg(cid, mid, "✅ تم حذف الطالب.");
    }

    if (action === 'del' && val === 'code') {
        await supabase.from('coupons').delete().eq('id', extra);
        return await editMsg(cid, mid, "✅ تم حذف الكود.");
    }

    if (action === 'add' && val === 'lesson') {
        await saveState(cid, { action: 'add_lesson_title' });
        return await sendMsg(cid, "📝 أرسل عنوان الدرس الجديد:");
    }

    if (action === 'gen' && val === 'code') {
        await saveState(cid, { action: 'gen_code_dur' });
        const kb = {
            inline_keyboard: [
                [{ text: "ساعة واحدة", callback_data: "do_gen_1h" }],
                [{ text: "يوم واحد", callback_data: "do_gen_1d" }],
                [{ text: "7 أيام", callback_data: "do_gen_7d" }],
                [{ text: "30 يوم", callback_data: "do_gen_30d" }],
                [{ text: "سنة كاملة", callback_data: "do_gen_1y" }]
            ]
        };
        return await editMsg(cid, mid, "⏳ اختر مدة الكود:", kb);
    }

    if (action === 'do' && val === 'gen') {
        const code = Math.random().toString(36).substring(2, 10).toUpperCase();
        await supabase.from('coupons').insert([{ code, duration_type: extra }]);
        await editMsg(cid, mid, `✅ تم توليد كود جديد:\n<code>${code}</code>\nالمدة: ${extra}`);
        await clearState(cid);
    }

    if (action === 'add' && val === 'admin') {
        await saveState(cid, { action: 'add_admin_id' });
        return await sendMsg(cid, "🆔 أرسل الـ Telegram ID للمسؤول الجديد:");
    }
}

// --- DATABASE FUNCTIONS ---
async function getAdmins() {
    const { data } = await supabase.from('users').select('password').eq('username', 'DOMA_AI_BOT').maybeSingle();
    return data ? JSON.parse(atob(data.password)) : [];
}

async function updateAdmins(admins) {
    const jsonStr = btoa(JSON.stringify(admins));
    const { data: botUser } = await supabase.from('users').select('id').eq('username', 'DOMA_AI_BOT').maybeSingle();
    if (botUser) {
        await supabase.from('users').update({ password: jsonStr }).eq('id', botUser.id);
    } else {
        await supabase.from('users').insert([{ username: 'DOMA_AI_BOT', password: jsonStr, role: 'system' }]);
    }
}

// --- LIST HELPERS ---
async function sendStudentsList(cid, page) {
    const { data: users } = await supabase.from('users').select('*').neq('role', 'system').order('id', { ascending: false });
    const pageSize = 10;
    const start = page * pageSize;
    const slice = users.slice(start, start + pageSize);
    const kb = {
        inline_keyboard: slice.map(u => [{ text: u.username, callback_data: `view_user_${u.id}` }])
    };
    const nav = [];
    if (page > 0) nav.push({ text: "⬅️", callback_data: `list_students_${page - 1}` });
    if (start + pageSize < users.length) nav.push({ text: "➡️", callback_data: `list_students_${page + 1}` });
    if (nav.length) kb.inline_keyboard.push(nav);
    await sendMsg(cid, "👥 قائمة الطلاب:", kb);
}

async function sendLessonsList(cid, page) {
    const { data: lessons } = await supabase.from('lessons').select('*').order('id', { ascending: false });
    const kb = { inline_keyboard: lessons.map(l => [{ text: l.title, callback_data: `view_lesson_${l.id}` }]) };
    await editMsg(cid, null, "📚 قائمة الدروس:", kb); // Simple fallback
}

async function sendCodesList(cid, page) {
    const { data: codes } = await supabase.from('coupons').select('*').order('id', { ascending: false }).limit(20);
    const kb = {
        inline_keyboard: codes.map(c => [
            { text: `${c.code} (${c.duration_type})`, callback_data: "none" },
            { text: "🗑️", callback_data: `del_code_${c.id}` }
        ])
    };
    await sendMsg(cid, "🏷️ أحدث 20 كود:", kb);
}

// --- TELEGRAM HELPERS ---
async function sendMsg(cid, text, kb = null) {
    const body = { chat_id: cid, text, parse_mode: 'HTML', reply_markup: kb };
    return await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
}

async function editMsg(cid, mid, text, kb = null) {
    const body = { chat_id: cid, message_id: mid, text, parse_mode: 'HTML', reply_markup: kb };
    return await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageText`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
}

function getMainKeyboard(cid, admins) {
    const buttons = [];
    if (hasPermission(cid, 'stats', admins)) buttons.push([PERMISSIONS.stats]);
    if (hasPermission(cid, 'students', admins)) buttons.push([PERMISSIONS.students]);
    if (hasPermission(cid, 'lessons', admins)) buttons.push([PERMISSIONS.lessons]);
    if (hasPermission(cid, 'codes', admins)) buttons.push([PERMISSIONS.codes]);
    if (cid === SUPER_ADMIN) buttons.push([PERMISSIONS.settings]);
    return { keyboard: buttons, resize_keyboard: true };
}

// --- UTILS ---
function isAdmin(id, admins) { return admins.some(a => a.id === id); }
function hasPermission(id, key, admins) {
    if (id === SUPER_ADMIN) return true;
    const admin = admins.find(a => a.id === id);
    return admin?.permissions?.includes(key);
}

const botStates = {};
async function saveState(cid, data) { botStates[cid] = data; }
async function getState(cid) { return botStates[cid]; }
async function clearState(cid) { delete botStates[cid]; }

// Define atob/btoa for Node.js if missing
if (typeof atob === 'undefined') {
    global.atob = (str) => Buffer.from(str, 'base64').toString('binary');
    global.btoa = (str) => Buffer.from(str, 'binary').toString('base64');
}

/**
 * Doma AI Bot - Failsafe Version (v3.2.0)
 * Format: CommonJS (Node.js Default)
 * No encoding complications, no ESM issues.
 */

const { createClient } = require('@supabase/supabase-js');

// --- PLAIN TEXT CONFIGURATION (Total Accuracy) ---
const BOT_TOKEN = '8598472216:AAE7gQmUpaWPeEgq7ZFlnTGuzedGUAQfFoU';
const SUPER_ADMIN = '682572594';
const SUPABASE_URL = 'https://lakgdcsytownoiyrvliq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Ob1R1tB_SWw-p0VyHzGtJA_fn2BDKau';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const PERMISSIONS = {
    stats: '📊 إحصائيات',
    students: '👥 الطلاب',
    lessons: '📚 الدروس',
    codes: '🏷️ الأكواد',
    settings: '⚙️ الإعدادات'
};

// --- CORE HANDLER ---
module.exports = async (req, res) => {
    if (req.method !== 'POST') return res.status(200).send('Doma AI Bot is Live!');

    const { message, callback_query } = req.body || {};
    const data = message || callback_query?.message;
    if (!data) return res.status(200).send('OK');

    const cid = data.chat.id.toString();
    const mid = data.message_id;
    const text = message?.text;
    const cbData = callback_query?.data;

    try {
        const admins = await getAdmins();
        
        // Identity Check
        if (!isAdmin(cid, admins) && cid !== SUPER_ADMIN) {
            if (text === '/start') await sendMsg(cid, "❌ أنت لست مسؤولاً في هذا النظام.");
            return res.status(200).send('OK');
        }

        if (cbData) {
            await handleCallback(cid, mid, cbData, admins);
        } else if (text) {
            await handleMessage(cid, text, admins);
        }
    } catch (err) {
        console.error('Runtime Error:', err);
        // Silent fail to keep Vercel happy
    }

    return res.status(200).send('OK');
};

const botStates = {};

// --- MESSAGE HANDLER ---
async function handleMessage(cid, text, admins) {
    if (text === '/start' || text === '🏠 القائمة الرئيسية') {
        const kb = getMainKeyboard(cid, admins);
        await sendMsg(cid, "🛠️ <b>لوحة تحكم Doma AI (V3.2)</b>\nأهلاً بك، اختر العملية المطلوبة:", kb);
        delete botStates[cid];
        return;
    }

    if (text === PERMISSIONS.stats && hasPermission(cid, 'stats', admins)) {
        const [uCount, lCount, cCount] = await Promise.all([
            supabase.from('users').select('*', { count: 'exact', head: true }).neq('role', 'system'),
            supabase.from('lessons').select('*', { count: 'exact', head: true }),
            supabase.from('coupons').select('*', { count: 'exact', head: true })
        ]);
        const msg = `📊 <b>إحصائيات المنصة:</b>\n\n👤 الطلاب: ${uCount.count || 0}\n📚 الدروس: ${lCount.count || 0}\n🏷️ الأكواد: ${cCount.count || 0}`;
        return await sendMsg(cid, msg);
    }

    if (text === PERMISSIONS.students && hasPermission(cid, 'students', admins)) {
        return await sendStudentsList(cid, 0);
    }

    if (text === PERMISSIONS.lessons && hasPermission(cid, 'lessons', admins)) {
        const kb = {
            inline_keyboard: [
                [{ text: "➕ إضافة درس", callback_data: "add_lesson_start" }],
                [{ text: "📜 عرض الدروس", callback_data: "list_lessons_0" }]
            ]
        };
        return await sendMsg(cid, "📚 إدارة الدروس:", kb);
    }

    if (text === PERMISSIONS.codes && hasPermission(cid, 'codes', admins)) {
        const kb = {
            inline_keyboard: [
                [{ text: "➕ توليد كود", callback_data: "gen_code_start" }],
                [{ text: "📜 أحدث 20 كود", callback_data: "list_codes_0" }]
            ]
        };
        return await sendMsg(cid, "🏷️ إدارة تفعيل الأكواد:", kb);
    }

    if (text === PERMISSIONS.settings && cid === SUPER_ADMIN) {
        const adminList = admins.map(a => `• ${a.name} (<code>${a.id}</code>)`).join('\n') || "لا يوجد مسؤولين حالياً.";
        const kb = { inline_keyboard: [[{ text: "➕ إضافة مسؤول جديد", callback_data: "add_admin_start" }]] };
        return await sendMsg(cid, `⚙️ <b>الإعدادات:</b>\n\n👥 المسؤولون:\n${adminList}`, kb);
    }

    // State Processing
    const state = botStates[cid];
    if (state) {
        if (state.action === 'add_admin_id') {
            botStates[cid] = { action: 'add_admin_name', target_id: text };
            return await sendMsg(cid, "👤 أدخل اسم المسؤول:");
        }
        if (state.action === 'add_admin_name') {
            const updatedAdmins = [...admins, { id: state.target_id, name: text, permissions: Object.keys(PERMISSIONS) }];
            await updateAdmins(updatedAdmins);
            delete botStates[cid];
            return await sendMsg(cid, `✅ تم إضافة ${text} كمسؤول.`, getMainKeyboard(cid, updatedAdmins));
        }
        if (state.action === 'add_lesson_title') {
            botStates[cid] = { action: 'add_lesson_url', temp_data: { title: text } };
            return await sendMsg(cid, "🔗 أدخل رابط الفيديو:");
        }
        if (state.action === 'add_lesson_url') {
            const lessonData = { ...state.temp_data, video_url: text };
            await supabase.from('lessons').insert([lessonData]);
            delete botStates[cid];
            return await sendMsg(cid, "✅ تم إضافة الدرس بنجاح!", getMainKeyboard(cid, admins));
        }
    }
}

// --- CALLBACK HANDLER ---
async function handleCallback(cid, mid, data, admins) {
    const [action, val, extra] = data.split('_');

    if (action === 'list' && val === 'codes') return await sendCodesList(cid);
    if (action === 'list' && val === 'students') return await sendStudentsList(cid, parseInt(extra || 0));

    if (action === 'gen' && val === 'code') {
        const kb = {
            inline_keyboard: [
                [{ text: "ساعة", callback_data: "do_gen_1h" }, { text: "يوم", callback_data: "do_gen_1d" }],
                [{ text: "أسبوع (7d)", callback_data: "do_gen_7d" }, { text: "شهر (30d)", callback_data: "do_gen_30d" }],
                [{ text: "سنة", callback_data: "do_gen_1y" }]
            ]
        };
        return await editMsg(cid, mid, "⏳ اختر مدة الكود:", kb);
    }

    if (action === 'do' && val === 'gen') {
        const code = Math.random().toString(36).substring(2, 10).toUpperCase();
        await supabase.from('coupons').insert([{ code, duration_type: extra }]);
        await editMsg(cid, mid, `✅ تم التوليد:\n\n<code>${code}</code>\nالباقة: <b>${extra}</b>`);
    }

    if (action === 'del' && val === 'code') {
        await supabase.from('coupons').delete().eq('id', extra);
        return await editMsg(cid, mid, "✅ تم الحذف.");
    }

    if (action === 'view' && val === 'user') {
        const { data: user } = await supabase.from('users').select('*').eq('id', extra).maybeSingle();
        if (!user) return await editMsg(cid, mid, "❌ المستخدم غير موجود.");
        const msg = `👤 <b>بيانات الطالب:</b>\nاسم المستخدم: ${user.username || 'N/A'}\nالحالة: ${user.is_active ? '✅ مفعل' : '❌ غير مفعل'}\nانتهاء: ${user.expiry_date || 'N/A'}`;
        const kb = {
            inline_keyboard: [[{ text: "🗑️ حذف الطالب", callback_data: `del_user_${user.id}` }], [{ text: "🔙 عودة", callback_data: "list_students_0" }]]
        };
        return await editMsg(cid, mid, msg, kb);
    }

    if (action === 'del' && val === 'user') {
        await supabase.from('users').delete().eq('id', extra);
        return await editMsg(cid, mid, "✅ تم حذف الطالب.");
    }

    if (action === 'add' && val === 'admin') {
        botStates[cid] = { action: 'add_admin_id' };
        return await sendMsg(cid, "🆔 أرسل الـ Telegram ID للمسؤول الجديد:");
    }

    if (action === 'add' && val === 'lesson') {
        botStates[cid] = { action: 'add_lesson_title' };
        return await sendMsg(cid, "📝 أرسل عنوان الدرس الجديد:");
    }
}

// --- DATABASE FUNCTIONS ---
async function getAdmins() {
    try {
        const { data } = await supabase.from('users').select('password').eq('username', 'DOMA_AI_BOT').maybeSingle();
        if (!data?.password) return [];
        // Support both encoded and non-encoded admin strings
        const decoded = data.password.endsWith('=') ? Buffer.from(data.password, 'base64').toString() : data.password;
        return JSON.parse(decoded);
    } catch (e) {
        console.error('Failed to get admins:', e);
        return [];
    }
}

async function updateAdmins(admins) {
    const jsonStr = Buffer.from(JSON.stringify(admins)).toString('base64');
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
    if (!users?.length) return await sendMsg(cid, "❌ لا يوجد طلاب.");
    const pageSize = 10;
    const slice = users.slice(page * pageSize, (page + 1) * pageSize);
    const kb = { inline_keyboard: slice.map(u => [{ text: u.username || 'بدون اسم', callback_data: `view_user_${u.id}` }]) };
    const nav = [];
    if (page > 0) nav.push({ text: "⬅️ السابق", callback_data: `list_students_${page - 1}` });
    if ((page + 1) * pageSize < users.length) nav.push({ text: "التالي ➡️", callback_data: `list_students_${page + 1}` });
    if (nav.length) kb.inline_keyboard.push(nav);
    await sendMsg(cid, "👥 قائمة طلاب المنصة:", kb);
}

async function sendCodesList(cid) {
    const { data: codes } = await supabase.from('coupons').select('*').order('id', { ascending: false }).limit(20);
    if (!codes?.length) return await sendMsg(cid, "❌ لا توجد أكواد.");
    const kb = {
        inline_keyboard: codes.map(c => [
            { text: `${c.code} (${c.duration_type})`, callback_data: "none" },
            { text: "🗑️", callback_data: `del_code_${c.id}` }
        ])
    };
    await sendMsg(cid, "🏷️ أحدث 20 كود فعال:", kb);
}

// --- TELEGRAM API ---
async function sendMsg(cid, text, kb = null) {
    const fetch = global.fetch || require('node-fetch'); // Standard fetch in Node 18+
    return await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: cid, text, parse_mode: 'HTML', reply_markup: kb })
    });
}

async function editMsg(cid, mid, text, kb = null) {
    const fetch = global.fetch || require('node-fetch'); // Standard fetch in Node 18+
    return await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: cid, message_id: mid, text, parse_mode: 'HTML', reply_markup: kb })
    });
}

function getMainKeyboard(cid, admins) {
    const btns = [];
    if (hasPermission(cid, 'stats', admins)) btns.push([PERMISSIONS.stats]);
    if (hasPermission(cid, 'students', admins)) btns.push([PERMISSIONS.students]);
    if (hasPermission(cid, 'lessons', admins)) btns.push([PERMISSIONS.lessons]);
    if (hasPermission(cid, 'codes', admins)) btns.push([PERMISSIONS.codes]);
    if (cid === SUPER_ADMIN) btns.push([PERMISSIONS.settings]);
    btns.push(['🏠 القائمة الرئيسية']);
    return { keyboard: btns, resize_keyboard: true };
}

function isAdmin(id, admins) { return admins.some(a => a.id === id); }
function hasPermission(id, key, admins) {
    if (id === SUPER_ADMIN) return true;
    const admin = admins.find(a => a.id === id);
    return admin?.permissions?.includes(key);
}

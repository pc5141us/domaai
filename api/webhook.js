import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = atob('aHR0cHM6Ly9sYWtnZGNzeXRvd25vaXlydmxpcS5zdXBhYmFzZS5jbw==');
const SUPABASE_KEY = atob('c2JfcHVibGlzaGFibGVfT2IxUjF0Ql9TV3ctcDBWeUh6R3RKQV9mbjJCREthdQ==');
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const BOT_TOKEN = '8598472216:AAE7gQmUpaWPeEgq7ZFlnTGuzedGUAQfFoU';
const ADMIN_ID = '682572594';
const ADMIN_ID_NUM = 682572594;

async function getState() {
    const { data } = await supabase.from('coupons').select('used_by').eq('code', 'BOT_STATE_ADMIN').single();
    if (data && data.used_by) {
        try { return JSON.parse(data.used_by); } catch (e) { return {}; }
    }
    return {};
}

async function saveState(state) {
    try {
        const jsonStr = JSON.stringify(state);
        const { data } = await supabase.from('coupons').select('id').eq('code', 'BOT_STATE_ADMIN').single();
        if (data) {
            const { error } = await supabase.from('coupons').update({ used_by: jsonStr }).eq('code', 'BOT_STATE_ADMIN');
            if (error) await sendMsg(`⚠️ Error updating state: ${error.message}`);
        } else {
            const { error } = await supabase.from('coupons').insert([{ code: 'BOT_STATE_ADMIN', duration: 1, type: 'days', used_by: jsonStr, created_at: new Date().toISOString() }]);
            if (error) await sendMsg(`⚠️ Error inserting state: ${error.message}`);
        }
    } catch (e) {
        await sendMsg(`⚠️ Exception in saveState: ${e.message}`);
    }
}
async function clearState() { await saveState({}); }

async function tg(method, payload) {
    return fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    }).catch(e => console.error(e));
}

const mainKb = [
    [{ text: '📊 إحصائيات المنصة' }],
    [{ text: '👥 إدارة الطلاب' }, { text: '📚 إدارة الدروس' }],
    [{ text: '🔍 بحث عن طالب' }, { text: '🔍 بحث عن درس' }],
    [{ text: "🎫 توليد الأكواد" }, { text: "🏷️ عرض الأكواد" }],
    [{ text: '➕ إضافة طالب' }, { text: '➕ إضافة درس' }],
    [{ text: '❓ المساعدة' }]
];
const codesKb = [
    [{ text: '🎫 كود ساعة' }, { text: '🎫 كود يوم' }],
    [{ text: '🎫 كود 30 يوم' }, { text: '🎫 كود 365 يوم' }],
    [{ text: '🔙 العودة للقائمة الرئيسية' }]
];

async function sendMsg(text, ik = null, kb = null) {
    const p = { chat_id: ADMIN_ID, text, parse_mode: 'HTML' };
    if (ik) p.reply_markup = { inline_keyboard: ik };
    else if (kb) p.reply_markup = { keyboard: kb, resize_keyboard: true };
    else p.reply_markup = { keyboard: mainKb, resize_keyboard: true };
    await tg('sendMessage', p);
}

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(200).send('Doma AI Webhook Vercel Endpoint OK');
    const update = req.body;
    if (!update) return res.status(200).send('OK');

    try {
        if (update.message && update.message.chat.id == ADMIN_ID_NUM) {
            await handleMessage(update.message.text);
        } else if (update.callback_query && update.callback_query.message.chat.id == ADMIN_ID_NUM) {
            await tg('answerCallbackQuery', { callback_query_id: update.callback_query.id });
            await handleCallback(update.callback_query.data);
        }
    } catch (e) {
        console.error(e);
        await sendMsg(`❌ <b>System Error!</b>\n<pre>${e.message}\n${e.stack}</pre>`);
    }

    res.status(200).send('OK');
}

async function handleMessage(text) {
    if (!text) return;
    const input = text.trim();
    if (!input) return;

    if (input === '🔙 العودة للقائمة الرئيسية' || input === '❓ المساعدة' || input === '/start' || input === '/help') {
        await clearState();
        return sendMsg("👋 <b>أهلاً بك في لوحة تحكم Doma Ai المتقدمة</b>\n\nيعمل هذا البوت على استضافة (Vercel السريعة مجاناً 100%).\n💡 استعمل الأزرار بالأسفل للتنقل.");
    }

    if (input === '📊 إحصائيات المنصة') return handleCallback('stats');
    if (input === '👥 إدارة الطلاب') return sendStudentsList(0);
    if (input === '📚 إدارة الدروس') return sendLessonsList(0);
    if (input === '➕ إضافة طالب') return handleCallback('add_student');
    if (input === '➕ إضافة درس') return handleCallback('add_lesson');
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
            return sendMsg(`✅ تم إضافة الدرس: <b>${state.tempTitle}</b>`);
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
        const icon = c.used_by && c.used_by !== '{"action":"..."}' && !c.used_by.includes("BOT_STATE_ADMIN") ? '✅' : '🟢';
        const usedBy = icon === '✅' ? c.used_by : 'لم يُستخدم';
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
                const icon = c.used_by && !c.used_by.includes("BOT_STATE_ADMIN") ? '✅' : '🟢';
                row.push({ text: `${icon} ${c.code} (${c.type === 'hours' ? c.duration + 'س' : c.duration + 'ي'})` });
            }
            kb.push(row);
        }
        kb.push([{ text: '🔙 العودة للقائمة الرئيسية' }]);
        return sendMsg(`🏷️ <b>أحدث الأكواد:</b>`, null, kb);
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

/**
 * Doma AI Bot - Vercel API Gateway (v2.4.0)
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = atob('aHR0cHM6Ly9sYWtnZGNzeXRvd25vaXlydmxpcS5zdXBhYmFzZS5jbw==');
const SUPABASE_KEY = atob('c2JfcHVibGlzaGFibGVfT2IxUjF0Ql9TV3ctcDBWeUh6R3RKQV9mbjJCREthdQ==');
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const BOT_TOKEN = '8598472216:AAE7gQmUpaWPeEgq7ZFlnTGuzedGUAQfFoU';
const SUPER_ADMIN = '682572594';
const PERMISSIONS_MAP = {
    stats: 'إحصائيات المنصة',
    broadcast: 'إذاعة تليجرام',
    site_ann: 'إعلان الموقع',
    lessons: 'إدارة الدروس',
    students: 'إدارة الطلاب',
    codes: 'الأكواد',
};

let CACHED_ADMINS_PERMS = {}; // { ID: [perms] }

async function getBotConfig() {
    try {
        const { data } = await supabase.from('users').select('password').eq('username', 'DOMA_AI_BOT').single();
        return data && data.password ? JSON.parse(data.password) : { admins: {}, announcement: {}, all_users: [] };
    } catch (e) { return { admins: {}, announcement: {}, all_users: [] }; }
}

async function saveBotConfig(config) {
    const jsonStr = JSON.stringify(config);
    const { data } = await supabase.from('users').select('id').eq('username', 'DOMA_AI_BOT').single();
    if (data) await supabase.from('users').update({ password: jsonStr }).eq('id', data.id);
    else await supabase.from('users').insert([{ username: 'DOMA_AI_BOT', password: jsonStr, role: 'system', status: 'active' }]);
}

async function fetchAdmins() {
    const config = await getBotConfig();
    CACHED_ADMINS_PERMS = config.admins || {};
    return CACHED_ADMINS_PERMS;
}

async function saveAdmins(permsMap) {
    const config = await getBotConfig();
    config.admins = permsMap;
    await saveBotConfig(config);
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

async function getState(cid) {
    const userId = cid?.toString() || SUPER_ADMIN;
    const { data } = await supabase.from('users').select('password').eq('username', `STATE_${userId}`).single();
    if (data && data.password) {
        try { return JSON.parse(data.password); } catch (e) { return {}; }
    }
    return {};
}

async function saveState(cid, state) {
    try {
        const userId = cid?.toString() || SUPER_ADMIN;
        const jsonStr = JSON.stringify(state);
        const { data } = await supabase.from('users').select('id').eq('username', `STATE_${userId}`).single();
        if (data) {
            await supabase.from('users').update({ password: jsonStr }).eq('id', data.id);
        } else {
            await supabase.from('users').insert([{ username: `STATE_${userId}`, password: jsonStr, role: 'admin', status: 'active', is_active: true, created_at: new Date().toISOString() }]);
        }
    } catch (e) {
        console.error(e);
    }
}
async function clearState(cid) { await saveState(cid, {}); }

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
        row5.push({ text: "⚙️ إدارة الأكواد" });
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
    
    // إذا مررنا ik (Inline) سنقوم بتحويله إلى kb (Reply) بناءً على رغبة المستخدم
    if (ik) {
        const rows = ik.map(row => row.map(btn => ({ text: btn.text })));
        p.reply_markup = { keyboard: rows, resize_keyboard: true };
    } else if (kb) {
        p.reply_markup = { keyboard: kb, resize_keyboard: true };
    } else if (isAdmin(cid)) {
        p.reply_markup = { keyboard: mainKb(cid), resize_keyboard: true };
    }
    await tg('sendMessage', p);
}

async function broadcast(text) {
    const config = await getBotConfig();
    const chatIds = config.all_users || [];
    
    // أضف أيضاً الطلاب الذين لديهم telegram_id ولم يرسلوا رسالة للبوت بعد (للاحتياط)
    const { data: stds } = await supabase.from('users').select('telegram_id').not('telegram_id', 'is', null);
    if (stds) {
        stds.forEach(u => {
            if (!chatIds.includes(parseInt(u.telegram_id))) chatIds.push(parseInt(u.telegram_id));
        });
    }

    let count = 0;
    for (const cid of chatIds) {
        try {
            await tg('sendMessage', { chat_id: cid, text, parse_mode: 'HTML' });
            count++;
        } catch (e) {
            console.error(`Broadcast failed for ${cid}:`, e.message);
        }
    }
    return count;
}

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(200).send('Doma AI Webhook Vercel Endpoint OK');
    
    const body = req.body;
    if (!body) return res.status(200).send('OK');

    // Handle incoming broadcast from Website
    if (body.action === 'broadcast' && body.secret === BOT_TOKEN) {
        const count = await broadcast(body.message);
        return res.status(200).json({ success: true, count });
    }

    try {
        await fetchAdmins(); // Populate cache

        if (body.message) {
            const chat = body.message.chat;
            const text = body.message.text;
            if (chat && text) {
                // Tracking all users for broadcast
                const config = await getBotConfig();
                if (!config.all_users) config.all_users = [];
                if (!config.all_users.includes(chat.id)) {
                    config.all_users.push(chat.id);
                    await saveBotConfig(config);
                }

                if (isAdmin(chat.id)) {
                    await handleMessage(text, chat.id);
                } else {
                    await handleStudentMessage(body.message);
                }
            }
        } else if (body.callback_query) {
            const { from, data, message } = body.callback_query;
            const chatId = message ? message.chat.id : from.id;

            // Tracking all users for broadcast
            const config = await getBotConfig();
            if (!config.all_users) config.all_users = [];
            if (!config.all_users.includes(from.id)) {
                config.all_users.push(from.id);
                await saveBotConfig(config);
            }

            if (isAdmin(from.id)) {
                await tg('answerCallbackQuery', { callback_query_id: body.callback_query.id });
                await handleCallback(data, chatId);
            }
        }
    } catch (e) {
        console.error("Webhook Handler Error:", e);
    }

    return res.status(200).send('OK');
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

async function handleMessage(text, chatId = null) {
    if (!text) return;
    const input = text.trim();
    if (!input) return;

    // أوامر القائمة الرئيسية - تقوم بتصفير الحالة دائماً لمنع التعارض
    const mainCommands = [
        '📊 إحصائيات المنصة', '👥 إدارة الطلاب', '📚 إدارة الدروس', 
        '➕ إضافة طالب', '⚙️ إعدادات الإدارة', '📢 إعلان الموقع', 
        '➕ إضافة درس', '📢 إذاعة إعلان', '🔍 بحث عن طالب', 
        '🔍 بحث عن درس', '🎫 توليد الأكواد', '🏷️ عرض الأكواد',
        '🔙 العودة للقائمة الرئيسية', '❓ المساعدة', '/start', '/help'
    ];

    if (mainCommands.includes(input)) {
        await clearState(chatId);
    }

    // معالجة الأزرار النصية التي كانت Inline سابقاً
    if (input.startsWith('⚙️ صلاحيات ')) {
        const id = input.match(/\(([^)]+)\)/)?.[1];
        if (id) return handleCallback(`edit_perms:${id}`, chatId);
    }
    if (input.startsWith('🗑️ حذف أدمن ')) {
        const id = input.match(/\(([^)]+)\)/)?.[1];
        if (id) return handleCallback(`conf_del_admin:${id}`, chatId);
    }
    // معالجة أزرار التفعيل والتعطيل للصلاحيات
    if (input.includes('✅') || input.includes('❌')) {
        const state = await getState(chatId);
        if (state.targetId) {
            const pk = Object.keys(PERMISSIONS_MAP).find(k => input.includes(PERMISSIONS_MAP[k]));
            if (pk) return handleCallback(`tog_perm:${state.targetId}:${pk}`, chatId);
        } else {
            return sendMsg("⚠️ الجلسة منتهية، يرجى إعادة الدخول لملف الأدمن من قائمة الأدمنز.", null, null, chatId);
        }
    }
    if (input === '⚠️ نعم، احذف الأدمن') {
        const state = await getState(chatId);
        if (state.targetId) return handleCallback(`del_admin:${state.targetId}`, chatId);
    }
    if (input === '🗑️ حذف هذا الأدمن') {
        const state = await getState(chatId);
        if (state.targetId) return handleCallback(`conf_del_admin:${state.targetId}`, chatId);
    }
    if (input === '⚠️ نعم، احذف الطالب') {
        const state = await getState(chatId);
        if (state.targetId) return handleCallback(`del_user:${state.targetId}`, chatId);
    }
    if (input === '🧨 تصفير جميع الأدمنية') {
        if (chatId.toString() !== SUPER_ADMIN.toString()) return sendMsg("⚠️ اعتذار، هذه الصلاحية متوفرة للسوبر أدمن فقط.");
        return sendMsg("💥 <b>تحذير نهائي:</b> هل تريد فعلاً حذف جميع الأدمنية وإلغاء صلاحياتهم؟", null, [[{ text: '⚠️ نعم، قم بالتصفير' }], [{ text: '🔙 رجوع' }]], chatId);
    }
    if (input === '⚠️ نعم، قم بالتصفير') {
        if (chatId.toString() !== SUPER_ADMIN.toString()) return;
        await saveAdmins({});
        // حذف سجلات الحالة (STATE_) وسجلات الإدارة المؤقتة لمسح كافة الآثار
        const { data: systemRecs } = await supabase.from('users').select('id, username').filter('username', 'ilike', 'STATE_%');
        if (systemRecs && systemRecs.length > 0) {
            await supabase.from('users').delete().in('id', systemRecs.map(r => r.id));
        }
        return sendMsg("✅ تم تصفير جميع الأدمنية وسجلات الجلسات بنجاح. أنت الآن الأدمن الوحيد.", null, null, chatId);
    }
    if (input === '➕ إضافة أدمن جديد' || input === '📋 التحكم في الصلاحيات') {
        if (chatId.toString() !== SUPER_ADMIN.toString()) return sendMsg("⚠️ اعتذار، هذه الصلاحية متوفرة للسوبر أدمن فقط.");
        return handleCallback(input === '➕ إضافة أدمن جديد' ? 'add_admin_start' : 'list_admins', chatId);
    }
    if (input === '🔙 رجوع') {
        const state = await getState(chatId);
        const action = state.action || '';
        await clearState(chatId);

        if (action.includes('student') || action.includes('user')) {
            return sendStudentsList(0, chatId);
        }
        if (action.includes('lesson')) {
            return sendLessonsList(0, chatId);
        }
        if (action.includes('coupon') || action.includes('code')) {
            return handleCallback('manage_codes', chatId);
        }
        if (action.includes('perms') || action === 'add_admin_id' || action.includes('admin')) {
            return handleCallback('list_admins', chatId);
        }
        
        return handleCallback('admin_settings', chatId);
    }

    if (input === '🔙 العودة للقائمة الرئيسية' || input === '❓ المساعدة' || input === '/start' || input === '/help') {
        await clearState(chatId);
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

        return sendMsg(input === '/start' ? "👋 أهلاً بك في لوحة تحكم Doma AI" : helpMsg, null, mainKb(chatId), chatId);
    }

    if (input === '✏️ تعديل نص الكود') {
        const state = await getState(chatId);
        if (state.targetId) return handleCallback(`edit_coupon:${state.targetId}:code`, chatId);
    }
    if (input === '🔑 تغيير كلمة المرور') {
        const state = await getState(chatId);
        if (state.targetId) {
            state.action = 'edit_user_pass';
            await saveState(chatId, state);
            return sendMsg("🔑 أرسل <b>كلمة المرور الجديدة</b> للطالب:", null, [[{ text: '🔙 رجوع' }]], chatId);
        }
    }
    if (input === '⏳ تغيير مدة الاشتراك') {
        const state = await getState(chatId);
        if (state.targetId) {
            state.action = 'edit_user_dur_final';
            await saveState(chatId, state);
            const ik = [[{ text: '🕒 ساعة' }, { text: '📅 يوم' }], [{ text: '📅 30 يوم' }, { text: '📅 سنة' }]];
            return sendMsg("⏳ أرسل <b>المدة الجديدة</b> (مثال: 30) أو اختر من الأسفل:", ik, [[{ text: '🔙 رجوع' }]], chatId);
        }
    }
    if (input === '🚫 حظر الطالب' || input === '✅ رفع الحظر') {
        const state = await getState(chatId);
        if (state.targetId) {
            const status = input === '🚫 حظر الطالب' ? 'banned' : 'active';
            await supabase.from('users').update({ status }).eq('id', state.targetId);
            return sendMsg(`✅ تم ${status === 'banned' ? 'حظر' : 'تفعيل'} الطالب بنجاح.`, null, null, chatId);
        }
    }
    if (input === '🗑️ حذف الطالب') {
        const state = await getState(chatId);
        if (state.targetId) {
            return sendMsg("❓ <b>هل أنت متأكد من حذف هذا الطالب نهائياً؟</b>", null, [[{ text: '⚠️ نعم، احذف الطالب' }], [{ text: '🔙 رجوع' }]], chatId);
        }
    }
    if (input === '⏳ تعديل المدة') {
        const state = await getState(chatId);
        if (state.targetId) return handleCallback(`edit_coupon:${state.targetId}:dur`, chatId);
    }
    if (input === '🗑️ حذف الكود') {
        const state = await getState(chatId);
        if (state.targetId) return handleCallback(`del_coupon:${state.targetId}`, chatId);
    }
    if (input === '✏️ تعديل الدرس') {
        const state = await getState(chatId);
        if (state.targetId) {
            state.action = 'edit_lesson_title';
            await saveState(chatId, state);
            return sendMsg("✏️ أرسل <b>العنوان الجديد</b> (أو أرسل 'نفسه' للمتابعة):", null, [[{ text: 'نفسه' }], [{ text: '🔙 رجوع' }]], chatId);
        }
    }
    if (input === '🗑️ حذف الدرس') {
        const state = await getState(chatId);
        if (state.targetId) {
            return sendMsg("❓ <b>هل أنت متأكد من حذف هذا الدرس نهائياً؟</b>", null, [[{ text: '⚠️ نعم، احذف الدرس' }], [{ text: '🔙 رجوع' }]], chatId);
        }
    }
    if (input === '⚠️ نعم، احذف الدرس') {
        const state = await getState(chatId);
        if (state.targetId) return handleCallback(`del_lesson:${state.targetId}`, chatId);
    }

    if (input === '📊 إحصائيات المنصة') return handleCallback('stats', chatId);
    if (input === '⏳ عرض الطلاب المنتهيين') return handleCallback('list_expired', chatId);
    if (input === '👥 إدارة الطلاب') return sendStudentsList(0, chatId);
    if (input === '📚 إدارة الدروس') return sendLessonsList(0, chatId);
    if (input === '➕ إضافة طالب') return handleCallback('add_student', chatId);
    if (input === '⚙️ إعدادات الإدارة') return handleCallback('admin_settings', chatId);
    if (input === '📢 إعلان الموقع') return handleCallback('site_announcement', chatId);
    if (input === '➕ إضافة درس') return handleCallback('add_lesson', chatId);
    if (input === '📢 إذاعة إعلان') return handleCallback('start_broadcast', chatId);
    if (input === '🔍 بحث عن طالب') return handleCallback('search_student', chatId);
    if (input === '🔍 بحث عن درس') return handleCallback('search_lesson', chatId);
    if (input === '🎫 توليد الأكواد') return sendMsg('🎫 <b>اختر مدة الكود:</b>', null, codesKb, chatId);
    if (input === '🏷️ عرض الأكواد') return handleCallback('show_codes', chatId);
    if (input === '⚙️ إدارة الأكواد') return handleCallback('manage_codes', chatId);

    if (input.startsWith('🎫 كود')) {
        let dur = '1d';
        if (input.includes('ساعة')) dur = '1h';
        else if (input.includes('365')) dur = '365d';
        else if (input.includes('30')) dur = '30d';
        return handleCallback(`gen_code:${dur}`, chatId);
    }

    if (input.startsWith('👤 ')) {
        const uname = input.replace(/^👤\s*[🟢🔴❓🚫🟡✅]\s*/u, '').trim();
        const { data: user } = await supabase.from('users').select('id').eq('username', uname).single();
        if (user) return handleCallback(`student_info:${user.id}`, chatId);
        return sendMsg(`❌ الطالب غير موجود: ${uname}`, null, null, chatId);
    }
    if (input.startsWith('📖 ')) {
        const title = input.replace(/^📖\s*/u, '').trim();
        const { data: l } = await supabase.from('lessons').select('id').eq('title', title).single();
        if (l) return handleCallback(`lesson_info:${l.id}`, chatId);
        return sendMsg(`❌ الدرس غير موجود: ${title}`, null, null, chatId);
    }
    if (input.startsWith('⚙️ كود ')) {
        const cname = input.replace(/^⚙️ كود\s*/u, '').split(' ')[0].trim();
        const { data: c } = await supabase.from('coupons').select('id').eq('code', cname).single();
        if (c) return handleCallback(`coupon_info:${c.id}`, chatId);
        return sendMsg(`❌ الكود غير موجود: ${cname}`, null, null, chatId);
    }

    const p1 = input.match(/طلاب ص (\d+)/);
    if (p1) return sendStudentsList(parseInt(p1[1]) - 1, chatId);
    const p2 = input.match(/دروس ص (\d+)/);
    if (p2) return sendLessonsList(parseInt(p2[1]) - 1, chatId);

    // STATE HANDLING
    const state = await getState(chatId);
    if (state.action) {
        const action = state.action;

        if (action === 'edit_coupon_code') {
            await clearState(chatId);
            const newCode = input.toUpperCase();
            await supabase.from('coupons').update({ code: newCode }).eq('id', state.targetId);
            return sendMsg(`✅ تم تغيير الكود بنجاح!\nالكود الجديد: <code>${newCode}</code>`, null, [[{text: '🔙 العودة للقائمة الرئيسية'}]], chatId);
        }
        if (action === 'edit_coupon_dur') {
            const newDur = parseInt(input);
            if (isNaN(newDur)) return sendMsg("❌ يرجى إرسال رقم صحيح للمدة.", null, null, chatId);
            state.tempDur = newDur;
            state.action = 'edit_coupon_type';
            await saveState(chatId, state);
            return sendMsg(`⏳ المدة: <b>${newDur}</b>\nاختر نوع المدة:`, [[{text: '🕒 ساعة', callback_data: 'edit_coupon_type:hours'}, {text: '📅 يوم', callback_data: 'edit_coupon_type:days'}]], null, chatId);
        }

        if (action === 'broadcast_mode') {
            await clearState(chatId);
            await sendMsg("⏳ جاري الإذاعة...", null, null, chatId);
            const count = await broadcast(`📢 <b>إعلان جديد:</b>\n\n${input}`);
            return sendMsg(`✅ تم إرسال الإعلان إلى <b>${count}</b> مستخدم.`, null, null, chatId);
        }

        if (action === 'add_admin_id') {
            await clearState(chatId);
            const newId = input.trim();
            if (!/^\d+$/.test(newId)) return sendMsg("❌ يرجى إرسال معرف (ID) صحيح (أرقام فقط).", null, null, chatId);
            const permsMap = await fetchAdmins();
            if (permsMap[newId]) return sendMsg("⚠️ هذا المستخدم أدمن بالفعل.", null, null, chatId);
            permsMap[newId] = []; // يبدأ بدون صلاحيات، قم بتعديلها من لوحة الإدارة
            await saveAdmins(permsMap);
            return sendMsg(`✅ تم إضافة الأدمن بنجاح!\nID: <code>${newId}</code>\n\nقم الآن بتخصيص صلاحياته من قائمة "إدارة الأدمنز".`, null, null, chatId);
        }

        if (action === 'site_ann_text') {
            state.tempText = input;
            state.action = 'site_ann_btn_text';
            await saveState(chatId, state);
            return sendMsg(`📝 النص: <b>${input}</b>\nأرسل <b>نص الزر</b> (مثال: اشترك الآن) أو أرسل "بدون":`, null, null, chatId);
        }
        if (action === 'site_ann_btn_text') {
            state.tempBtn = input === 'بدون' ? '' : input;
            state.action = 'site_ann_url';
            await saveState(chatId, state);
            return sendMsg(`🔘 الزر: <b>${state.tempBtn || 'بدون'}</b>\nأرسل <b>رابط الزر</b> (مثال: https://...) أو "بدون":`, null, null, chatId);
        }
        if (action === 'site_ann_url') {
            const url = input === 'بدون' ? '' : input;
            const announceObj = { text: state.tempText, buttonText: state.tempBtn, buttonUrl: url };
            await clearState(chatId);
            await updateSiteAnnouncement(announceObj);
            await broadcast(`🔔 <b>إعلان جديد في الموقع:</b>\n\n${state.tempText}`);
            return sendMsg("✅ تم تحديث إعلان الموقع وإرسال تنبيه للطلاب!", null, null, chatId);
        }

        if (action === 'add_user_name') {
            state.tempName = input;
            state.action = 'add_user_pass';
            await saveState(chatId, state);
            return sendMsg(`👤 الاسم: <b>${input}</b>\nأرسل <b>كلمة المرور</b>:`, null, null, chatId);
        }
        if (action === 'add_user_pass') {
            state.tempPass = input;
            state.action = 'add_user_dur';
            await saveState(chatId, state);
            const ik = [
                [{ text: '🕒 ساعة' }, { text: '📅 يوم' }],
                [{ text: '📅 30 يوم' }, { text: '📅 سنة' }]
            ];
            return sendMsg(`✅ تم حفظ كلمة المرور.\nاختر مدة التفعيل المبدئية للطالب:`, ik, null, chatId);
        }
        if (action === 'add_user_dur') {
            let d = 1, t = 'days', ar = 'يوم';
            if (input.includes('ساعة')) { t = 'hours'; ar = 'ساعة'; }
            else if (input.includes('30')) { d = 30; }
            else if (input.includes('365') || input.includes('سنة')) { d = 365; }

            const ms = t === 'hours' ? d * 3600000 : d * 24 * 3600000;
            const expiry = new Date(Date.now() + ms).toISOString();

            await supabase.from('users').insert([{
                username: state.tempName,
                password: state.tempPass,
                role: 'student',
                status: 'active',
                is_active: true,
                expiry_date: expiry,
                created_at: new Date().toISOString()
            }]);

            await clearState(chatId);
            return sendMsg(`✅ تم إضافة الطالب وتفعيله بنجاح!\n👤 الاسم: <code>${state.tempName}</code>\n🔑 الباسورد: <code>${state.tempPass}</code>\n📅 ينتهي: ${new Date(expiry).toLocaleDateString()}`, null, null, chatId);
        }
        if (action === 'edit_user_pass') {
            await clearState(chatId);
            await supabase.from('users').update({ password: input }).eq('id', state.targetId);
            return sendMsg(`✅ تم تحديث كلمة مرور الطالب إلى:\n<code>${input}</code>`, null, null, chatId);
        }

        if (action === 'edit_user_dur_final') {
            let d = parseInt(input), t = 'days';
            if (isNaN(d)) {
                if (input.includes('ساعة')) { d = 1; t = 'hours'; }
                else if (input.includes('30')) { d = 30; }
                else if (input.includes('365') || input.includes('سنة')) { d = 365; }
                else { d = 1; }
            }
            const ms = t === 'hours' ? d * 3600000 : d * 24 * 3600000;
            const expiry = new Date(Date.now() + ms).toISOString();
            await supabase.from('users').update({ expiry_date: expiry, status: 'active', is_active: true }).eq('id', state.targetId);
            await clearState(chatId);
            return sendMsg(`✅ تم تحديث مدة الاشتراك بنجاح!\n📅 ينتهي في: ${new Date(expiry).toLocaleDateString()}`, null, null, chatId);
        }

        if (action === 'search_student') {
            await clearState(chatId);
            const { data: users } = await supabase.from('users').select('*');
            const q = input.toLowerCase();
            const systemUsers = ['admin', 'ANNOUNCEMENT_DATA', 'ADMIN_CONFIG_LIST_V2', 'STATE', 'BOT_STATE_ADMIN'];
            const res = (users || []).filter(u => u.role !== 'admin' && !systemUsers.includes(u.username) && !u.username.startsWith('DOMA_AI_') && (u.username || '').toLowerCase().includes(q));
            if (!res.length) return sendMsg('🔍 لا توجد نتائج.', null, null, chatId);
            const now = new Date();
            if (res.length === 1) {
                const u = res[0];
                const isExpired = u.expiry_date && new Date(u.expiry_date) < now;
                const icon = u.status === 'pending' ? '❓' : (isExpired || u.status === 'banned' ? '🔴' : '🟢');
                return sendMsg('🔍 تم العثور على طالب واحد:', [[{ text: `${icon} ${u.username}`, callback_data: `student_info:${u.id}` }]], null, chatId);
            }
            const ik = res.slice(0, 15).map(u => {
                const isExpired = u.expiry_date && new Date(u.expiry_date) < now;
                const icon = u.status === 'pending' ? '❓' : (isExpired || u.status === 'banned' ? '🔴' : '🟢');
                return [{ text: `${icon} ${u.username}`, callback_data: `student_info:${u.id}` }];
            });
            return sendMsg(`🔍 <b>نتائج البحث (${res.length}):</b>`, ik, null, chatId);
        }
        if (action === 'search_lesson') {
            await clearState(chatId);
            const q = input.toLowerCase();
            const { data: lessons } = await supabase.from('lessons').select('*');
            const res = (lessons || []).filter(l => (l.title || '').toLowerCase().includes(q) || (l.description || '').toLowerCase().includes(q));
            if (!res.length) return sendMsg('🔍 لا توجد دروس.', null, null, chatId);
            if (res.length === 1) return sendMsg('🔍 تم العثور على درس واحد:', [[{ text: `📖 ${res[0].title}`, callback_data: `lesson_info:${res[0].id}` }]], null, chatId);
            const ik = res.slice(0, 15).map(l => [{ text: `📖 ${l.title}`, callback_data: `lesson_info:${l.id}` }]);
            return sendMsg(`🔍 <b>نتائج البحث (${res.length}):</b>`, ik, null, chatId);
        }

        if (action === 'add_lesson_title') {
            state.tempTitle = input;
            state.action = 'add_lesson_url';
            await saveState(chatId, state);
            return sendMsg(`📚 العنوان: <b>${input}</b>\nأرسل <b>رابط الدرس</b>:`, null, null, chatId);
        }
        if (action === 'add_lesson_url') {
            state.tempUrl = input;
            state.action = 'add_lesson_desc';
            await saveState(chatId, state);
            return sendMsg(`📝 أرسل <b>الوصف</b> (أو "لا يوجد"):`, null, null, chatId);
        }
        if (action === 'add_lesson_desc') {
            await clearState(chatId);
            const desc = input === 'لا يوجد' ? '' : input;
            await supabase.from('lessons').insert([{ title: state.tempTitle, url: state.tempUrl, description: desc, created_at: new Date().toISOString() }]);
            await broadcast(`📖 <b>درس جديد بانتظارك:</b>\n\nالعنوان: <b>${state.tempTitle}</b>\n${desc ? `الوصف: ${desc}` : ''}`);
            return sendMsg(`✅ تم إضافة الدرس وإرسال تنبيه للطلاب!`, null, null, chatId);
        }

        if (action === 'edit_lesson_title') {
            if (input !== 'نفسه') state.tempTitle = input;
            state.action = 'edit_lesson_url';
            await saveState(chatId, state);
            return sendMsg(`🔗 أرسل <b>الرابط الجديد</b>\n(أو "نفسه"):`, null, null, chatId);
        }
        if (action === 'edit_lesson_url') {
            if (input !== 'نفسه') state.tempUrl = input;
            state.action = 'edit_lesson_desc';
            await saveState(chatId, state);
            return sendMsg(`📝 أرسل <b>الوصف الجديد</b>\n(أو "نفسه"):`, null, null, chatId);
        }
        if (action === 'edit_lesson_desc') {
            await clearState(chatId);
            const { data } = await supabase.from('lessons').select('*').eq('id', state.targetId).single();
            if (!data) return sendMsg('❌ الدرس غير موجود.', null, null, chatId);
            const upd = {
                title: state.tempTitle || data.title,
                url: state.tempUrl || data.url,
                description: input === 'نفسه' ? data.description : (input === 'لا يوجد' ? '' : input)
            };
            await supabase.from('lessons').update(upd).eq('id', state.targetId);
            return sendMsg(`✅ تم تحديث الدرس!`, null, null, chatId);
        }
    }

    // --- ربط حساب الطالب بالبوت ---
    // إذا أرسل المستخدم اسم حساب طالب وهو ليس أدمن، نقوم بربطه
    if (!isAdmin(chatId)) {
        const { data: uLink } = await supabase.from('users').select('*').eq('username', input).single();
        if (uLink && uLink.role === 'student') {
            await supabase.from('users').update({ telegram_id: chatId.toString() }).eq('id', uLink.id);
            return sendMsg(`✅ <b>تم ربط حسابك بنجاح!</b>\n👤 الطالب: <code>${uLink.username}</code>\n\nستصلك الآن كافة التنبيهات والإشعارات الرسمية هنا.`, null, null, chatId);
        }
    }
}

async function handleCallback(data, chatId = null) {
    const cid = chatId || SUPER_ADMIN;

    const adminActions = ['admin_settings', 'add_admin_start', 'list_admins', 'edit_perms:', 'tog_perm:', 'conf_del_admin:', 'del_admin:'];
    if (adminActions.some(a => data.startsWith(a))) {
        if (cid.toString() !== SUPER_ADMIN.toString()) return sendMsg("⚠️ اعتذار، هذه الصلاحية متوفرة للسوبر أدمن فقط.");
    }

    // --- إعدادات الإدارة (أدمنز وصلاحيات) ---
    if (data === 'admin_settings') {
        const kb = [[{ text: '➕ إضافة أدمن جديد' }], [{ text: '📋 التحكم في الصلاحيات' }], [{ text: '🔙 العودة للقائمة الرئيسية' }]];
        return sendMsg("⚙️ <b>إعدادات الإدارة:</b>\nيمكنك إضافة أدمنز وتحديد صلاحياتهم.", null, kb, cid);
    }
    if (data === 'add_admin_start') {
        await saveState(cid, { action: 'add_admin_id' });
        return sendMsg("👤 أرسل <b>Telegram ID</b> للأدمن الجديد:", null, [[{ text: '🔙 رجوع' }]], cid);
    }
    if (data === 'list_admins') {
        const permsMap = await fetchAdmins();
        const ids = Object.keys(permsMap).filter(id => id !== SUPER_ADMIN);
        let msg = "📋 <b>إدارة الأدمنز:</b>\n\n👑 <b>أنت (Super Admin)</b>\n\n";
        const kb = [];
        for (const id of ids) {
            let name = null;
            const res = await tg('getChat', { chat_id: id });
            if (res.ok) name = res.result.first_name;
            msg += `• 👤 <b>${name || id}</b> (<code>${id}</code>)\n`;
            kb.push([{ text: `⚙️ صلاحيات (${id})` }]);
        }
        if (ids.length > 0) kb.push([{ text: '🧨 تصفير جميع الأدمنية' }]);
        kb.push([{ text: '🔙 رجوع' }]);
        return sendMsg(msg, null, kb, cid);
    }
    if (data.startsWith('edit_perms:')) {
        const id = data.split(':')[1];
        const perms = CACHED_ADMINS_PERMS[id] || [];
        await saveState(cid, { action: 'editing_perms', targetId: id });
        let msg = `⚙️ <b>صلاحيات الأدمن:</b> (<code>${id}</code>)\nاختر الصلاحية لتبديل حالتها:`;
        const kb = [];
        Object.keys(PERMISSIONS_MAP).forEach(pk => {
            const has = perms.includes(pk);
            kb.push([{ text: `${has ? '✅' : '❌'} ${PERMISSIONS_MAP[pk]}` }]);
        });
        kb.push([{ text: '🗑️ حذف هذا الأدمن' }, { text: '🔙 رجوع' }]);
        return sendMsg(msg, null, kb, cid);
    }
    if (data.startsWith('tog_perm:')) {
        const [, id, pk] = data.split(':');
        const perms = CACHED_ADMINS_PERMS[id] || [];
        CACHED_ADMINS_PERMS[id] = perms.includes(pk) ? perms.filter(x => x !== pk) : [...perms, pk];
        await saveAdmins(CACHED_ADMINS_PERMS);
        const status = CACHED_ADMINS_PERMS[id].includes(pk) ? 'تم تفعيل' : 'تم تعطيل';
        await tg('sendMessage', { chat_id: cid, text: `🔹 <b>تحديث:</b> ${status} صلاحية (<b>${PERMISSIONS_MAP[pk]}</b>) للأدمن بنجاح.`, parse_mode: 'HTML' });
        return handleCallback(`edit_perms:${id}`, cid);
    }
    if (data.startsWith('conf_del_admin:')) {
        const id = data.split(':')[1];
        await saveState(cid, { targetId: id, action: 'conf_del_admin' });
        return sendMsg(`❓ حذف الأدمن <code>${id}</code>؟`, null, [[{ text: '⚠️ نعم، احذف الأدمن' }, { text: '🔙 رجوع' }]], cid);
    }
    if (data.startsWith('del_admin:')) {
        const id = data.split(':')[1];
        delete CACHED_ADMINS_PERMS[id];
        await saveAdmins(CACHED_ADMINS_PERMS);
        await clearState(cid);
        return sendMsg(`✅ تم حذف الأدمن.`, null, null, cid);
    }

    // --- إحصائيات وبث ---
    if (data === 'stats') {
        const [{ data: users }, { data: lessons }, { data: coupons }] = await Promise.all([supabase.from('users').select('*'), supabase.from('lessons').select('id'), supabase.from('coupons').select('id')]);
        const systemUsers = ['admin', 'ANNOUNCEMENT_DATA', 'ADMIN_CONFIG_LIST_V2', 'STATE', 'BOT_STATE_ADMIN'];
        const std = (users || []).filter(u => u.role !== 'admin' && !systemUsers.includes(u.username) && !u.username.startsWith('DOMA_AI_'));
        const now = Date.now();
        const online = std.filter(u => u.last_active && (now - new Date(u.last_active).getTime() < 180000)).length;
        const active = std.filter(u => u.status === 'active' && (!u.expiry_date || new Date(u.expiry_date) > now)).length;
        const expired = std.filter(u => ['active', 'pending'].includes(u.status) && u.expiry_date && new Date(u.expiry_date) <= now).length;
        const expiredCount = expired;
        const kb = expiredCount > 0 ? [[{ text: '⏳ عرض الطلاب المنتهيين' }], [{ text: '🔙 العودة للقائمة الرئيسية' }]] : null;
        return sendMsg(`📊 <b>إحصائيات:</b>\n👥 إجمالي: ${std.length}\n🟢 نشطون: ${active}\n⏳ منتهية: ${expiredCount}\n🔴 محظورون: ${std.filter(u => u.status === 'banned').length}\n🌐 الان: ${online}\n📚 دروس: ${lessons?.length || 0}\n🎫 أكواد: ${coupons?.length || 0}`, null, kb, cid);
    }
    if (data === 'list_expired') {
        const { data: users } = await supabase.from('users').select('*');
        const now = Date.now();
        const systemUsers = ['admin', 'ANNOUNCEMENT_DATA', 'ADMIN_CONFIG_LIST_V2', 'STATE', 'BOT_STATE_ADMIN'];
        const expired = (users || []).filter(u => u.role !== 'admin' && !systemUsers.includes(u.username) && !u.username.startsWith('DOMA_AI_') && ['active', 'pending'].includes(u.status) && u.expiry_date && new Date(u.expiry_date) <= now);
        if (expired.length === 0) return sendMsg("✅ لا يوجد طلاب منتهية اشتراكاتهم حالياً.", null, null, cid);
        let msg = `⏳ <b>قائمة الطلاب المنتهين (${expired.length}):</b>\n\n`;
        const kb = [];
        expired.forEach(u => {
            msg += `• 👤 <code>${u.username}</code> (انتهى: ${new Date(u.expiry_date).toLocaleDateString()})\n`;
            kb.push([{ text: `👤 🔴 ${u.username}` }]);
        });
        kb.push([{ text: '🔙 العودة للقائمة الرئيسية' }]);
        return sendMsg(msg, null, kb, cid);
    }
    if (data === 'start_broadcast') {
        await saveState(cid, { action: 'broadcast_mode' });
        return sendMsg("📢 أرسل نص الإعلان للإذاعة:", null, [[{ text: '🔙 العودة للقائمة الرئيسية' }]], cid);
    }

    // --- تفعيل الطالب من التنبيهات ---
    if (data.startsWith('choose_act:')) {
        const username = data.split(':')[1];
        const ik = [
            [{ text: '🕒 ساعة', callback_data: `act_user:${username}:1h` }, { text: '📅 يوم', callback_data: `act_user:${username}:1d` }],
            [{ text: '📅 30 يوم', callback_data: `act_user:${username}:30d` }, { text: '📅 سنة', callback_data: `act_user:${username}:365d` }]
        ];
        // ملاحظة: نستخدم tg مباشرة لإرسال أزرار Inline (التي يسميها البوت ik هنا) لأن sendMsg يحولها لـ ReplyKeyboard
        return tg('sendMessage', { 
            chat_id: cid, 
            text: `👤 تفعيل الطالب: <b>${username}</b>\nاختر مدة التفعيل:`, 
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: ik }
        });
    }

    if (data.startsWith('act_user:')) {
        const [, username, dStr] = data.split(':');
        let d = 1, t = 'days', ar = 'يوم';
        if (dStr === '1h') { t = 'hours'; ar = 'ساعة'; }
        else if (dStr === '30d') { d = 30; }
        else if (dStr === '365d') { d = 365; }

        const ms = t === 'hours' ? d * 3600000 : d * 24 * 3600000;
        const expiry = new Date(Date.now() + ms).toISOString();

        await supabase.from('users').update({
            status: 'active',
            is_active: true,
            expiry_date: expiry
        }).eq('username', username);

        return sendMsg(`✅ تم تفعيل اشتراك الطالب <b>${username}</b> بنجاح!\n📅 ينتهي في: ${new Date(expiry).toLocaleDateString()}`, null, null, cid);
    }

    // 3. إدارة الطلاب
    if (data === 'add_student') { await saveState(cid, { action: 'add_user_name' }); return sendMsg("👤 أرسل اسم الطالب الجديد:", null, null, cid); }
    if (data === 'search_student') { await saveState(cid, { action: 'search_student' }); return sendMsg("🔍 أرسل اسم الطالب للبحث عنه:", null, null, cid); }
    if (data.startsWith('student_info:')) {
        const id = data.split(':')[1];
        const { data: user } = await supabase.from('users').select('*').eq('id', id).single();
        if (!user) return sendMsg("❌ الطالب غير موجود.");
        await saveState(cid, { targetId: id, action: 'viewing_student' });
        
        const now = new Date();
        const isExpired = user.expiry_date && new Date(user.expiry_date) < now;
        let icon = '🟢';
        if (user.status === 'pending') icon = '❓';
        else if (isExpired || user.status === 'banned') icon = '🔴';
        
        const expiry = user.expiry_date ? new Date(user.expiry_date).toLocaleDateString() : 'غير محدد';
        const msg = `${icon} <b>بيانات الطالب:</b>\n👤 اليوزر: <code>${user.username}</code>\n📊 الحالة: ${user.status === 'active' ? 'فعّال' : 'محظور'}\n📅 الانتهاء: ${expiry}`;
        const kb = [[{ text: '⏳ تغيير مدة الاشتراك' }, { text: '🔑 تغيير كلمة المرور' }], [{ text: user.status === 'banned' ? '✅ رفع الحظر' : '🚫 حظر الطالب' }, { text: '🗑️ حذف الطالب' }], [{ text: '🔙 رجوع' }]];
        return sendMsg(msg, null, kb, cid);
    }
    if (data.startsWith('del_user:')) {
        await supabase.from('users').delete().eq('id', data.split(':')[1]);
        await clearState(cid);
        return sendMsg(`✅ تم حذف الطالب بنجاح.`, null, null, cid);
    }

    // 4. إدارة الدروس
    if (data === 'add_lesson') { await saveState(cid, { action: 'add_lesson_title' }); return sendMsg("📚 أرسل عنوان الدرس الجديد:", null, null, cid); }
    if (data === 'search_lesson') { await saveState(cid, { action: 'search_lesson' }); return sendMsg("🔍 أرسل عنوان الدرس للبحث عنه:", null, null, cid); }
    if (data.startsWith('lesson_info:')) {
        const id = data.split(':')[1];
        const { data: l } = await supabase.from('lessons').select('*').eq('id', id).single();
        if (!l) return;
        await saveState(cid, { targetId: id, action: 'viewing_lesson' });
        const kb = [[{ text: '✏️ تعديل الدرس' }, { text: '🗑️ حذف الدرس' }], [{ text: '🔙 رجوع' }]];
        return sendMsg(`📖 <b>${l.title}</b>\n🔗 ${l.url}\n📝 ${l.description || 'لا يوجد'}`, null, kb, cid);
    }
    if (data.startsWith('del_lesson:')) {
        await supabase.from('lessons').delete().eq('id', data.split(':')[1]);
        await clearState(cid);
        return sendMsg(`✅ تم حذف الدرس بنجاح.`, null, null, cid);
    }

    // 5. إعدادات الموقع والأكواد
    if (data === 'site_announcement') {
        const kb = [[{ text: '📝 تعديل إعلان الموقع' }], [{ text: '🗑️ حذف إعلان الموقع' }], [{ text: '🔙 العودة للقائمة الرئيسية' }]];
        return sendMsg("📢 إعدادات شريط الموقع العلوي:", null, kb, cid);
    }
    if (data === 'show_codes') {
        const { data: cols } = await supabase.from('coupons').select('*');
        const filtered = (cols || []).filter(c => c && c.code && c.code !== 'BOT_STATE_ADMIN').sort((a, b) => b.id - a.id).slice(0, 40);
        if (!filtered.length) return sendMsg("❌ لا توجد أكواد حالياً.", null, [[{ text: '🔙 العودة للقائمة الرئيسية' }]], cid);
        let msg = "🏷️ <b>أحدث 40 كود:</b>\n<i>(اضغط على الكود لنسخه)</i>\n\n";
        filtered.forEach((c, i) => { msg += `${i+1}. <code>${c.code}</code> (${c.duration}${c.type === 'hours' ? 'س' : 'ي'})\n`; });
        const kb = [[{ text: '🎫 توليد الأكواد' }], [{ text: '🔙 العودة للقائمة الرئيسية' }]];
        return sendMsg(msg, null, kb, cid);
    }
    if (data === 'manage_codes') {
        const { data: cols } = await supabase.from('coupons').select('*');
        const filtered = (cols || []).filter(c => c && c.code && c.code !== 'BOT_STATE_ADMIN').sort((a, b) => b.id - a.id).slice(0, 15);
        if (!filtered.length) return sendMsg("❌ لا توجد أكواد لإدارتها حالياً.", null, [[{ text: '🔙 العودة للقائمة الرئيسية' }]], cid);
        const kb = filtered.map(c => [{ text: `⚙️ كود ${c.code} (${c.duration}${c.type === 'hours' ? 'س' : 'ي'})` }]);
        kb.push([{ text: '🔙 العودة للقائمة الرئيسية' }]);
        return sendMsg(`⚙️ <b>إدارة الأكواد:</b>\nاختر كوداً للتعديل أو الحذف:`, null, kb, cid);
    }
    if (data.startsWith('coupon_info:')) {
        const id = data.split(':')[1];
        const { data: c } = await supabase.from('coupons').select('*').eq('id', id).single();
        if (!c) return;
        await saveState(cid, { targetId: id, action: 'viewing_coupon' });
        const kb = [[{ text: '✏️ تعديل نص الكود' }, { text: '⏳ تعديل المدة' }], [{ text: '🗑️ حذف الكود' }, { text: '🔙 رجوع' }]];
        return sendMsg(`🎫 <b>بيانات الكود:</b>\n\nالكود: <code>${c.code}</code>\nالمدة: ${c.duration} ${c.type === 'hours' ? 'ساعة' : 'يوم'}`, null, kb, cid);
    }
    if (data.startsWith('edit_coupon:')) {
        const [, id, step] = data.split(':');
        if (step === 'code') {
            await saveState(cid, { targetId: id, action: 'edit_coupon_code' });
            return sendMsg("✏️ أرسل <b>النص الجديد</b> للكود:", null, null, cid);
        }
        if (step === 'dur') {
            await saveState(cid, { targetId: id, action: 'edit_coupon_dur' });
            return sendMsg("⏳ أرسل <b>المدة الجديدة</b> (أرقام فقط):", null, null, cid);
        }
    }
    if (data.startsWith('edit_coupon_type:')) {
        const type = data.split(':')[1];
        const state = await getState(cid);
        if (!state.targetId || !state.tempDur) return;
        await supabase.from('coupons').update({ duration: state.tempDur, type: type }).eq('id', state.targetId);
        await clearState(cid);
        return sendMsg("✅ تم تحديث مدة الكود بنجاح!", null, [[{ text: '🔙 العودة للقائمة الرئيسية' }]], cid);
    }
    if (data.startsWith('del_coupon:')) {
        const id = data.split(':')[1];
        await supabase.from('coupons').delete().eq('id', id);
        return sendMsg("✅ تم حذف الكود بنجاح.", null, [[{ text: '🔙 العودة للقائمة الرئيسية' }]], cid);
    }
    if (data.startsWith('gen_code:')) {
        const dStr = data.split(':')[1];
        let d = 1, t = 'days', ar = 'يوم';
        if (dStr === '1h') { t = 'hours'; ar = 'ساعة'; } else if (dStr === '30d') { d = 30; } else if (dStr === '365d') { d = 365; }
        const code = Math.random().toString(36).substring(2, 10).toUpperCase();
        await supabase.from('coupons').insert([{ code, duration: d, type: t, created_at: new Date().toISOString() }]);
        return sendMsg(`✅ تم توليد كود جديد:\n<code>${code}</code>\n⏳ ${d} ${ar}`, null, null, cid);
    }

    if (data === 'cancel') { await clearState(cid); return sendMsg("تم الإلغاء والعودة للقائمة الرئيسية.", null, null, cid); }
}

async function sendStudentsList(page, chatId = null) {
    const cid = chatId || SUPER_ADMIN;
    const { data: users } = await supabase.from('users').select('*');
    const systemUsers = ['admin', 'ANNOUNCEMENT_DATA', 'ADMIN_CONFIG_LIST_V2', 'STATE', 'BOT_STATE_ADMIN'];
    // فلترة المديرين وأيضاً سجلات النظام لضمان قائمة نظيفة
    const stds = (users || []).filter(u => u.role !== 'admin' && !systemUsers.includes(u.username) && !u.username.startsWith('DOMA_AI_')).sort((a, b) => b.id - a.id);
    const pageSize = 10;
    const totalPages = Math.max(1, Math.ceil(stds.length / pageSize));
    const slice = stds.slice(page * pageSize, (page * pageSize) + pageSize);
    const kb = [];
    const now = new Date();
    for (let i = 0; i < slice.length; i += 2) {
        const row = [];
        for (let j = i; j < Math.min(i + 2, slice.length); j++) {
            const u = slice[j];
            const isExpired = u.expiry_date && new Date(u.expiry_date) < now;
            let icon = '🟢';
            if (u.status === 'pending') icon = '❓';
            else if (isExpired || u.status === 'banned') icon = '🔴';
            
            row.push({ text: `👤 ${icon} ${u.username}` });
        }
        kb.push(row);
    }
    const nav = [];
    if (page > 0) nav.push({ text: `⬅️ طلاب ص ${page}` });
    if (page < totalPages - 1) nav.push({ text: `طلاب ص ${page + 2} ➡️` });
    if (nav.length) kb.push(nav);
    kb.push([{ text: '🔙 العودة للقائمة الرئيسية' }]);
    return sendMsg(`👥 قائمة الطلاب (${page + 1}/${totalPages}):`, null, kb, cid);
}

async function sendLessonsList(page, chatId = null) {
    const cid = chatId || SUPER_ADMIN;
    const { data: ls } = await supabase.from('lessons').select('*');
    const sorted = (ls || []).sort((a, b) => b.id - a.id);
    const pageSize = 10;
    const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
    const slice = sorted.slice(page * pageSize, (page * pageSize) + pageSize);
    const kb = slice.map(l => [{ text: `📖 ${l.title}` }]);
    const nav = [];
    if (page > 0) nav.push({ text: `⬅️ دروس ص ${page}` });
    if (page < totalPages - 1) nav.push({ text: `دروس ص ${page + 2} ➡️` });
    if (nav.length) kb.push(nav);
    kb.push([{ text: '🔙 العودة للقائمة الرئيسية' }]);
    return sendMsg(`📚 قائمة الدروس (${page + 1}/${totalPages}):`, null, kb, cid);
}

async function updateSiteAnnouncement(obj) {
    const config = await getBotConfig();
    config.announcement = obj;
    await saveBotConfig(config);
}


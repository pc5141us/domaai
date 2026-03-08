export default async function handler(req, res) {
    const BOT_TOKEN = '8598472216:AAE7gQmUpaWPeEgq7ZFlnTGuzedGUAQfFoU';
    const host = req.headers.host;
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const webhookUrl = `${protocol}://${host}/api/webhook`;

    try {
        const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=${encodeURIComponent(webhookUrl)}`);
        const data = await response.json();

        if (data.ok) {
            res.status(200).send(`
            <html>
                <head><meta charset="UTF-8"><title>تثبيت Vercel</title></head>
                <body style="font-family:tahoma;text-align:center;padding:50px;">
                    <h2 style="color:green">✅ تم ربط البوت بنجاح!</h2>
                    <p>رابط الويبهوك الخاص بك: <code>${webhookUrl}</code></p>
                    <p>اذهب إلى تليجرام وأرسل امر البدء للبوت.</p>
                </body>
            </html>
            `);
        } else {
            res.status(500).send(`❌ فشل تأكيد الويبهوك: ${data.description}`);
        }
    } catch (error) {
        res.status(500).send(`❌ خطأ: ${error.message}`);
    }
}

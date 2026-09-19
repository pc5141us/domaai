import { encryptToken } from '../api/bot-config.js';
import fs from 'fs';
import path from 'path';

const newToken = process.argv[2];

if (!newToken) {
    console.log('\n❌ يرجى إدخال التوكن: node scripts/set-token.mjs "YOUR_TELEGRAM_BOT_TOKEN"\n');
    process.exit(1);
}

const encrypted = encryptToken(newToken.trim());
console.log('\n🔐 تم تشفير التوكن بنجاح:');
console.log(encrypted);

const configPath = path.resolve('./api/bot-config.js');
let content = fs.readFileSync(configPath, 'utf8');

content = content.replace(/let ENCRYPTED_TOKEN = '.*';/, `let ENCRYPTED_TOKEN = '${encrypted}';`);
fs.writeFileSync(configPath, content, 'utf8');

console.log('\n✅ تم حفظ التوكن المشفّر بنجاح داخل الخادم (api/bot-config.js) وتم إخفاؤه تماماً عن المتصفح والعامّة!\n');

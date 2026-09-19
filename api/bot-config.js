/**
 * Secure Bot Configuration & Encryption Module
 * Protects Telegram Bot Token from public exposure
 */
import crypto from 'crypto';

// Secret internal key used for server-side decryption (never exposed to client)
const INTERNAL_SECRET = 'DomaAI_Secure_Bot_Token_Key_2026';

/**
 * Encrypt a plain token string
 */
export function encryptToken(plainText) {
    if (!plainText) return '';
    const key = crypto.createHash('sha256').update(INTERNAL_SECRET).digest();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decrypt an encrypted token string
 */
export function decryptToken(encryptedText) {
    if (!encryptedText) return '';
    try {
        const textParts = encryptedText.split(':');
        if (textParts.length !== 2) return encryptedText; // Fallback if plain text
        const iv = Buffer.from(textParts[0], 'hex');
        const encryptedData = Buffer.from(textParts[1], 'hex');
        const key = crypto.createHash('sha256').update(INTERNAL_SECRET).digest();
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (e) {
        console.error('Failed to decrypt token:', e);
        return '';
    }
}

// Stored encrypted token (encrypted using AES-256-CBC)
// Replace this with your new encrypted token or set TELEGRAM_BOT_TOKEN in environment variables
let ENCRYPTED_TOKEN = 'a9ca3ae49b29c7ec9efaab757382cafb:4fd1af0c08717d795e6c0575ca9d125b9e2ec68c0b35193edf56500d9118898bb7bf672084586875bedda252f39598b2';

/**
 * Get active Bot Token (checks environment variable first, then encrypted fallback)
 */
export function getBotToken() {
    if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_BOT_TOKEN.trim() !== '') {
        return process.env.TELEGRAM_BOT_TOKEN.trim();
    }
    if (ENCRYPTED_TOKEN) {
        return decryptToken(ENCRYPTED_TOKEN);
    }
    return '';
}

/**
 * Set and store new encrypted token in memory/config
 */
export function updateStoredToken(newToken) {
    ENCRYPTED_TOKEN = encryptToken(newToken);
    return ENCRYPTED_TOKEN;
}

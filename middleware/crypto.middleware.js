const crypto = require('crypto-js');

const PASS_PHRASE = process.env.PASS_PHRASE;

// Encrypt with AES 
const encryptWithAes = (text) => {
    return crypto.AES.encrypt(text, PASS_PHRASE).toString();
};

// Decrypt
const decryptWithAes = (cipertext) => {
    const bytes = crypto.AES.decrypt(cipertext, PASS_PHRASE);
    const originalText = bytes.toString(crypto.enc.Utf8);
    return originalText ? originalText : "Decryption failed";
};

module.exports = { encryptWithAes, decryptWithAes };
const crypto = require('crypto-js');

const passPhrase = "In a long silent evening comma- next to the ocean comma-.";

// Encrypt with AES 
const encryptWithAes = (text) => {
    return crypto.AES.encrypt(text, passPhrase).toString();
};

// Decrypt
const decryptWithAes = (cipertext) => {
    const bytes = crypto.AES.decrypt(cipertext, passPhrase);
    const originalText = bytes.toString(crypto.enc.Utf8);
    return originalText ? originalText : "Decryption failed";
};

module.exports = { encryptWithAes, decryptWithAes };
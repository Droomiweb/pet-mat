// scripts/debug-keys.js
require('dotenv').config({ path: '.env.local' });

const rawKeys = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || "";
console.log("Raw Keys Length:", rawKeys.length);
console.log("Raw Keys Preview:", rawKeys.substring(0, 10) + "...");

const geminiKeys = rawKeys
    .split(",")
    .map(k => k.replace(/["']/g, "").trim())
    .filter(k => k);

console.log(`\nParsed ${geminiKeys.length} keys:`);
geminiKeys.forEach((k, i) => {
    const visible = k.length > 8 ? k.slice(0, 4) + "****" + k.slice(-4) : "****";
    console.log(`Key ${i + 1}: [${visible}] (Length: ${k.length})`);
});

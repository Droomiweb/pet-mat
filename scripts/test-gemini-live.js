const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require("@google/generative-ai");

function loadEnv() {
    try {
        const envPath = path.resolve(process.cwd(), '.env.local');
        if (!fs.existsSync(envPath)) return {};
        const content = fs.readFileSync(envPath, 'utf8');
        const env = {};
        content.split('\n').forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                const key = match[1].trim();
                let value = match[2].trim();
                // Remove quotes if present
                if (value.startsWith('"') && value.endsWith('"')) {
                    value = value.slice(1, -1);
                }
                env[key] = value;
            }
        });
        return env;
    } catch (e) {
        console.error("Error loading .env.local", e);
        return {};
    }
}

async function testGemini() {
    const env = loadEnv();
    const keysRaw = env.GEMINI_API_KEYS || env.GEMINI_API_KEY || "";

    // Also check process.env in case it's already loaded (e.g. by system)
    const keys = (keysRaw || process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || "")
        .split(",").map(k => k.replace(/["']/g, "").trim()).filter(k => k);

    console.log(`Found ${keys.length} Gemini keys.`);

    if (keys.length === 0) {
        console.error("No keys found.");
        return;
    }

    for (const [index, key] of keys.entries()) {
        console.log(`Testing Key ${index + 1}: ${key.slice(0, 4)}...${key.slice(-4)}`);
        try {
            const genAI = new GoogleGenerativeAI(key);
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
            // Note: If model name is wrong, it might error. Check app usage. 
            // app/lib/gemini.js uses "gemini-flash-latest"

            const result = await model.generateContent("Hello.");
            const response = await result.response;
            console.log(`✅ Key ${index + 1} Success! Response: ${response.text()}`);
        } catch (error) {
            console.error(`❌ Key ${index + 1} Failed:`);
            console.error(error.message);
            if (error.response) {
                // Try to log detailed error from Google
                console.error(JSON.stringify(error, null, 2));
            }
        }
    }
}

testGemini();

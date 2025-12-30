const { GoogleGenerativeAI } = require("@google/generative-ai");
const path = require('path');
const fs = require('fs');

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
                if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
                env[key] = value;
            }
        });
        return env;
    } catch (e) { return {}; }
}

async function listModels() {
    const env = loadEnv();
    const key = (env.GEMINI_API_KEYS || env.GEMINI_API_KEY || "").split(",").map(k => k.replace(/["']/g, "").trim()).filter(k => k).pop(); // Use the last key as it seemed valid in logs (key 4)

    if (!key) {
        console.error("No key found");
        return;
    }

    console.log("Using Key ending in:", key.slice(-4));

    try {
        // We can't use the helper for listing models easily in node without looking up the generic client
        // So let's just try to fetch a known model to see if it works, OR use the API directly via fetch if the SDK doesn't expose listModels easily on the main entry.
        // Actually, the SDK has a way:
        const genAI = new GoogleGenerativeAI(key);
        // Accessing the model directly doesn't list them.
        // Let's use a simple fetch to the list endpoint.

        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.models) {
            console.log("Available Models:");
            data.models.forEach(m => console.log(`- ${m.name}`));
        } else {
            console.error("Error listing models:", JSON.stringify(data, null, 2));
        }

    } catch (error) {
        console.error("Error:", error);
    }
}

listModels();

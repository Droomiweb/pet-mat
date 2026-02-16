// scripts/list-hf-models.mjs
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function listModels() {
    const apiKey = process.env.HUGGINGFACE_API_KEY;
    if (!apiKey) {
        console.error("No API Key");
        return;
    }

    try {
        console.log("Fetching top downloaded text-generation models...");
        const res = await fetch("https://huggingface.co/api/models?pipeline_tag=text-generation&sort=downloads&direction=-1&limit=5");
        
        if (!res.ok) throw new Error(res.statusText);
        
        const models = await res.json();
        models.forEach(m => console.log(`- ${m.id} (${m.downloads} downloads)`));
        
    } catch (e) {
        console.error("Error:", e.message);
    }
}

listModels();

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { visionModel } from '../app/lib/gemini.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// 1x1 Transparent pixel
const BASE64_IMAGE = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKwAEQAAAABJRU5ErkJggg==";

async function run() {
  console.log("Testing Gemini Vision...");
  
  try {
    const start = Date.now();
    const result = await visionModel.generateContent([
        "Analyze this image and tell me: 1. Is it a human? 2. What type of animal is it (Dog, Cat, etc)? 3. What breed? Return JSON.",
        { inlineData: { data: BASE64_IMAGE, mimeType: "image/png" } }
    ]);
    const response = await result.response;
    const text = response.text();
    console.log("✅ Time:", Date.now() - start, "ms");
    console.log("Response:", text);
  } catch (e) {
    console.error("❌ Error:", e);
  }
}

run();

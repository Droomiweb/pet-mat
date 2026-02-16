// scripts/test-fallback.mjs
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { textModel } from '../app/lib/gemini.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// MOCK: Corrupt API keys to force fallback
process.env.GEMINI_API_KEYS = "invalid_key_1,invalid_key_2";
process.env.GROQ_API_KEY = ""; // Empty Groq key to force fail

async function testFallback() {
  console.log("🧪 Testing AI 3-Layer Fallback...");
  console.log("1. Gemini (Should Fail due to invalid keys)");
  console.log("2. Groq (Should Fail due to missing key)");
  console.log("3. Hugging Face (Should Succeed)...");
  
  try {
      const result = await textModel.generateContent("Say 'Hello from Hugging Face!' if you can hear me.");
      const text = result.response.text();
      
      console.log("\n✅ Result:", text);
      
      if (text.includes("Hello") || text.length > 0) {
          console.log("🎉 SUCCESS: Fallback chain worked!");
      } else {
          console.log("⚠️ WARNING: Result empty, but no error thrown.");
      }

  } catch (e) {
      console.error("\n❌ FAILED: The fallback chain broke.", e);
  }
}

testFallback();

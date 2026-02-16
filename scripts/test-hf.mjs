import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const API_KEY = process.env.HUGGINGFACE_API_KEY;

if (!API_KEY) {
  console.error("No API Key found.");
  process.exit(1);
}

// 1x1 Red Pixel PNG (RGB)
const BASE64_IMAGE = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR42mP8z/8/AAPEA/8Dwv4+AAAAAElFTkSuQmCC";

async function testModel(modelId) {
  console.log(`Testing ${modelId}...`);
  try {
    const response = await fetch(
      `https://router.huggingface.co/hf-inference/models/${modelId}`,
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/octet-stream", // App uses octet-stream
        },
        method: "POST",
        body: Buffer.from(BASE64_IMAGE, "base64"), // App sends buffer
      }
    );

    if (!response.ok) {
      const text = await response.text();
      console.error(`❌ Failed: ${response.status} - ${text}`);
    } else {
      const result = await response.json();
      console.log("✅ Success:", JSON.stringify(result).substring(0, 100) + "...");
    }
  } catch (e) {
    console.error("❌ Error:", e.message);
  }
}

async function run() {
  const models = [
    "google/vit-base-patch16-224"
  ];
    
  for (const model of models) {
     await testModel(model);
  }
}

run();

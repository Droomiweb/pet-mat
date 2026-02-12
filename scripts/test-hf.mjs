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

// 1x1 Transparent pixel
const BASE64_IMAGE = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKwAEQAAAABJRU5ErkJggg==";

async function testModel(modelId) {
  console.log(`Testing ${modelId}...`);
  try {
    const response = await fetch(
      `https://router.huggingface.co/hf-inference/models/${modelId}`,
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
        method: "POST",
        body: JSON.stringify({
          inputs: BASE64_IMAGE, 
        }),
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
    "google/vit-base-patch16-224-in21k", 
    "facebook/convnext-tiny-224",
    "microsoft/swin-tiny-patch4-window7-224",
    "microsoft/resnet-18"
  ];
    
  for (const model of models) {
     await testModel(model);
  }
}

run();

// scripts/test-huggingface.js
require('dotenv').config({ path: '.env.local' });

// Mocking the fetch since we are in node environment if needed, 
// or relying on Node 18+ native fetch.
// We need to import the logic. Since our lib is ES module, we might need a small wrapper or just inline the logic for a quick test script.
// To make it easy for the user without setting up ES module execution for scripts, I will inline the basic test logic here.

const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;
const MODEL_ID = "google/vit-base-patch16-224";

async function testClassification() {
    console.log("Testing Hugging Face Integration...");
    
    if (!HF_API_KEY) {
        console.error("❌ HUGGINGFACE_API_KEY is missing in .env.local");
        return;
    }
    console.log("✅ API Key found.");

    // use a sample base64 image (small 1x1 pixel or real url)
    // For a real test, let's try to fetch a public image and classify it.
    const sampleImageUrl = "https://images.dog.ceo/breeds/retriever-golden/n02099601_100.jpg"; 
    
    try {
        console.log(`Downloading sample image from: ${sampleImageUrl}`);
        const imgRes = await fetch(sampleImageUrl);
        const arrayBuffer = await imgRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64 = buffer.toString('base64');

        console.log("Sending to Hugging Face API...");
        
        const response = await fetch(
            `https://router.huggingface.co/hf-inference/models/${MODEL_ID}`,
            {
                headers: {
                    Authorization: `Bearer ${HF_API_KEY}`,
                    "Content-Type": "application/json",
                },
                method: "POST",
                body: JSON.stringify({
                    inputs: base64, 
                }),
            }
        );

        if (!response.ok) {
            console.error(`❌ API Error: ${response.status} - ${await response.text()}`);
            return;
        }

        const result = await response.json();
        console.log("✅ Response received!");
        console.log("Raw Result:", JSON.stringify(result, null, 2));
        
        // Basic mapping logic check
        if (Array.isArray(result) && result.length > 0) {
            console.log(`Top Prediction: ${result[0].label} (${(result[0].score * 100).toFixed(1)}%)`);
        }

    } catch (e) {
        console.error("❌ Test Failed:", e);
    }
}

testClassification();

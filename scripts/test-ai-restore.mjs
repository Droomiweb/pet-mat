import { executeHybridRequest } from '../app/lib/gemini.js';

async function testChain() {
    console.log("🚀 Testing Hybrid AI Chain (Vision/Image Gen Mode)...");
    
    const params = {
        inputParts: [
            "Create a photorealistic image prompt for a baby puppy that is a mix of a Golden Retriever and a Husky. Format: Prompt: [description] | Behavior: [prediction]"
        ]
    };

    try {
        console.log("--- Attempting Request ---");
        const result = await executeHybridRequest("generate", params);
        console.log("✅ RESULT TEXT:", result.response.text());
        process.exit(0);
    } catch (e) {
        console.error("❌ CHAIN FAILED:", e.message);
        process.exit(1);
    }
}

testChain();

import { generateStableAIImage } from '../app/lib/imageGenerator.js';

async function verifyFinalStable() {
    console.log("🚀 Testing STABLE Generator Flow...");
    const resultUrl = await generateStableAIImage("A baby puppy mix of a Golden Retriever and a Husky, 8k photo.");
    
    if (resultUrl && resultUrl.includes("cloudinary")) {
        console.log("✅ SUCCESS! Final Stable Link:", resultUrl);
        process.exit(0);
    } else {
        console.error("❌ FAILED: Did not get a stable Cloudinary link.");
        console.log("Fallback Link (if any):", resultUrl);
        process.exit(1);
    }
}

verifyFinalStable();

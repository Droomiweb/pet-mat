import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

async function tryGenerate(prompt) {
    const providers = [
        {
            name: "Hugging Face (SD 1.5)",
            url: "https://api-inference.huggingface.co/models/runwayml/stable-diffusion-v1-5",
            method: "POST",
            headers: { Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}` },
            body: JSON.stringify({ inputs: prompt })
        },
        {
            name: "Pollinations (Root)",
            url: `https://pollinations.ai/p/${encodeURIComponent(prompt)}?width=1024&height=1024&seed=${Math.floor(Math.random()*1000)}`,
            method: "GET"
        }
    ];

    for (const provider of providers) {
        console.log(`Trying ${provider.name}...`);
        try {
            const res = await fetch(provider.url, {
                method: provider.method,
                headers: provider.headers || {},
                body: provider.body,
                signal: AbortSignal.timeout(20000)
            });

            console.log(`${provider.name} Status: ${res.status}`);
            if (res.ok) {
                const contentType = res.headers.get("content-type");
                if (contentType && contentType.includes("image")) {
                    return Buffer.from(await res.arrayBuffer());
                } else {
                    console.log(`${provider.name} returned non-image: ${contentType}`);
                }
            }
        } catch (e) {
            console.error(`${provider.name} Error:`, e.message);
        }
    }
    return null;
}

async function runTest() {
    const buffer = await tryGenerate("a cute puppy");
    if (buffer) {
        console.log(`Got image buffer: ${buffer.length} bytes`);
        // Upload would happen here
    } else {
        console.log("All providers failed.");
    }
}

runTest();

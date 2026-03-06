import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Generates an AI image using multiple providers and uploads to Cloudinary.
 * @param {string} prompt The visual description for the AI.
 * @returns {Promise<string|null>} The permanent Cloudinary URL or null if all fail.
 */
export async function generateStableAIImage(prompt) {
    console.log(`[StableGen] Generating stable image via HF Router...`);
    
    // Providers ranked by stability/quality
    const providers = [
        {
            name: "Hugging Face (Flux Schnell)",
            url: "https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell",
            method: "POST",
            headers: { 
                "Authorization": `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ inputs: prompt })
        },
        {
            name: "Hugging Face (SDXL)",
            url: "https://router.huggingface.co/hf-inference/models/stabilityai/stable-diffusion-xl-base-1.0",
            method: "POST",
            headers: { 
                "Authorization": `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ inputs: prompt })
        },
        {
            name: "Pollinations (Root Fallback)",
            url: `https://pollinations.ai/p/${encodeURIComponent(prompt)}?width=1024&height=1024&seed=${Math.floor(Math.random()*1000)}&nologo=true`,
            method: "GET"
        }
    ];

    for (const provider of providers) {
        try {
            console.log(`[StableGen] Requesting from ${provider.name}...`);
            const response = await fetch(provider.url, {
                method: provider.method,
                headers: provider.headers || {},
                body: provider.body,
                signal: AbortSignal.timeout(35000)
            });

            if (response.ok) {
                const contentType = response.headers.get("content-type");
                if (contentType && contentType.includes("image")) {
                    const buffer = Buffer.from(await response.arrayBuffer());
                    console.log(`[StableGen] Received buffer (${buffer.length} bytes). Uploading to Cloudinary...`);
                    
                    const uploadResult = await new Promise((resolve, reject) => {
                        const uploadStream = cloudinary.uploader.upload_stream(
                            { 
                                folder: 'pet-offspring',
                                tags: ['genetics', 'ai-generated']
                            },
                            (error, result) => {
                                if (error) reject(error);
                                else resolve(result);
                            }
                        );
                        uploadStream.end(buffer);
                    });
                    
                    console.log(`[StableGen] Success! Cloudinary URL: ${uploadResult.secure_url}`);
                    return uploadResult.secure_url;
                }
            } else {
                const err = await response.text();
                console.warn(`[StableGen] ${provider.name} failed (${response.status}): ${err.substring(0, 100)}`);
            }
        } catch (e) {
            console.error(`[StableGen] ${provider.name} Connection Error:`, e.message);
        }
    }

    console.error("[StableGen] CRITICAL: All AI Providers failed to produce an image buffer.");
    return null;
}

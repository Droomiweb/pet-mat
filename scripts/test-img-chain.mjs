import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

async function testHuggingFaceAndCloudinary() {
    const prompt = "a cute puppy mix of golden retriever and husky, photorealistic";
    console.log("Testing HF -> Cloudinary...");
    
    try {
        const response = await fetch(
            "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0",
            {
                headers: { Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}` },
                method: "POST",
                body: JSON.stringify({ inputs: prompt }),
            }
        );

        console.log(`HF Status: ${response.status}`);
        if (!response.ok) {
            const err = await response.text();
            console.error("HF Error:", err);
            return;
        }

        const buffer = Buffer.from(await response.arrayBuffer());
        console.log(`Success! Image size: ${buffer.length} bytes`);

        // Upload to Cloudinary
        const uploadResult = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                { folder: 'pet-offspring' },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            );
            uploadStream.end(buffer);
        });

        console.log("Cloudinary Upload Success:", uploadResult.secure_url);
    } catch (e) {
        console.error("Chain Error:", e);
    }
}

testHuggingFaceAndCloudinary();

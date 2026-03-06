import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function finalHFTest() {
    const prompt = "a cute puppy mix of golden retriever and husky, photorealistic, 8k";
    console.log("Testing HF Flux Schnell...");
    
    try {
        const response = await fetch(
            "https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell",
            {
                headers: { 
                    Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
                    "Content-Type": "application/json"
                },
                method: "POST",
                body: JSON.stringify({ inputs: prompt }),
            }
        );

        console.log(`Status: ${response.status}`);
        const contentType = response.headers.get("content-type");
        console.log(`Content-Type: ${contentType}`);

        if (response.ok && contentType.includes("image")) {
            const buffer = Buffer.from(await response.arrayBuffer());
            console.log(`✅ Success! Image size: ${buffer.length} bytes`);
        } else {
            const errText = await response.text();
            console.log("Error Body Preview:", errText.substring(0, 200));
        }
    } catch (e) {
        console.error("Test Error:", e);
    }
}

finalHFTest();

const hfToken = process.env.HUGGINGFACE_API_KEY;

async function testHFImage() {
    console.log("Testing HF Image Gen...");
    try {
        const response = await fetch(
            "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0",
            {
                headers: { Authorization: `Bearer ${hfToken}` },
                method: "POST",
                body: JSON.stringify({ inputs: "a cute puppy" }),
            }
        );

        console.log(`Status: ${response.status} ${response.statusText}`);
        if (response.ok) {
            const buffer = await response.arrayBuffer();
            console.log(`Success! Image size: ${buffer.byteLength}`);
        } else {
            const err = await response.text();
            console.log("Error:", err);
        }
    } catch (e) {
        console.error("HF Error:", e);
    }
}

testHFImage();

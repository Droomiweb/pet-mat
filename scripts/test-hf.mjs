import fetch from "node-fetch";

async function testHF() {
    const hfKey = process.env.HUGGINGFACE_API_KEY;
    console.log("Key Exists:", !!hfKey);
    
    // Test the new router
    const model = "mistralai/Mistral-7B-Instruct-v0.3";
    const prompt = "What is a dog?";
    
    try {
        const response = await fetch(`https://router.huggingface.co/hf-inference/models/${model}`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${hfKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                inputs: `[INST] ${prompt} [/INST]`,
                parameters: { max_new_tokens: 50, return_full_text: false }
            }),
        });
        
        console.log("Status:", response.status);
        const text = await response.text();
        console.log("Body:", text);
    } catch(e) {
        console.error("Error:", e);
    }
}
testHF();

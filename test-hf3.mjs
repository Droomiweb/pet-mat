import { config } from 'dotenv';
config({ path: '.env.local' });

async function test(model) {
  const hfKey = process.env.HUGGINGFACE_API_KEY;
  try {
    const hfRes = await fetch(`https://router.huggingface.co/hf-inference/v1/chat/completions`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${hfKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ 
        model: model, 
        messages: [{ role: "user", content: "hi" }],
        max_tokens: 50
      })
    });
    console.log(model, hfRes.status, await hfRes.text());
  } catch (e) {
    console.error(e);
  }
}

test("meta-llama/Llama-3.2-3B-Instruct");
test("mistralai/Mistral-7B-Instruct-v0.3");

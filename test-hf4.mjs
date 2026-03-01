import { config } from 'dotenv';
config({ path: '.env.local' });

async function test(url) {
  const hfKey = process.env.HUGGINGFACE_API_KEY;
  try {
    const hfRes = await fetch(url, {
      method: "POST",
      headers: { "Authorization": `Bearer ${hfKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ 
        model: "mistralai/Mistral-7B-Instruct-v0.3",
        messages: [{"role": "user", "content": "What is the capital of France?"}],
        max_tokens: 50,
        stream: false
      })
    });
    console.log(url, hfRes.status, await hfRes.text());
  } catch (e) {
    console.error(e);
  }
}

test("https://api-inference.huggingface.co/v1/chat/completions");

import { config } from 'dotenv';
config({ path: '.env.local' });

async function test() {
  const hfKey = process.env.HUGGINGFACE_API_KEY;

  try {
    const hfRes = await fetch("https://router.huggingface.co/hf-inference/models/mistralai/Mistral-7B-Instruct-v0.3", {
      method: "POST",
      headers: { "Authorization": `Bearer ${hfKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ inputs: "hi" })
    });
    console.log("HF Router Status:", hfRes.status);
    console.log("HF Router Response:", await hfRes.text());
  } catch (e) {
    console.error("HF Fetch Error:", e);
  }
}
test();

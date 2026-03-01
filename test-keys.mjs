import { config } from 'dotenv';
config({ path: '.env.local' });

async function test() {
  const groqKey = process.env.GROQ_API_KEY.split(',')[0].trim();
  console.log("Testing Groq key:", groqKey.slice(0, 10) + "...");
  
  const hfKey = process.env.HUGGINGFACE_API_KEY;
  console.log("Testing HF key:", hfKey.slice(0, 10) + "...");

  try {
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${groqKey}` },
      body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages: [{role: "user", content: "hi"}] })
    });
    console.log("Groq Status:", groqRes.status);
    console.log("Groq Response:", await groqRes.text());
  } catch (e) {
    console.error("Groq Fetch Error:", e);
  }

  try {
    const hfRes = await fetch("https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3", {
      method: "POST",
      headers: { "Authorization": `Bearer ${hfKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ inputs: "hi" })
    });
    console.log("HF Status:", hfRes.status);
    console.log("HF Response:", await hfRes.text());
  } catch (e) {
    console.error("HF Fetch Error:", e);
  }
}
test();

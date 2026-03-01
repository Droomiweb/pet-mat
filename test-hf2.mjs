import { config } from 'dotenv';
config({ path: '.env.local' });

async function test(model) {
  const hfKey = process.env.HUGGINGFACE_API_KEY;
  try {
    const hfRes = await fetch(`https://router.huggingface.co/hf-inference/models/${model}`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${hfKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ inputs: "hi" })
    });
    console.log(model, hfRes.status);
  } catch (e) {}
}

test("meta-llama/Llama-3.2-3B-Instruct");
test("HuggingFaceH4/zephyr-7b-beta");
test("mistralai/Mistral-Nemo-Instruct-2407");
test("mistralai/Mixtral-8x7B-Instruct-v0.1");
test("mistralai/Mistral-7B-Instruct-v0.2");

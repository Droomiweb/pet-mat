const hfKey = process.env.HUGGINGFACE_API_KEY;
const model = "mistralai/Mistral-7B-Instruct-v0.3";
async function test() {
  const response = await fetch(`https://router.huggingface.co/hf-inference/models/${model}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${hfKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: `[INST] Hello [/INST]`, 
        parameters: { max_new_tokens: 50, return_full_text: false }
      }),
    });
  console.log(response.status);
  console.log(await response.text());
}
test();

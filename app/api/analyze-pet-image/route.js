// app/api/analyze-pet-image/route.js
import { visionModel } from "../../lib/gemini";

export async function POST(req) {
  try {
    const { imageUrl, mimeType } = await req.json();
    if (!imageUrl) return new Response(JSON.stringify({ error: 'Image data required' }), { status: 400 });

    const base64Data = imageUrl.split(",")[1]; 
    const imagePart = { inlineData: { data: base64Data, mimeType: mimeType || "image/jpeg" } };

    // --- IMPROVED PROMPT START ---
    const prompt = `
      Analyze this image and identify the pet.
      
      Your Goal: Return a valid JSON object describing the pet.
      
      Fields:
      1. "type": Strictly choose one of these values: ["Dog", "Cat", "Rabbit", "Bird", "Other"]. 
      2. "breed": Identify the specific breed (e.g., "Pug", "Persian", "Parrot"). 
         - If it looks like a mixed breed, just return the dominant breed or "Mixed".
         - If the type is "Other" (e.g. Hamster, Turtle), put the animal name here (e.g. "Hamster").

      Format:
      Respond ONLY with the JSON object. Do not include Markdown formatting (like \`\`\`json).
      
      Example Response:
      { "type": "Dog", "breed": "Golden Retriever" }
    `;
    // --- IMPROVED PROMPT END ---

    const result = await visionModel.generateContent([prompt, imagePart]);
    const response = await result.response;
    
    // Clean up any potential markdown formatting the AI might still add
    let text = response.text().replace(/```json/g, "").replace(/```/g, "").trim();
    
    // Ensure it parses as JSON; if not, throw error to catch block
    JSON.parse(text); 
    
    return new Response(text, { status: 200 });
  } catch (err) {
    console.error("Gemini Analysis Error:", err);
    // Fallback JSON if AI fails
    return new Response(JSON.stringify({ type: "Other", breed: "Unknown" }), { status: 200 });
  }
}
// app/api/ai-advisor/route.js
import { textModel } from "../../lib/gemini";
import connectDB from "../../lib/mongodb";
import Pet from "../../models/PetModel";

export async function POST(req) {
  try {
    await connectDB();
    // petA = User's Pet (The requester)
    // petB = Target Pet (The profile being viewed)
    const { petAId, petBId } = await req.json();

    if (!petAId || !petBId) {
      return new Response(JSON.stringify({ error: "Both pet IDs are required" }), { status: 400 });
    }

    const petA = await Pet.findById(petAId);
    const petB = await Pet.findById(petBId);

    if (!petA || !petB) {
      return new Response(JSON.stringify({ error: "Pets not found" }), { status: 404 });
    }

    // --- 1. Construct Data for AI ---
    const inputData = `
      **Pet A (Potential Parent 1):**
      - Name: ${petA.name}
      - Breed: ${petA.breed}
      - Temperament: ${petA.temperament}
      - Energy: ${petA.energyLevel}
      - Profile Description: "${petA.aiProfileString || 'N/A'}"
      - MEDICAL HISTORY: "${petA.medicalHistoryLog || 'None recorded'}"

      **Pet B (Potential Parent 2):**
      - Name: ${petB.name}
      - Breed: ${petB.breed}
      - Temperament: ${petB.temperament}
      - Energy: ${petB.energyLevel}
      - Profile Description: "${petB.aiProfileString || 'N/A'}"
      - MEDICAL HISTORY: "${petB.medicalHistoryLog || 'None recorded'}"
    `;

    // --- 2. Ask AI for Mating Advice + Image Prompt ---
    const prompt = `
      Analyze the compatibility of these two pets for mating.
      Consider their breeds, temperaments, AND explicitly check their **Medical History** for any red flags or positive notes (e.g. past surgeries, recurring issues).

      Tasks:
      1. Write a "Mating Compatibility Report" (3-4 sentences). Mention specific medical history if relevant.
      2. Generate a detailed "Image Prompt" to visualize their potential puppy/kitten using an AI image generator. Describe the fur color, ears, and size.

      Respond ONLY in JSON:
      {
        "analysis": "...",
        "imagePrompt": "..."
      }
      
      Input Data:
      ${inputData}
    `;

    const result = await textModel.generateContent(prompt);
    const responseText = result.response.text().replace(/```json/g, "").replace(/```/g, "").trim();
    const aiData = JSON.parse(responseText);

    // --- 3. Generate Image URL (Pollinations.ai - Free) ---
    // We encode the prompt to be URL safe
    const encodedPrompt = encodeURIComponent(aiData.imagePrompt + " photorealistic, cute, 8k, cinematic lighting");
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?nologo=true`;

    return new Response(JSON.stringify({
      analysis: aiData.analysis,
      offspringImage: imageUrl
    }), { status: 200 });

  } catch (err) {
    console.error("Advisor Error:", err);
    return new Response(JSON.stringify({ error: "Failed to generate advice" }), { status: 500 });
  }
}
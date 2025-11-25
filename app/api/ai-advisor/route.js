// app/api/ai-advisor/route.js
import { textModel } from "../../lib/gemini";
import connectDB from "../../lib/mongodb";
import Pet from "../../models/PetModel";

// Helper to resolve lineage name
const getParentName = async (id, nameStr) => {
    if (id) {
        const p = await Pet.findById(id).select('name').lean();
        return p ? p.name : (nameStr || "Unknown");
    }
    return nameStr || "Unknown";
};

export async function POST(req) {
  try {
    await connectDB();
    const { petAId, petBId } = await req.json();

    if (!petAId || !petBId) return new Response(JSON.stringify({ error: "IDs required" }), { status: 400 });

    const petA = await Pet.findById(petAId);
    const petB = await Pet.findById(petBId);

    if (!petA || !petB) return new Response(JSON.stringify({ error: "Pets not found" }), { status: 404 });

    // --- RESOLVE LINEAGE ---
    const petASire = await getParentName(petA.sireId, petA.sireName);
    const petADam = await getParentName(petA.damId, petA.damName);
    
    const petBSire = await getParentName(petB.sireId, petB.sireName);
    const petBDam = await getParentName(petB.damId, petB.damName);

    // --- CONSTRUCT DATA ---
    const inputData = `
      **Pet A (Your Pet):**
      - Name: ${petA.name} (${petA.breed})
      - Lineage: Sire: ${petASire}, Dam: ${petADam}
      - Medical History: "${petA.medicalHistoryLog || 'None'}"

      **Pet B (Potential Mate):**
      - Name: ${petB.name} (${petB.breed})
      - Lineage: Sire: ${petBSire}, Dam: ${petBDam}
      - Medical History: "${petB.medicalHistoryLog || 'None'}"
    `;

    const prompt = `
      Analyze mating compatibility.
      
      **CRITICAL: LINEAGE CHECK**
      - Check the Sire and Dam names for both pets.
      - If names are "Unknown", explicitly state this as a risk factor for genetic history.
      - If names are present, mention that lineage is tracked.
      
      Tasks:
      1. Write a "Mating Compatibility Report" (3-4 sentences). 
      2. Generate an "Image Prompt" for the offspring.

      Respond ONLY in JSON: { "analysis": "...", "imagePrompt": "..." }
      
      Input: ${inputData}
    `;

    const result = await textModel.generateContent(prompt);
    const responseText = result.response.text().replace(/```json/g, "").replace(/```/g, "").trim();
    const aiData = JSON.parse(responseText);

    const encodedPrompt = encodeURIComponent(aiData.imagePrompt + " photorealistic, cute, 8k");
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
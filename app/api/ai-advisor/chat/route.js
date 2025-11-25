// app/api/ai-advisor/chat/route.js
import { textModel } from "../../../lib/gemini";
import connectDB from "../../../lib/mongodb";
import Pet from "../../../models/PetModel";

// Helper to fetch deep details including lineage
async function getPetDeepDetails(petId) {
  const pet = await Pet.findById(petId).lean();
  if (!pet) return null;

  // Fetch Parents Logic
  // Priority: 1. Linked ID in DB, 2. String Name extracted from Cert, 3. "Unknown"
  let damName = pet.damName || "Unknown";
  let sireName = pet.sireName || "Unknown";

  if (pet.damId) {
      const dam = await Pet.findById(pet.damId).select('name breed').lean();
      if(dam) damName = `${dam.name} (${dam.breed})`;
  }
  if (pet.sireId) {
      const sire = await Pet.findById(pet.sireId).select('name breed').lean();
      if(sire) sireName = `${sire.name} (${sire.breed})`;
  }

  return {
    ...pet,
    lineage: {
      dam: damName,
      sire: sireName
    }
  };
}

export async function POST(req) {
  try {
    await connectDB();
    const { petAId, petBId, history, message } = await req.json();

    if (!petAId || !petBId) return new Response(JSON.stringify({ error: "Both pets required" }), { status: 400 });

    const petA = await getPetDeepDetails(petAId); 
    const petB = await getPetDeepDetails(petBId);

    const contextPrompt = `
      You are an expert Veterinary and Genetic Mating Advisor AI.

      **Pet 1:** ${petA.name} (${petA.breed})
      - Lineage: Sire: ${petA.lineage.sire}, Dam: ${petA.lineage.dam}
      
      **Pet 2:** ${petB.name} (${petB.breed})
      - Lineage: Sire: ${petB.lineage.sire}, Dam: ${petB.lineage.dam}

      If the user asks about genetic risks, use the Lineage info provided above. 
      If Lineage is "Unknown", warn them about unknown genetic history.
      If Lineage names are present, confirm that parentage is documented.
    `;

    const chat = textModel.startChat({
      history: [
        { role: "user", parts: [{ text: contextPrompt }] },
        { role: "model", parts: [{ text: "I have analyzed the lineage and medical history. How can I help?" }] },
        ...history
      ]
    });

    const result = await chat.sendMessage(message);
    const responseText = result.response.text();

    return new Response(JSON.stringify({ text: responseText }), { status: 200 });

  } catch (err) {
    return new Response(JSON.stringify({ error: "Failed to generate advice." }), { status: 500 });
  }
}
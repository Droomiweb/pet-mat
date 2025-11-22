// app/api/ai-advisor/chat/route.js
import { textModel } from "../../../lib/gemini";
import connectDB from "../../../lib/mongodb";
import Pet from "../../../models/PetModel";

// Helper to fetch deep details including lineage
async function getPetDeepDetails(petId) {
  const pet = await Pet.findById(petId).lean();
  if (!pet) return null;

  // Fetch Parents for Lineage context
  const dam = pet.damId ? await Pet.findById(pet.damId).select('name breed').lean() : null;
  const sire = pet.sireId ? await Pet.findById(pet.sireId).select('name breed').lean() : null;

  return {
    ...pet,
    lineage: {
      dam: dam ? `${dam.name} (${dam.breed})` : "Unknown",
      sire: sire ? `${sire.name} (${sire.breed})` : "Unknown"
    }
  };
}

export async function POST(req) {
  try {
    await connectDB();
    const { petAId, petBId, history, message } = await req.json();

    if (!petAId || !petBId) {
      return new Response(JSON.stringify({ error: "Both pets required" }), { status: 400 });
    }

    // 1. Fetch Deep Data for Both Pets
    const petA = await getPetDeepDetails(petAId); // User's Pet
    const petB = await getPetDeepDetails(petBId); // Profile Pet

    // 2. Construct System Context
    const contextPrompt = `
      You are an expert Veterinary and Genetic Mating Advisor AI.
      You are analyzing compatibility between two pets.

      **Pet 1 (Requester/User's Pet):**
      - Name: ${petA.name} (${petA.breed}, ${petA.age} yrs)
      - Gender: ${petA.gender}
      - Medical History/PetDoc Chats: "${petA.medicalHistoryLog || 'None'}"
      - Vaccinations: ${petA.vaccinationHistory?.map(v => `${v.vaccineName} (${v.status})`).join(', ') || 'None'}
      - Lineage: Sire: ${petA.lineage.sire}, Dam: ${petA.lineage.dam}
      - Temperament: ${petA.temperament}, Energy: ${petA.energyLevel}

      **Pet 2 (Target Profile):**
      - Name: ${petB.name} (${petB.breed}, ${petB.age} yrs)
      - Gender: ${petB.gender}
      - Medical History/PetDoc Chats: "${petB.medicalHistoryLog || 'None'}"
      - Vaccinations: ${petB.vaccinationHistory?.map(v => `${v.vaccineName} (${v.status})`).join(', ') || 'None'}
      - Lineage: Sire: ${petB.lineage.sire}, Dam: ${petB.lineage.dam}
      - Temperament: ${petB.temperament}, Energy: ${petB.energyLevel}

      **Your Goal:**
      Answer the user's questions about breeding these two specific pets. 
      - If asked about health risks, analyze the breed mix and medical history.
      - If asked about lineage, compare their parents.
      - Be professional, kind, but realistic about genetic risks.
    `;

    // 3. Initialize Chat
    const chat = textModel.startChat({
      history: [
        { role: "user", parts: [{ text: contextPrompt }] },
        { role: "model", parts: [{ text: "I have analyzed the full medical, genetic, and vaccination history of both pets. I am ready to answer your questions regarding their mating compatibility." }] },
        ...history
      ]
    });

    // 4. Generate Response
    const result = await chat.sendMessage(message);
    const responseText = result.response.text();

    return new Response(JSON.stringify({ text: responseText }), { status: 200 });

  } catch (err) {
    console.error("Advisor Chat Error:", err);
    return new Response(JSON.stringify({ error: "Failed to generate advice." }), { status: 500 });
  }
}
// app/api/ai-advisor/chat/route.js

import { textModel } from "../../../lib/gemini"; 
import connectDB from "../../../lib/mongodb";
import Pet from "../../../models/PetModel";

// Helper to safely get pet details
async function getPetDetails(petId) {
  if (!petId) return null;
  try {
    const pet = await Pet.findById(petId).lean();
    if (!pet) return null;
    const sireInfo = pet.sireName || (pet.sireId ? "Registered" : "Unknown");
    const damInfo = pet.damName || (pet.damId ? "Registered" : "Unknown");
    return { ...pet, lineageInfo: `Sire: ${sireInfo}, Dam: ${damInfo}` };
  } catch (e) {
    console.error("Error fetching pet:", e);
    return null;
  }
}

export async function POST(req) {
  try {
    await connectDB();
    
    // We still accept userId for potential future logging, but we removed the strict blocking
    const { petAId, petBId, history, message, userId } = await req.json();

    if (!petBId) {
        return new Response(JSON.stringify({ error: "Target pet (Pet B) ID required" }), { status: 400 });
    }

    const petA = await getPetDetails(petAId);
    const petB = await getPetDetails(petBId);

    if (!petB) return new Response(JSON.stringify({ error: "Target pet not found" }), { status: 404 });

    // --- RESTORED DATA ACCESS ---
    // The AI is given full access to medical logs so it can answer user questions accurately.
    
    const vaxList = petB.vaccinationHistory?.length > 0
        ? petB.vaccinationHistory.map(v => `- ${v.vaccineName} (Expires: ${new Date(v.expiryDate).toLocaleDateString()})`).join("\n")
        : "No vaccination records visible.";

    const medicalContext = `
    **PET B DETAILED HEALTH RECORDS**:
    - Medical History Log: ${petB.medicalHistoryLog || "Healthy, no major issues recorded."}
    - Vaccination Status: \n${vaxList}
    - Weight: ${petB.weight || "Unknown"} kg
    - Energy Level: ${petB.energyLevel || "Unknown"}
    - Age: ${petB.age} years
    - Gender: ${petB.gender}
    - Lineage: ${petB.lineageInfo}
    `;

    // Sanitize history to prevent 400 errors from empty messages
    const validHistory = (history || []).filter(item => {
      return item.role && item.parts && item.parts[0] && item.parts[0].text && item.parts[0].text.trim() !== "";
    });

    const systemPrompt = petA 
      ? `
      You are **Dr. Paws**, a warm, enthusiastic, and highly expert Veterinarian and Geneticist.
      
      **CONTEXT**:
      You are analyzing a potential match/interaction between:
      1. **User's Pet (Pet A)**: ${petA.name} (${petA.breed}, ${petA.gender})
      2. **Target Pet (Pet B)**: ${petB.name} (${petB.breed}, ${petB.gender})
      
      ${medicalContext}
      
      **INSTRUCTIONS**:
      - You are analyzing them for a MATING match.
      - You HAVE access to Pet B's medical logs. Use this to answer accuracy.
      - Tone: Professional, friendly.
      `
      : `
      You are **Dr. Paws**, a warm and highly expert Veterinarian.
      
      **CONTEXT**:
      You are providing medical and health advice for:
      **Pet**: ${petB.name} (${petB.breed}, ${petB.gender})
      
      ${medicalContext}
      
      **INSTRUCTIONS**:
      - The user is asking about THIS specific pet.
      - Review the medical logs and vaccination status provided above to give specific, helpful advice.
      - If they ask about health, check the 'Medical History Log'.
      - Tone: Professional, caring, and transparent.
      `;

    // Start Chat
    const chat = textModel.startChat({
      history: [
        { role: "user", parts: [{ text: systemPrompt }] },
        { role: "model", parts: [{ text: `Hello! I'm Dr. Paws. I've got ${petB.name}'s file right here. What a lovely ${petB.breed}! How can I help you?` }] },
        ...validHistory
      ]
    });

    const result = await chat.sendMessage(message);
    const responseText = result.response.text();

    return new Response(JSON.stringify({ text: responseText }), { status: 200 });

  } catch (err) {
    console.error("Advisor Error:", err);
    return new Response(JSON.stringify({ error: "Dr. Paws is taking a quick break. Please try again." }), { status: 500 });
  }
}
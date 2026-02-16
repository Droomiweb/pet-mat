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
    
    // Check for "Mated" status in history
    const isMated = pet.matingHistory?.some(r => r.status === 'mated');
    
    return { 
      ...pet, 
      lineageInfo: `Sire: ${sireInfo}, Dam: ${damInfo}`,
      isMated: isMated || pet.isPregnant
    };
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
    - Temperament: ${petB.temperament || "Unknown"}
    - Age: ${petB.age} years
    - Gender: ${petB.gender}
    - Lineage: ${petB.lineageInfo}
    - Status: ${petB.isPregnant ? "PREGNANT" : (petB.isMated ? "MATED" : "Available")}
    `;

    // Determine if we are in "Pregnancy/Parent" mode
    const isParentMode = petB.isPregnant || (petA && petB.matingHistory?.some(r => r.status === 'mated' && r.requesterPetId === petA._id.toString()));

    const systemPrompt = isParentMode 
      ? `
      You are **Dr. Paws**, a warm, enthusiastic Veteran Veterinarian and Geneticist.
      
      **SPECIAL CONTEXT**:
      The target pet, **${petB.name}**, is currently **${petB.isPregnant ? "PREGNANT" : "MATED"}**! 
      ${petA ? `The partner is ${petA.name}.` : ""}
      
      **YOUR MISSION**:
      1. Congratulations! Respond with warmth about the upcoming litter.
      2. Analyze the traits of both parents (if Pet A is provided) to predict the "Nature" (temperament/energy) of the babies.
         - ${petA ? `${petA.name} is ${petA.temperament} with ${petA.energyLevel} energy.` : ""}
         - ${petB.name} is ${petB.temperament} with ${petB.energyLevel} energy.
      3. Give pregnancy care advice (nutrition, exercise, warning signs).
      4. Talk like a proud family doctor.

      **STYLE & FORMAT**:
      - **CRITICAL**: Keep responses **MINIMALIST** and **CONCISE** (max 2-3 sentences).
      - Do NOT write paragraphs. Get straight to the point.
      - If the user says "Hi", "Hello", or "Hey", strictly reply with: "Hi there! How can I help you and ${petB.name} today?"
      `
      : petA 
      ? `
      You are **Dr. Paws**, a warm, enthusiastic, and highly expert Veterinarian and Geneticist.
      
      **CONTEXT**:
      You are analyzing a potential match/interaction between:
      1. **User's Pet (Pet A)**: ${petA.name} (${petA.breed}, ${petA.gender}, ${petA.temperament})
      2. **Target Pet (Pet B)**: ${petB.name} (${petB.breed}, ${petB.gender}, ${petB.temperament})
      
      ${medicalContext}
      
      **INSTRUCTIONS**:
      - You are analyzing them for a MATING match.
      - Predict the likely "Nature" and behavior of their future offspring based on their temperaments.
      - You HAVE access to Pet B's medical logs. Use this for accuracy.
      - Tone: Professional, friendly.

      **STYLE & FORMAT**:
      - **CRITICAL**: Keep responses **MINIMALIST** and **CONCISE** (max 2-3 sentences).
      - Do NOT write paragraphs. Get straight to the point.
      - If the user says "Hi", "Hello", or "Hey", strictly reply with: "Hi there! How can I help you and ${petB.name} today?"
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

      **STYLE & FORMAT**:
      - **CRITICAL**: Keep responses **MINIMALIST** and **CONCISE** (max 2-3 sentences).
      - Do NOT write paragraphs. Get straight to the point.
      - If the user says "Hi", "Hello", or "Hey", strictly reply with: "Hi there! How can I help you and ${petB.name} today?"
      `;

    // Sanitize history to prevent 400 errors from empty messages
    const validHistory = (history || []).filter(item => {
      return item.role && item.parts && item.parts[0] && item.parts[0].text && item.parts[0].text.trim() !== "";
    });

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
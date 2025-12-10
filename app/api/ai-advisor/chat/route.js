// app/api/ai-advisor/chat/route.js

// Standard imports
import { textModel } from "../../../lib/gemini"; // Gemini AI instance
import connectDB from "../../../lib/mongodb";
import Pet from "../../../models/PetModel";

// Fetch pet details
async function getPetDetails(petId) {
  const pet = await Pet.findById(petId).lean();
  if (!pet) return null;

  // Handle missing names
  const sireInfo = pet.sireName || (pet.sireId ? "Registered (Name hidden)" : "Unknown");
  const damInfo = pet.damName || (pet.damId ? "Registered (Name hidden)" : "Unknown");

  return {
    ...pet,
    lineageInfo: `Sire: ${sireInfo}, Dam: ${damInfo}`
  };
}

// POST request handler
export async function POST(req) {
  try {
    await connectDB();
    
    // Parse request body
    const { petAId, petBId, history, message } = await req.json();

    if (!petAId || !petBId) return new Response(JSON.stringify({ error: "IDs required" }), { status: 400 });

    // Fetch pet profiles
    const petA = await getPetDetails(petAId); // User's Pet
    const petB = await getPetDetails(petBId); // Target Pet 

    if (!petA || !petB) return new Response(JSON.stringify({ error: "Pets not found" }), { status: 404 });

    // Format vaccination list
    const vaxList = petB.vaccinationHistory && petB.vaccinationHistory.length > 0
        ? petB.vaccinationHistory.map(v => `- ${v.vaccineName} (Expires: ${new Date(v.expiryDate).toLocaleDateString()})`).join("\n")
        : "No vaccination records visible.";

    // Define AI instructions
    const systemPrompt = `
      You are an expert Pet Advisor and Geneticist.
      The user (owner of Pet A) is asking about Pet B (the target pet).

      **TARGET PET (PET B) DETAILS:**
      - Name: ${petB.name}
      - Species: ${petB.type}
      - Breed: ${petB.breed}
      - Age: ${petB.age}
      - Lineage: ${petB.lineageInfo}
      
      **MEDICAL HISTORY LOG (From Dr. Paws):**
      """
      ${petB.medicalHistoryLog || "No specific medical issues recorded."}
      """

      **VACCINATION STATUS:**
      ${vaxList}

      **USER'S PET (PET A - For Compatibility Context):**
      - Name: ${petA.name}
      - Breed: ${petA.breed}
      - Species: ${petA.type}

      **INSTRUCTIONS:**
      1. Answer questions specifically about Pet B's health, history, or traits using the data above.
      2. If the user asks about "medical details", "surgery", or "illness", YOU MUST summarize the "MEDICAL HISTORY LOG" provided above.
      3. If the log is empty/default, state that no history is available.
      4. If asked about offspring, analyze compatibility based on Breed/Species.
    `;

    // Initialize chat history
    const chat = textModel.startChat({
      history: [
        { role: "user", parts: [{ text: systemPrompt }] },
        { role: "model", parts: [{ text: `I have reviewed ${petB.name}'s full profile, including medical logs and vaccinations. What would you like to know?` }] },
        ...history // Add user history
      ]
    });

    // Get AI response
    const result = await chat.sendMessage(message);
    const responseText = result.response.text();

    return new Response(JSON.stringify({ text: responseText }), { status: 200 });

  } catch (err) {
    console.error("Advisor Error:", err);
    return new Response(JSON.stringify({ error: "Failed to generate advice" }), { status: 500 });
  }
}
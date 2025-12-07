// app/api/ai-advisor/chat/route.js

// 1. IMPORTS
import { textModel } from "../../../lib/gemini"; // The configured Google Gemini instance
import connectDB from "../../../lib/mongodb";
import Pet from "../../../models/PetModel";

// 2. HELPER FUNCTION
// Fetches pet data and formats the lineage strings for better AI readability.
async function getPetDetails(petId) {
  const pet = await Pet.findById(petId).lean();
  if (!pet) return null;

  // Logic: If names are missing but IDs exist, we know they are registered system pets.
  const sireInfo = pet.sireName || (pet.sireId ? "Registered (Name hidden)" : "Unknown");
  const damInfo = pet.damName || (pet.damId ? "Registered (Name hidden)" : "Unknown");

  return {
    ...pet,
    lineageInfo: `Sire: ${sireInfo}, Dam: ${damInfo}`
  };
}

// 3. POST HANDLER
export async function POST(req) {
  try {
    await connectDB();
    
    // We expect:
    // - petAId: The ID of the current user's pet (The "Seeker")
    // - petBId: The ID of the profile being viewed (The "Target")
    // - history: Previous chat messages for context
    // - message: The new question from the user
    const { petAId, petBId, history, message } = await req.json();

    if (!petAId || !petBId) return new Response(JSON.stringify({ error: "IDs required" }), { status: 400 });

    // 4. DATA RETRIEVAL
    const petA = await getPetDetails(petAId); // User's Pet
    const petB = await getPetDetails(petBId); // Target Pet 

    if (!petA || !petB) return new Response(JSON.stringify({ error: "Pets not found" }), { status: 404 });

    // 5. DATA FORMATTING
    // Create a readable string for vaccinations so the AI can answer "Is he vaccinated?"
    const vaxList = petB.vaccinationHistory && petB.vaccinationHistory.length > 0
        ? petB.vaccinationHistory.map(v => `- ${v.vaccineName} (Expires: ${new Date(v.expiryDate).toLocaleDateString()})`).join("\n")
        : "No vaccination records visible.";

    // 6. SYSTEM PROMPT CONSTRUCTION
    // We explicitly tell the AI its role and provide the raw data.
    // We instruct it to prioritize the provided "MEDICAL HISTORY LOG".
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

    // 7. INITIALIZE CHAT SESSION
    // We "prime" the chat by inserting the system prompt as the first message in the history.
    // This trick makes Gemini behave as if it already knows the context.
    const chat = textModel.startChat({
      history: [
        { role: "user", parts: [{ text: systemPrompt }] },
        { role: "model", parts: [{ text: `I have reviewed ${petB.name}'s full profile, including medical logs and vaccinations. What would you like to know?` }] },
        ...history // Append the actual user conversation so far
      ]
    });

    // 8. GENERATE RESPONSE
    const result = await chat.sendMessage(message);
    const responseText = result.response.text();

    return new Response(JSON.stringify({ text: responseText }), { status: 200 });

  } catch (err) {
    console.error("Advisor Error:", err);
    return new Response(JSON.stringify({ error: "Failed to generate advice" }), { status: 500 });
  }
}
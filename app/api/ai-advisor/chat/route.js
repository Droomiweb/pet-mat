// app/api/ai-advisor/chat/route.js

// Standard imports
import { textModel } from "../../../lib/gemini"; // Gemini AI instance
import connectDB from "../../../lib/mongodb";
import Pet from "../../../models/PetModel";

// --- SECURITY FIX: MOCK AUTHENTICATION HELPER ---
// NOTE: In a real production application, this function would securely derive
// the user ID from the session, JWT, or authenticated headers/cookies.
function getAuthenticatedUserId(req) {
    // Placeholder User ID. 
    // This ID must correspond to the ownerId of Pet A for the request to be valid.
    return "user_12345"; 
}

// NOTE: The original `getPetDetails` function has been removed as authorization
// and data formatting is now handled directly within the POST handler based on ownership.

// POST request handler
export async function POST(req) {
  try {
    await connectDB();
    
    // --- 1. Authentication Check ---
    const currentUserId = getAuthenticatedUserId(req);
    if (!currentUserId) {
        return new Response(JSON.stringify({ error: "Authentication required." }), { status: 401 });
    }
    
    // Parse request body
    const { petAId, petBId, history, message } = await req.json();

    if (!petAId || !petBId) return new Response(JSON.stringify({ error: "IDs required" }), { status: 400 });

    // --- 2. Fetch pet profiles (Ensure ownerId is implicitly fetched by default for Lean objects) ---
    const petA = await Pet.findById(petAId).lean(); // User's Pet
    const petB = await Pet.findById(petBId).lean(); // Target Pet 

    if (!petA || !petB) return new Response(JSON.stringify({ error: "Pets not found" }), { status: 404 });
    
    // --- 3. Authorization Check for Pet A (User's Pet) ---
    // User must own Pet A to query based on its context
    if (String(petA.ownerId) !== currentUserId) {
        return new Response(JSON.stringify({ error: "Access denied. Pet A profile cannot be used by the authenticated user." }), { status: 403 });
    }

    // --- 4. Authorization and Data Redaction for Pet B (Target Pet) ---
    const isOwnerOfPetB = String(petB.ownerId) === currentUserId;
    
    let petBAuthorizedData = {
        name: petB.name,
        type: petB.type,
        breed: petB.breed,
        age: petB.age,
        // Default sensitive data state (Redacted)
        medicalHistoryLog: "Access Denied: Sensitive medical history is restricted and unavailable for analysis.",
        vaccinationHistory: [],
        lineageInfo: `Sire: ${petB.sireId ? "Registered" : "Unknown"}, Dam: ${petB.damId ? "Registered" : "Unknown"} (Detailed lineage restricted)`,
    };

    if (isOwnerOfPetB) {
        // If user is the owner, inject full sensitive data
        
        // Detailed Lineage Info
        const sireInfo = petB.sireName || (petB.sireId ? "Registered (Name hidden)" : "Unknown");
        const damInfo = petB.damName || (petB.damId ? "Registered (Name hidden)" : "Unknown");
        
        petBAuthorizedData.lineageInfo = `Sire: ${sireInfo}, Dam: ${damInfo}`;
        petBAuthorizedData.medicalHistoryLog = petB.medicalHistoryLog || "No specific medical issues recorded.";
        petBAuthorizedData.vaccinationHistory = petB.vaccinationHistory || [];
    }

    // Format vaccination list using the authorized/redacted data
    let vaxList;
    if (petBAuthorizedData.vaccinationHistory.length > 0) {
        vaxList = petBAuthorizedData.vaccinationHistory
            .map(v => `- ${v.vaccineName} (Expires: ${new Date(v.expiryDate).toLocaleDateString()})`).join("\n");
    } else {
        // Set context based on whether access was authorized
        vaxList = isOwnerOfPetB 
            ? "No vaccination records visible."
            : "Vaccination records are restricted and unavailable for analysis.";
    }
            
    // Define AI instructions
    const systemPrompt = `
      You are an expert Pet Advisor and Geneticist.
      The user (owner of Pet A) is asking about Pet B (the target pet).

      **TARGET PET (PET B) DETAILS:**
      - Name: ${petBAuthorizedData.name}
      - Species: ${petBAuthorizedData.type}
      - Breed: ${petBAuthorizedData.breed}
      - Age: ${petBAuthorizedData.age}
      - Lineage: ${petBAuthorizedData.lineageInfo}
      
      **MEDICAL HISTORY LOG (From Dr. Paws):**
      """
      ${petBAuthorizedData.medicalHistoryLog}
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
      3. IMPORTANT: If the log contains an "Access Denied:" message, you MUST explicitly inform the user that this sensitive information cannot be discussed due to privacy restrictions.
      4. If asked about offspring, analyze compatibility based on Breed/Species.
    `;

    // Initialize chat history
    const chat = textModel.startChat({
      history: [
        { role: "user", parts: [{ text: systemPrompt }] },
        { role: "model", parts: [{ text: `I have reviewed ${petB.name}'s profile. Authorization checks ensure I only use data you are entitled to view. What would you like to know?` }] },
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
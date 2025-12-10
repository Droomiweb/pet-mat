// app/api/ai-advisor/route.js

// Standard imports
import { textModel } from "../../lib/gemini"; // AI configuration
import connectDB from "../../lib/mongodb";
import Pet from "../../models/PetModel";

// Resolve parent names
const getParentName = async (id, nameStr) => {
    // Check database ID
    if (id) {
        const p = await Pet.findById(id).select('name').lean();
        return p ? p.name : (nameStr || "Unknown");
    }
    // Fallback to name
    return nameStr || "Unknown";
};

// POST request handler
export async function POST(req) {
  try {
    // Connect to database
    await connectDB();
    
    // Parse request IDs
    const { petAId, petBId } = await req.json();

    if (!petAId || !petBId) {
        return new Response(JSON.stringify({ error: "IDs required" }), { status: 400 });
    }

    // Fetch pet profiles
    const petA = await Pet.findById(petAId);
    const petB = await Pet.findById(petBId);

    if (!petA || !petB) {
        return new Response(JSON.stringify({ error: "Pets not found" }), { status: 404 });
    }

    // Prepare lineage data
    const petASire = await getParentName(petA.sireId, petA.sireName);
    const petADam = await getParentName(petA.damId, petA.damName);
    
    const petBSire = await getParentName(petB.sireId, petB.sireName);
    const petBDam = await getParentName(petB.damId, petB.damName);

    // Build AI context
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

    // Define AI prompt
    const prompt = `
      Analyze mating compatibility between these two animals.
      
      **CRITICAL TASKS:**
      1. **Lineage Check**: Check the Sire and Dam names. If names are "Unknown", warn the user that genetic history is untracked. If names exist, mention that lineage is traceable.
      2. **Medical Check**: If "Medical History" contains issues, flag them.
      
      **OUTPUT REQUIREMENTS:**
      1. 'analysis': A 3-4 sentence summary of compatibility, risks, and lineage status.
      2. 'imagePrompt': A vivid, physical description of what their offspring might look like (mix of breeds/colors).

      **FORMAT**: Respond ONLY in valid JSON: 
      { "analysis": "...", "imagePrompt": "..." }
      
      Input Data: ${inputData}
    `;

    // Generate AI content
    const result = await textModel.generateContent(prompt);
    
    // Parse JSON response
    const responseText = result.response.text().replace(/```json/g, "").replace(/```/g, "").trim();
    
    let aiData;
    try {
        aiData = JSON.parse(responseText);
    } catch (e) {
        console.error("Failed to parse AI JSON:", responseText);
        throw new Error("AI response was not valid JSON");
    }

    // Generate image URL
    const encodedPrompt = encodeURIComponent(aiData.imagePrompt + " photorealistic, cute, cinematic lighting, 8k");
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?nologo=true&model=flux`;

    // Return API response
    return new Response(JSON.stringify({
      analysis: aiData.analysis,
      offspringImage: imageUrl
    }), { status: 200 });

  } catch (err) {
    console.error("Advisor Error:", err);
    return new Response(JSON.stringify({ error: "Failed to generate advice", details: err.message }), { status: 500 });
  }
}
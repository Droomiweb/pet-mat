// app/api/ai-advisor/route.js

// 1. IMPORTS
import { textModel } from "../../lib/gemini"; // Our Gemini AI configuration
import connectDB from "../../lib/mongodb";
import Pet from "../../models/PetModel";

// 2. HELPER FUNCTION: Resolve Parent Names
// This function ensures we get the most accurate name available for the lineage check.
const getParentName = async (id, nameStr) => {
    // Priority 1: If we have a Database ID, fetch the live record.
    if (id) {
        const p = await Pet.findById(id).select('name').lean();
        return p ? p.name : (nameStr || "Unknown");
    }
    // Priority 2: Fallback to the text string entered manually.
    // Priority 3: Default to "Unknown".
    return nameStr || "Unknown";
};

// 3. POST HANDLER
export async function POST(req) {
  try {
    // Ensure DB connection
    await connectDB();
    
    // We expect the IDs of the two pets being analyzed
    const { petAId, petBId } = await req.json();

    if (!petAId || !petBId) {
        return new Response(JSON.stringify({ error: "IDs required" }), { status: 400 });
    }

    // Fetch the full pet documents
    const petA = await Pet.findById(petAId);
    const petB = await Pet.findById(petBId);

    if (!petA || !petB) {
        return new Response(JSON.stringify({ error: "Pets not found" }), { status: 404 });
    }

    // --- 4. DATA PREPARATION (Lineage) ---
    // We resolve the names of all 4 grandparents to feed into the AI context.
    const petASire = await getParentName(petA.sireId, petA.sireName);
    const petADam = await getParentName(petA.damId, petA.damName);
    
    const petBSire = await getParentName(petB.sireId, petB.sireName);
    const petBDam = await getParentName(petB.damId, petB.damName);

    // --- 5. CONSTRUCT CONTEXT FOR AI ---
    // We format the data clearly so the LLM understands the "medical" and "genetic" context.
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

    // --- 6. PROMPT ENGINEERING ---
    // We enforce a strict JSON output format to make parsing easy.
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

    // --- 7. GEMINI GENERATION ---
    const result = await textModel.generateContent(prompt);
    
    // Clean the response (remove Markdown code blocks if Gemini adds them) to ensure valid JSON.
    const responseText = result.response.text().replace(/```json/g, "").replace(/```/g, "").trim();
    
    let aiData;
    try {
        aiData = JSON.parse(responseText);
    } catch (e) {
        console.error("Failed to parse AI JSON:", responseText);
        throw new Error("AI response was not valid JSON");
    }

    // --- 8. IMAGE GENERATION (Pollinations) ---
    // We take the text description from Gemini and encode it into a URL for Pollinations AI.
    // We add "photorealistic, cute, 8k" to ensure high quality style.
    const encodedPrompt = encodeURIComponent(aiData.imagePrompt + " photorealistic, cute, cinematic lighting, 8k");
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?nologo=true&model=flux`;

    // --- 9. RETURN RESPONSE ---
    return new Response(JSON.stringify({
      analysis: aiData.analysis,
      offspringImage: imageUrl
    }), { status: 200 });

  } catch (err) {
    console.error("Advisor Error:", err);
    return new Response(JSON.stringify({ error: "Failed to generate advice", details: err.message }), { status: 500 });
  }
}
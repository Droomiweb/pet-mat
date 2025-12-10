// app/api/pet/confirm-pregnancy/route.js

// Standard imports
import connectDB from "../../../lib/mongodb";
import Pet from "../../../models/PetModel";
// AI configuration
import { textModel } from "../../../lib/gemini";

// POST request handler
export async function POST(req) {
  try {
    await connectDB();
    
    // Parse request data
    const { petId, userId } = await req.json();

    // Verify ownership
    const pet = await Pet.findById(petId);
    if (!pet) {
        return new Response(JSON.stringify({ error: "Pet not found" }), { status: 404 });
    }
    // Check authorization
    if (pet.ownerId !== userId) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 403 });
    }

    // Define AI prompt
    const prompt = `
      Create a detailed, day-by-day pregnancy care plan for a **${pet.breed} ${pet.type}**.
      
      1. Determine the average gestation period (in days for this specific breed/type).
      2. For EACH day from Day 1 to the final day of gestation, provide:
         - "food": Dietary advice (e.g., increase calcium, specific nutrients).
         - "activity": Exercise recommendation (e.g., normal walk, rest, gentle play).
         - "careTips": General care (e.g., nesting prep, vet checkup reminders).
         - "warningSigns": What to watch out for (e.g., temperature drop, refusal to eat).
      
      Respond ONLY with a valid JSON object in this format:
      {
        "gestationDays": 63,
        "plan": [
          { "day": 1, "food": "...", "activity": "...", "careTips": "...", "warningSigns": "..." },
          { "day": 2, "food": "...", "activity": "...", "careTips": "...", "warningSigns": "..." }
          ... (until last day)
        ]
      }
      Keep descriptions concise (1 sentence each) to ensure the response fits within token limits.
    `;

    // Generate care plan
    const result = await textModel.generateContent(prompt);
    const responseText = result.response.text()
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();
    
    let aiData;
    try {
        aiData = JSON.parse(responseText);
    } catch (e) {
        console.error("AI JSON Parse Error:", responseText);
        throw new Error("Failed to parse AI pregnancy plan.");
    }

    // Update pet record
    pet.isPregnant = true;
    pet.pregnancyStartDate = new Date(); // Set start date
    pet.pregnancyPlan = aiData.plan;     // Save daily plan
    
    await pet.save();

    // Return success response
    return new Response(JSON.stringify({ 
        message: "Pregnancy confirmed and care plan generated!", 
        pet 
    }), { status: 200 });

  } catch (err) {
    console.error("Pregnancy Generation Error:", err);
    return new Response(JSON.stringify({ error: "Failed to start pregnancy mode." }), { status: 500 });
  }
}
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

    // Define AI prompt - Reverting to daily plan but with strict length limits
    const prompt = `
      Create a detailed, day-by-day pregnancy care plan for a **${pet.breed} ${pet.type}**.
      1. Gestation period: ~63 days.
      2. Provide a care plan for EVERY SINGLE DAY (Day 1 to 63).
      
      Respond ONLY with a valid JSON object:
      {
        "gestationDays": 63,
        "plan": [
          { "day": 1, "food": "...", "activity": "...", "careTips": "...", "warningSigns": "..." },
          ... up to 63
        ]
      }
      IMPORTANT: Keep descriptions to 5-8 words MAX so the response stays within limits.
    `;

    // Generate care plan
    const result = await textModel.generateContent(prompt);
    let responseText = await result.response.text();
    
    // Robust Extraction
    const start = responseText.indexOf('{');
    const end = responseText.lastIndexOf('}');
    if (start !== -1 && end !== -1) {
        responseText = responseText.substring(start, end + 1);
    }
    
    let aiData;
    try {
        aiData = JSON.parse(responseText);
    } catch (e) {
        console.error("AI JSON Parse Error:", responseText);
        // Better fallback: Generate basic daily items if AI fails
        const fallbackPlan = Array.from({ length: 63 }, (_, i) => ({
            day: i + 1,
            food: i < 40 ? "Normal high-quality diet" : "Higher calorie intake",
            activity: i < 50 ? "Normal exercise" : "Gentle walks only",
            careTips: "Regular monitoring",
            warningSigns: "Lethargy or refusal to eat"
        }));
        
        aiData = {
            gestationDays: 63,
            plan: fallbackPlan
        };
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
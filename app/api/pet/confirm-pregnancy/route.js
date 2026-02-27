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

    // Determine accurate gestation period based on species
    let gestationDays = 63; // Default (Dogs/Cats)
    const normalizedType = pet.type?.toLowerCase() || '';
    
    if (normalizedType === 'rabbit') {
        gestationDays = 31;
    } else if (normalizedType === 'bird') {
        gestationDays = 28; // Average egg incubation period
    } else if (normalizedType === 'horse') {
        gestationDays = 340;
    } else if (normalizedType === 'guinea pig') {
        gestationDays = 65;
    } else if (normalizedType === 'hamster') {
        gestationDays = 16;
    }

    // Define AI prompt - Dynamic to the species' specific gestation
    const prompt = `
      Create a detailed, day-by-day pregnancy care plan for a **${pet.breed} ${pet.type}**.
      1. Gestation period: ~${gestationDays} days.
      2. Provide a care plan for EVERY SINGLE DAY (Day 1 to ${gestationDays}).
      
      Respond ONLY with a valid JSON object:
      {
        "gestationDays": ${gestationDays},
        "plan": [
          { "day": 1, "food": "...", "activity": "...", "careTips": "...", "warningSigns": "..." },
          ... up to ${gestationDays}
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
        // Better fallback: Generate basic daily items dynamically based on gestation length
        const fallbackPlan = Array.from({ length: gestationDays }, (_, i) => ({
            day: i + 1,
            food: i < (gestationDays * 0.6) ? "Normal high-quality diet" : "Higher calorie intake",
            activity: i < (gestationDays * 0.8) ? "Normal exercise" : "Gentle walks only",
            careTips: "Regular monitoring",
            warningSigns: "Lethargy or refusal to eat"
        }));
        
        aiData = {
            gestationDays: gestationDays,
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
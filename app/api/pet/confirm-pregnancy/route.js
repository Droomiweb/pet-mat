// app/api/pet/confirm-pregnancy/route.js

// 1. IMPORTS
import connectDB from "../../../lib/mongodb";
import Pet from "../../../models/PetModel";
// We need the text-based Gemini model to generate the long care plan
import { textModel } from "../../../lib/gemini";

// 2. POST HANDLER
export async function POST(req) {
  try {
    await connectDB();
    
    // We expect the Pet ID and the Owner's User ID (for security verification)
    const { petId, userId } = await req.json();

    // 3. VERIFICATION
    const pet = await Pet.findById(petId);
    if (!pet) {
        return new Response(JSON.stringify({ error: "Pet not found" }), { status: 404 });
    }
    // Security: Only the owner can confirm their pet is pregnant.
    if (pet.ownerId !== userId) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 403 });
    }

    // 4. PROMPT ENGINEERING (The "Virtual Vet")
    // We ask for a granular, day-by-day plan. 
    // Note: For dogs/cats (~63 days), this generates a large JSON object.
    const prompt = `
      Create a detailed, day-by-day pregnancy care plan for a **${pet.breed} ${pet.type}**.
      
      1. Determine the average gestation period (in days) for this specific breed/type.
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

    // 5. GENERATE CONTENT
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

    // 6. UPDATE DATABASE
    // We store the entire plan in the database so we don't have to re-generate it every time the user logs in.
    pet.isPregnant = true;
    pet.pregnancyStartDate = new Date(); // The "Day 1" timestamp
    pet.pregnancyPlan = aiData.plan;     // The array of 60+ daily advice objects
    
    // Note: ensure your PetModel schema has a field: 
    // pregnancyPlan: [{ day: Number, food: String, activity: String, ... }]

    await pet.save();

    // 7. SUCCESS RESPONSE
    return new Response(JSON.stringify({ 
        message: "Pregnancy confirmed and care plan generated!", 
        pet 
    }), { status: 200 });

  } catch (err) {
    console.error("Pregnancy Generation Error:", err);
    return new Response(JSON.stringify({ error: "Failed to start pregnancy mode." }), { status: 500 });
  }
}
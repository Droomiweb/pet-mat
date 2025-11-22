// app/api/pet/confirm-pregnancy/route.js
import connectDB from "../../../lib/mongodb";
import Pet from "../../../models/PetModel";
import { textModel } from "../../../lib/gemini";

export async function POST(req) {
  try {
    await connectDB();
    const { petId, userId } = await req.json();

    const pet = await Pet.findById(petId);
    if (!pet) return new Response(JSON.stringify({ error: "Pet not found" }), { status: 404 });
    if (pet.ownerId !== userId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 403 });

    // 1. AI Prompt to generate the plan
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
      Keep descriptions concise (1 sentence each).
    `;

    const result = await textModel.generateContent(prompt);
    const responseText = result.response.text().replace(/```json/g, "").replace(/```/g, "").trim();
    
    let aiData;
    try {
        aiData = JSON.parse(responseText);
    } catch (e) {
        throw new Error("Failed to parse AI pregnancy plan.");
    }

    // 2. Update Pet in Database
    pet.isPregnant = true;
    pet.pregnancyStartDate = new Date(); // Day 1 starts now
    pet.pregnancyPlan = aiData.plan;
    
    // Optional: You can store the expected due date if you added that field, 
    // but for now we just rely on the plan length.

    await pet.save();

    return new Response(JSON.stringify({ message: "Pregnancy confirmed and care plan generated!", pet }), { status: 200 });

  } catch (err) {
    console.error("Pregnancy Generation Error:", err);
    return new Response(JSON.stringify({ error: "Failed to start pregnancy mode." }), { status: 500 });
  }
}
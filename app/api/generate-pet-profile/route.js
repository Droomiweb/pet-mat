// app/api/generate-pet-profile/route.js

// 1. IMPORTS
import { textModel } from "../../lib/gemini"; // Our configured Google Gemini instance
import connectDB from "../../lib/mongodb";
import Pet from "../../models/PetModel";

// 2. POST HANDLER
export async function POST(req) {
  try {
    // Parse request body
    // petId: The ID of the pet document to update
    // qaPairs: Array of {question, answer} objects from the frontend form
    const { petId, qaPairs } = await req.json();

    // 3. VALIDATION
    if (!petId || !qaPairs || qaPairs.length === 0) {
      return new Response(JSON.stringify({ error: "Pet ID and Q&A pairs are required" }), { status: 400 });
    }

    // Connect to DB and find the pet
    await connectDB();
    const pet = await Pet.findById(petId);
    if (!pet) {
      return new Response(JSON.stringify({ error: "Pet not found" }), { status: 404 });
    }
    
    // 4. DATA PREPARATION
    // Convert the array of Q&A objects into a readable text block for the AI.
    // Example output:
    // Q: How active is your pet?
    // A: Very active, runs all day.
    const qaText = qaPairs.map(pair => `Q: ${pair.question}\nA: ${pair.answer}`).join("\n\n");

    // 5. PROMPT ENGINEERING
    // We give Gemini a specific persona (Pet Profiler) and strict output constraints.
    const prompt = `I have a pet owner's answers to a questionnaire about their pet.
    
    Questionnaire:
    ${qaText}
    
    Based *only* on these answers, perform three tasks:
    1.  **Generate a Profile String**: Write a warm, engaging, first-person (from the pet's perspective) personality profile for a pet matrimony site. This profile should be 3-4 sentences long and highlight the pet's personality, habits, and what they might look for in a mate.
    2.  **Determine Temperament**: Choose the *single* best-fitting temperament from this list: ['Calm', 'Playful', 'Shy', 'Friendly', 'Energetic', 'Independent', 'Curious', 'Other'].
    3.  **Determine Energy Level**: Choose the *single* best-fitting energy level from this list: ['Low', 'Medium', 'High'].
    
    Respond *only* with a valid JSON object in this exact format:
    {
      "aiProfileString": "...",
      "temperament": "...",
      "energyLevel": "..."
    }`;

    // 6. GENERATE CONTENT
    const result = await textModel.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    // 7. CLEAN AND PARSE
    // Gemini sometimes wraps JSON in markdown code blocks (e.g., ```json ... ```).
    // We strip these out to ensure JSON.parse doesn't crash.
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();
    
    let data;
    try {
        data = JSON.parse(text);
    } catch (parseError) {
        console.error("AI JSON Parse Error:", text);
        throw new Error("AI returned invalid JSON format.");
    }

    if (!data.aiProfileString || !data.temperament || !data.energyLevel) {
      throw new Error("AI failed to return all required fields.");
    }
    
    // 8. UPDATE DATABASE
    // We save the generated data directly to the pet's document.
    pet.aiProfileString = data.aiProfileString;
    pet.temperament = data.temperament;
    pet.energyLevel = data.energyLevel;
    
    await pet.save();
    
    // 9. SUCCESS RESPONSE
    return new Response(JSON.stringify({ message: "Profile created successfully", data }), { status: 200 });

  } catch (err) {
    console.error("Error generating profile:", err);
    return new Response(JSON.stringify({ error: "Failed to generate AI profile: " + err.message }), { status: 500 });
  }
}
// app/api/generate-pet-profile/route.js
import { textModel } from "../../lib/gemini";
import connectDB from "../../lib/mongodb";
import Pet from "../../models/PetModel";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req) {
  try {
    const { petId, qaPairs } = await req.json();

    if (!petId || !qaPairs || qaPairs.length === 0) {
      return new Response(JSON.stringify({ error: "Pet ID and Q&A pairs are required" }), { status: 400 });
    }

    await connectDB();
    const pet = await Pet.findById(petId);
    if (!pet) {
      return new Response(JSON.stringify({ error: "Pet not found" }), { status: 404 });
    }
    
    // Create a text block of Q&As for the prompt
    const qaText = qaPairs.map(pair => `Q: ${pair.question}\nA: ${pair.answer}`).join("\n\n");

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

    const result = await textModel.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    // Clean the response
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();
    
    const data = JSON.parse(text);

    if (!data.aiProfileString || !data.temperament || !data.energyLevel) {
      throw new Error("AI failed to return all required fields.");
    }
    
    // Update the Pet in the database
    pet.aiProfileString = data.aiProfileString;
    pet.temperament = data.temperament;
    pet.energyLevel = data.energyLevel;
    
    await pet.save();
    
    return new Response(JSON.stringify({ message: "Profile created successfully" }), { status: 200 });

  } catch (err) {
    console.error("Error generating profile:", err);
    return new Response(JSON.stringify({ error: "Failed to generate AI profile: " + err.message }), { status: 500 });
  }
}
// app/api/generate-questions/route.js
import { textModel } from "../../lib/gemini";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req) {
  try {
    const { petName, petType } = await req.json();

    if (!petName || !petType) {
      return new Response(JSON.stringify({ error: "Pet name and type are required" }), { status: 400 });
    }

    const prompt = `Generate a list of exactly 10 engaging, open-ended questions for a pet owner to build a personality profile for their ${petType} named '${petName}' for a pet matrimony app. The questions should cover temperament, energy, social habits (with other pets and people), quirks, and preferences. Respond *only* with a valid JSON object in the format: {"questions": ["..."]}

    Example:
    {"questions": ["How does ${petName} usually greet new people?", "What is ${petName}'s favorite game to play?", "Describe ${petName}'s energy level on a typical day.", "How does ${petName} get along with other ${petType}s?"]}`;

    const result = await textModel.generateContent(prompt);
    const response = await result.response;
    let text = response.text();
    
    // Clean the response
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();
    
    const data = JSON.parse(text);

    if (!data.questions || data.questions.length === 0) {
      throw new Error("AI failed to return valid questions.");
    }
    
    return new Response(JSON.stringify(data), { status: 200 });

  } catch (err) {
    console.error("Error generating questions:", err);
    // Fallback questions
    const fallback = {
        questions: [
            `What is ${petName}'s favorite toy or activity?`,
            `How does ${petName} react to new people?`,
            `Describe ${petName}'s energy level: are they very active or mostly calm?`,
            `How does ${petName} behave around other animals?`,
            `What is a funny quirk or habit ${petName} has?`,
            `Does ${petName} enjoy cuddling or prefer personal space?`,
            `What is ${petName}'s daily routine like?`,
            `Is ${petName} more of an indoor or outdoor pet?`,
            `What's ${petName}'s favorite snack?`,
            `How would you describe ${petName}'s personality in three words?`
        ]
    };
    return new Response(JSON.stringify(fallback), { status: 500 });
  }
}
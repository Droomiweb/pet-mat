// app/api/generate-questions/route.js
import { textModel } from "../../lib/gemini";

export async function POST(req) {
  try {
    // 1. Accept petBreed from the request
    const { petName, petType, petBreed } = await req.json();

    if (!petName || !petType) {
      return new Response(JSON.stringify({ error: "Pet name and type are required" }), { status: 400 });
    }

    // 2. Update prompt to include the breed for better context
    const prompt = `Generate a list of exactly 10 engaging, open-ended questions for a pet owner to build a personality profile for their ${petBreed || ''} ${petType} named '${petName}' for a pet matrimony app. 
    
    The questions should be specific to the behavior and traits common to a ${petBreed || petType}. Cover temperament, energy, social habits, quirks, and preferences. 
    
    Respond *only* with a valid JSON object in the format: {"questions": ["..."]}`;

    const result = await textModel.generateContent(prompt);
    const response = await result.response;
    let text = response.text();
    
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();
    
    const data = JSON.parse(text);

    if (!data.questions || data.questions.length === 0) {
      throw new Error("AI failed to return valid questions.");
    }
    
    return new Response(JSON.stringify(data), { status: 200 });

  } catch (err) {
    console.error("Error generating questions:", err);
    // Fallback questions (Generic)
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
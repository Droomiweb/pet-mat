// app/api/generate-questions/route.js
import { textModel } from "../../lib/gemini";

export async function POST(req) {
  try {
    const { petName, petType, petBreed } = await req.json();

    if (!petName || !petType) {
      return new Response(JSON.stringify({ error: "Pet name and type are required" }), { status: 400 });
    }

    const prompt = `
      Generate exactly 10 short, simple, and engaging questions for a pet owner to build a profile for their ${petBreed || ''} ${petType} named '${petName}'.
      
      **Structure:**
      1. **Questions 1-5**: Focus on **Nature & Personality** (e.g., "Is ${petName} shy or bold?", "How does ${petName} greet strangers?").
      2. **Questions 6-10**: Focus on **Toys, Fun & Food** (e.g., "What is ${petName}'s absolute favorite treat?", "Does ${petName} destroy toys or cuddle them?").
      
      **Tone**: Friendly, easy to answer, and conversational.
      
      **Output Format**:
      Respond *only* with a valid JSON object:
      { "questions": ["Question 1", "Question 2", ..., "Question 10"] }
    `;

    const result = await textModel.generateContent(prompt);
    const response = await result.response;
    let text = response.text().replace(/```json/g, "").replace(/```/g, "").trim();
    
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
            `How would you describe ${petName}'s personality in one sentence?`,
            `Is ${petName} usually calm or very energetic?`,
            `How does ${petName} react to meeting new people?`,
            `Does ${petName} get along well with other animals?`,
            `What is a funny quirk or habit ${petName} has?`,
            `What is ${petName}'s favorite toy?`,
            `What game does ${petName} love playing the most?`,
            `What is the one treat ${petName} would do anything for?`,
            `Does ${petName} have a favorite sleeping spot?`,
            `What kind of food does ${petName} enjoy the most?`
        ]
    };
    return new Response(JSON.stringify(fallback), { status: 200 }); 
  }
}
// app/api/generate-questions/route.js

// 1. IMPORTS
import { textModel } from "../../lib/gemini"; // Our configured Google Gemini instance

// 2. POST HANDLER
export async function POST(req) {
  // Define variables outside try block so fallback can access them if needed
  let petName = "your pet"; 
  let petType = "pet";
  
  try {
    // 3. PARSE REQUEST
    const body = await req.json();
    
    // Assign to local variables (with safety defaults)
    petName = body.petName || "your pet";
    petType = body.petType || "pet";
    const petBreed = body.petBreed || "";

    if (!body.petName || !body.petType) {
      return new Response(JSON.stringify({ error: "Pet name and type are required" }), { status: 400 });
    }

    // 4. PROMPT ENGINEERING
    // We explicitly ask for 2 categories of questions to get a well-rounded profile.
    const prompt = `
      Generate exactly 10 short, simple, and engaging questions for a pet owner to build a profile for their ${petBreed} ${petType} named '${petName}'.
      
      **Structure:**
      1. **Questions 1-5**: Focus on **Nature & Personality** (e.g., "Is ${petName} shy or bold?", "How does ${petName} greet strangers?").
      2. **Questions 6-10**: Focus on **Toys, Fun & Food** (e.g., "What is ${petName}'s absolute favorite treat?", "Does ${petName} destroy toys or cuddle them?").
      
      **Tone**: Friendly, easy to answer, and conversational.
      
      **Output Format**:
      Respond *only* with a valid JSON object:
      { "questions": ["Question 1", "Question 2", ..., "Question 10"] }
    `;

    // 5. CALL AI MODEL
    const result = await textModel.generateContent(prompt);
    const response = await result.response;
    
    // 6. CLEAN & PARSE
    // Remove potential Markdown code blocks (```json ... ```) added by the AI
    let text = response.text().replace(/```json/g, "").replace(/```/g, "").trim();
    
    const data = JSON.parse(text);

    // Validate the AI actually gave us an array
    if (!data.questions || data.questions.length === 0) {
      throw new Error("AI failed to return valid questions.");
    }
    
    // 7. SUCCESS RESPONSE
    return new Response(JSON.stringify(data), { status: 200 });

  } catch (err) {
    console.error("Error generating questions:", err);
    
    // 8. FALLBACK MECHANISM (Critical for Reliability)
    // If the AI fails (rate limit, server error, bad JSON), return these pre-written questions.
    // We format strings dynamically here too, so it still looks personalized.
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
    
    // Return 200 OK even on error, so the frontend UI doesn't crash
    return new Response(JSON.stringify(fallback), { status: 200 }); 
  }
}
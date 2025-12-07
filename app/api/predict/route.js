// app/api/predict/route.js

// 1. IMPORTS
import connectDB from "../../lib/mongodb";
import Pet from "../../models/PetModel";
import { textModel } from "../../lib/gemini"; // We use the text-based Gemini model here

// 2. HELPER FUNCTION
// This function fetches a pet by ID and formats its data into a string string 
// that is easy for the AI to understand.
const getPetDetails = async (petId) => {
  // .lean() converts the Mongoose document to a plain JavaScript object (faster)
  const pet = await Pet.findById(petId).lean();
  
  if (!pet) return null;
  
  // Return a simplified string of traits for the AI prompt.
  // We exclude irrelevant data like 'ownerId' or 'createdAt'.
  return `
    - Breed: ${pet.breed}
    - Gender: ${pet.gender}
    - Age: ${pet.age}
    - Temperament: ${pet.temperament}
    - Energy Level: ${pet.energyLevel}
    - Image (for reference): ${pet.imageUrls && pet.imageUrls.length > 0 ? pet.imageUrls[0] : 'No Image'}
  `;
};

// 3. POST HANDLER
export async function POST(req) {
  try {
    await connectDB();
    
    // Parse the request body to get the IDs of the two parents
    const { petAId, petBId } = await req.json();

    // Basic Validation
    if (!petAId || !petBId) {
      return new Response(JSON.stringify({ error: "Two pet IDs are required" }), { status: 400 });
    }

    // 4. FETCH DATA
    // Retrieve the formatted details for both pets using our helper
    const petADetails = await getPetDetails(petAId);
    const petBDetails = await getPetDetails(petBId);

    if (!petADetails || !petBDetails) {
      return new Response(JSON.stringify({ error: "One or both pets not found" }), { status: 404 });
    }

    // 5. PROMPT ENGINEERING
    // We construct a detailed instruction for Gemini.
    // We define the persona (Expert), the task (Predict offspring), and the output format (Appearance & Behavior).
    const prompt = `
      You are a pet genetics and breeding expert. Based on the data for two parent pets, generate a prediction about their potential offspring.
      
      Provide the prediction in two parts:
      1.  **Future Appearance:** Describe the likely physical traits, such as coat color, size, and dominant breed characteristics.
      2.  **Behavioral Traits:** Describe the likely temperament and energy level, combining the traits from both parents (e.g., "friendly and playful," "calm but curious").

      Keep the tone informative, positive, and professional.

      **Parent A Details:**
      ${petADetails}

      **Parent B Details:**
      ${petBDetails}

      **Your Prediction:**
    `;

    // 6. GENERATE CONTENT
    // Send the prompt to Gemini
    const result = await textModel.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // 7. SUCCESS RESPONSE
    return new Response(JSON.stringify({ prediction: text }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in prediction API:", error);
    return new Response(JSON.stringify({ error: "AI prediction failed" }), { status: 500 });
  }
}
// app/api/predict/route.js
import connectDB from "../../lib/mongodb";
import Pet from "../../models/PetModel";
import { textModel } from "../../lib/gemini"; // <--- FIXED IMPORT

// Helper function to fetch full pet details
const getPetDetails = async (petId) => {
  const pet = await Pet.findById(petId).lean();
  if (!pet) return null;
  
  // Return a simplified string of traits for the AI
  return `
    - Breed: ${pet.breed}
    - Gender: ${pet.gender}
    - Age: ${pet.age}
    - Temperament: ${pet.temperament}
    - Energy Level: ${pet.energyLevel}
    - Image (for reference): ${pet.imageUrls[0]}
  `;
};

export async function POST(req) {
  try {
    await connectDB();
    const { petAId, petBId } = await req.json();

    if (!petAId || !petBId) {
      return new Response(JSON.stringify({ error: "Two pet IDs are required" }), { status: 400 });
    }

    // Get the details for both pets
    const petADetails = await getPetDetails(petAId);
    const petBDetails = await getPetDetails(petBId);

    if (!petADetails || !petBDetails) {
      return new Response(JSON.stringify({ error: "One or both pets not found" }), { status: 404 });
    }

    // --- AI Prompt Engineering ---
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

    // Call the Gemini model
    const result = await textModel.generateContent(prompt); // <--- FIXED USAGE
    const response = await result.response;
    const text = response.text();

    return new Response(JSON.stringify({ prediction: text }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in prediction API:", error);
    return new Response(JSON.stringify({ error: "AI prediction failed" }), { status: 500 });
  }
}
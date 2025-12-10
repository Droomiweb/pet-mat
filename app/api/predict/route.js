// app/api/predict/route.js

// Standard imports
import connectDB from "../../lib/mongodb";
import Pet from "../../models/PetModel";
import { textModel } from "../../lib/gemini"; // AI configuration

// Format pet details
const getPetDetails = async (petId) => {
  // Fetch pet object
  const pet = await Pet.findById(petId).lean();
  
  if (!pet) return null;
  
  // Return traits string
  return `
    - Breed: ${pet.breed}
    - Gender: ${pet.gender}
    - Age: ${pet.age}
    - Temperament: ${pet.temperament}
    - Energy Level: ${pet.energyLevel}
    - Image (for reference): ${pet.imageUrls && pet.imageUrls.length > 0 ? pet.imageUrls[0] : 'No Image'}
  `;
};

// POST request handler
export async function POST(req) {
  try {
    await connectDB();
    
    // Parse parent IDs
    const { petAId, petBId } = await req.json();

    // Validate request
    if (!petAId || !petBId) {
      return new Response(JSON.stringify({ error: "Two pet IDs are required" }), { status: 400 });
    }

    // Fetch parent profiles
    const petADetails = await getPetDetails(petAId);
    const petBDetails = await getPetDetails(petBId);

    if (!petADetails || !petBDetails) {
      return new Response(JSON.stringify({ error: "One or both pets not found" }), { status: 404 });
    }

    // Define AI prompt
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

    // Generate AI prediction
    const result = await textModel.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Return API response
    return new Response(JSON.stringify({ prediction: text }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in prediction API:", error);
    return new Response(JSON.stringify({ error: "AI prediction failed" }), { status: 500 });
  }
}
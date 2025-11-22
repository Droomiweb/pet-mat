// app/api/ai-advisor/generate-image/route.js
import { textModel } from "../../../lib/gemini"; // <--- FIXED PATH
import connectDB from "../../../lib/mongodb";    // <--- FIXED PATH
import Pet from "../../../models/PetModel";      // <--- FIXED PATH

export async function POST(req) {
  try {
    await connectDB();
    const { petAId, petBId } = await req.json();

    const petA = await Pet.findById(petAId);
    const petB = await Pet.findById(petBId);

    // 1. Generate Prompt
    const prompt = `
      Two pets are mating. 
      Parent 1: ${petA.breed} (${petA.color || 'Standard color'}). 
      Parent 2: ${petB.breed} (${petB.color || 'Standard color'}).
      
      Describe the visual appearance of their potential offspring (puppy/kitten) in 15 words or less. Focus on fur color, ear shape, and size.
    `;

    const result = await textModel.generateContent(prompt);
    const imagePrompt = result.response.text();

    // 2. Generate Image URL (Pollinations)
    const encodedPrompt = encodeURIComponent(`${imagePrompt} cute, photorealistic, cinematic lighting, 4k, baby animal`);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?nologo=true`;

    return new Response(JSON.stringify({ imageUrl }), { status: 200 });

  } catch (err) {
    return new Response(JSON.stringify({ error: "Failed to generate image" }), { status: 500 });
  }
}
// app/api/ai-advisor/generate-image/route.js

// 1. IMPORTS
// We use the 'visionModel' specifically because we need the AI to analyze input images.
import { visionModel } from "../../../lib/gemini"; 
import connectDB from "../../../lib/mongodb";    
import Pet from "../../../models/PetModel";      

// 2. HELPER FUNCTION
// Gemini Vision requires images to be sent as Base64 strings, not raw URLs.
// This helper downloads the image from Cloudinary (or wherever) and converts it.
async function fetchImageAsBase64(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer).toString("base64");
  } catch (error) {
    console.error("Error fetching image for AI:", error);
    return null;
  }
}

// 3. POST HANDLER
export async function POST(req) {
  try {
    await connectDB();
    
    // We expect the IDs of the two potential parents
    const { petAId, petBId } = await req.json();

    // Fetch parent data from DB
    const petA = await Pet.findById(petAId);
    const petB = await Pet.findById(petBId);

    if (!petA || !petB) {
        return new Response(JSON.stringify({ error: "Pets not found" }), { status: 404 });
    }

    // 4. SPECIES CONSISTENCY LOGIC
    // We must define what the "baby" is.
    // Rule: If species match, use that. If they differ (e.g., Dog + Cat), default to Parent A (Mother).
    let babyTerm = "baby animal";
    let targetSpecies = petA.type; // Default to Parent A's species

    // Map species types to their young terms for better image prompts
    if (targetSpecies === "Dog") babyTerm = "Puppy";
    else if (targetSpecies === "Cat") babyTerm = "Kitten";
    else if (targetSpecies === "Rabbit") babyTerm = "Bunny";
    else if (targetSpecies === "Bird") babyTerm = "Chick";

    // 5. CONSTRUCT THE VISION PROMPT
    // This prompt instructs Gemini on HOW to analyze the images.
    const prompt = `
      You are an expert animal artist.
      
      **TASK**: Describe the visual appearance of a **${babyTerm}** (${petA.breed} mix).
      
      **PARENT 1**: ${petA.breed} (${petA.type})
      **PARENT 2**: ${petB.breed} (${petB.type})
      **REQUIRED SPECIES**: ${targetSpecies} (${babyTerm})
      
      **STRICT VISUAL RULES**:
      1. **SPECIES PRIORITY**: The offspring MUST be a ${targetSpecies} (${babyTerm}). DO NOT create a hybrid of different species (e.g., do NOT mix a dog and a cat). If parents are different species, ignore Parent 2's species traits and focus on Parent 1.
      2. **BREED CONSISTENCY**: If both parents are the same breed (e.g., both Persian Cats), the offspring MUST look like a purebred of that breed.
      3. **TRAIT BLENDING**: Analyze the images provided. Pick up specific visual traits: fur color, pattern, ear shape. Blend these into the baby.
      
      **OUTPUT FORMAT**:
      Return ONLY the raw image prompt string.
      Example: "A photorealistic, fluffy Golden Retriever puppy with white chest markings, soft cinematic lighting, 8k."
    `;

    // Initialize the parts array with the text prompt
    const inputParts = [prompt];

    // 6. ATTACH PARENT IMAGES
    // We only attach the image if it exists and successfully converts to Base64.
    if (petA.imageUrls && petA.imageUrls.length > 0) {
        const imgA = await fetchImageAsBase64(petA.imageUrls[0]);
        if (imgA) inputParts.push({ inlineData: { data: imgA, mimeType: "image/jpeg" } });
    }

    if (petB.imageUrls && petB.imageUrls.length > 0) {
        const imgB = await fetchImageAsBase64(petB.imageUrls[0]);
        if (imgB) inputParts.push({ inlineData: { data: imgB, mimeType: "image/jpeg" } });
    }

    // 7. STEP 1: GENERATE DESCRIPTION (Gemini)
    // We ask Gemini to describe the imaginary offspring based on the parents' photos.
    const result = await visionModel.generateContent(inputParts);
    const response = await result.response;
    
    // Clean the text to ensure it's a valid single-line prompt
    const imageDescription = response.text().replace(/\n/g, " ").trim();
    
    console.log("Generated Offspring Prompt:", imageDescription);

    // 8. STEP 2: GENERATE IMAGE URL (Pollinations)
    // We use Pollinations AI as the rendering engine because it's free, fast, and requires no API key.
    // 'Flux' is a specific model good for realism.
    const seed = Math.floor(Math.random() * 99999);
    const encodedPrompt = encodeURIComponent(imageDescription);
    
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?nologo=true&seed=${seed}&model=flux`;

    // Return the URL so the frontend can display it in an <img /> tag
    return new Response(JSON.stringify({ imageUrl }), { status: 200 });

  } catch (err) {
    console.error("Image Gen Error:", err);
    return new Response(JSON.stringify({ error: "Failed to generate image" }), { status: 500 });
  }
}
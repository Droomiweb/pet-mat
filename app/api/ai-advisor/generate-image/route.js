// app/api/ai-advisor/generate-image/route.js

// Standard imports
import { visionModel } from "../../../lib/gemini"; 
import connectDB from "../../../lib/mongodb";    
import Pet from "../../../models/PetModel";      

// Convert image format
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

// POST request handler
export async function POST(req) {
  try {
    await connectDB();
    
    // Parse parent IDs
    const { petAId, petBId } = await req.json();

    // Fetch parent pets
    const petA = await Pet.findById(petAId);
    const petB = await Pet.findById(petBId);

    if (!petA || !petB) {
        return new Response(JSON.stringify({ error: "Pets not found" }), { status: 404 });
    }

    // Determine species logic
    let babyTerm = "baby animal";
    let targetSpecies = petA.type; // Default to mother

    // Set baby terminology
    if (targetSpecies === "Dog") babyTerm = "Puppy";
    else if (targetSpecies === "Cat") babyTerm = "Kitten";
    else if (targetSpecies === "Rabbit") babyTerm = "Bunny";
    else if (targetSpecies === "Bird") babyTerm = "Chick";

    // Define vision prompt
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

    // Prepare input data
    const inputParts = [prompt];

    // Attach parent images
    if (petA.imageUrls && petA.imageUrls.length > 0) {
        const imgA = await fetchImageAsBase64(petA.imageUrls[0]);
        if (imgA) inputParts.push({ inlineData: { data: imgA, mimeType: "image/jpeg" } });
    }

    if (petB.imageUrls && petB.imageUrls.length > 0) {
        const imgB = await fetchImageAsBase64(petB.imageUrls[0]);
        if (imgB) inputParts.push({ inlineData: { data: imgB, mimeType: "image/jpeg" } });
    }

    // Generate visual description
    const result = await visionModel.generateContent(inputParts);
    const response = await result.response;
    
    // Sanitize prompt text
    const imageDescription = response.text().replace(/\n/g, " ").trim();
    
    console.log("Generated Offspring Prompt:", imageDescription);

    // Generate image URL
    const seed = Math.floor(Math.random() * 99999);
    const encodedPrompt = encodeURIComponent(imageDescription);
    
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?nologo=true&seed=${seed}&model=flux`;

    // Return image link
    return new Response(JSON.stringify({ imageUrl }), { status: 200 });

  } catch (err) {
    console.error("Image Gen Error:", err);
    return new Response(JSON.stringify({ error: "Failed to generate image" }), { status: 500 });
  }
}
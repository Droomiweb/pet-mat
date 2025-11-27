// app/api/ai-advisor/generate-image/route.js
import { visionModel } from "../../../lib/gemini"; 
import connectDB from "../../../lib/mongodb";    
import Pet from "../../../models/PetModel";      

// Helper to buffer image
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

export async function POST(req) {
  try {
    await connectDB();
    const { petAId, petBId } = await req.json();

    // Note: In Mating requests, usually PetA is the 'Mother' (or the one hosting the page) contextually
    const petA = await Pet.findById(petAId);
    const petB = await Pet.findById(petBId);

    if (!petA || !petB) {
        return new Response(JSON.stringify({ error: "Pets not found" }), { status: 404 });
    }

    // 1. Enforce Species Consistency
    // If users try to mate a Dog and a Cat, we default to the species of Pet A to avoid "hybrid monsters".
    let babyTerm = "baby animal";
    let targetSpecies = petA.type; // Default to Parent A's species

    if (targetSpecies === "Dog") babyTerm = "Puppy";
    else if (targetSpecies === "Cat") babyTerm = "Kitten";
    else if (targetSpecies === "Rabbit") babyTerm = "Bunny";
    else if (targetSpecies === "Bird") babyTerm = "Chick";

    // 2. Construct Precise Vision Prompt
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

    const inputParts = [prompt];

    // 3. Attach Parent Images
    if (petA.imageUrls && petA.imageUrls.length > 0) {
        const imgA = await fetchImageAsBase64(petA.imageUrls[0]);
        if (imgA) inputParts.push({ inlineData: { data: imgA, mimeType: "image/jpeg" } });
    }

    if (petB.imageUrls && petB.imageUrls.length > 0) {
        const imgB = await fetchImageAsBase64(petB.imageUrls[0]);
        if (imgB) inputParts.push({ inlineData: { data: imgB, mimeType: "image/jpeg" } });
    }

    // 4. Generate Description via Gemini Vision
    const result = await visionModel.generateContent(inputParts);
    const response = await result.response;
    const imageDescription = response.text().replace(/\n/g, " ").trim();
    
    console.log("Generated Offspring Prompt:", imageDescription);

    // 5. Generate URL via Pollinations (Flux Model)
    const seed = Math.floor(Math.random() * 99999);
    const encodedPrompt = encodeURIComponent(imageDescription);
    
    // "flux" model provides better realism for animals
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?nologo=true&seed=${seed}&model=flux`;

    return new Response(JSON.stringify({ imageUrl }), { status: 200 });

  } catch (err) {
    console.error("Image Gen Error:", err);
    return new Response(JSON.stringify({ error: "Failed to generate image" }), { status: 500 });
  }
}
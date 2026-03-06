// app/api/ai-advisor/generate-image/route.js

// Standard imports
import { executeHybridRequest } from "../../../lib/gemini";
import connectDB from "../../../lib/mongodb";
import Pet from "../../../models/PetModel";
import GeneratedImage from "../../../models/GeneratedImage";
import { generateStableAIImage } from "../../../lib/imageGenerator";
import cloudinary from "../../../lib/cloudinary";

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

    // Parse body
    const { petAId, petBId, userId, regenerate } = await req.json();

    if (!petAId || !petBId || !userId) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
    }

    // 1. Check if image already exists in DB (unless regenerating)
    if (!regenerate) {
      const existingImage = await GeneratedImage.findOne({
        $or: [
          { parentAId: petAId, parentBId: petBId },
          { parentAId: petBId, parentBId: petAId }
        ]
      }).sort({ createdAt: -1 }); // Get latest

      if (existingImage && existingImage.imageUrl && existingImage.imageUrl.includes("cloudinary.com")) {
        return new Response(JSON.stringify({
          imageUrl: existingImage.imageUrl,
          behaviorPrediction: existingImage.behaviorPrediction,
          fromCache: true
        }), { status: 200 });
      }
      console.log("ℹ️ Found broken or old image link. Forcing regeneration via Stable Flow...");
    }

    // 2. Fetch parent pets for generation
    let petA = await Pet.findById(petAId);
    const petB = await Pet.findById(petBId);

    if (!petB) {
      return new Response(JSON.stringify({ error: "Target pet not found" }), { status: 404 });
    }

    // --- AUTO-DETECT PARTNER FOR PREGNANT/MATED PETS ---
    if (!petA) {
        // Option 1: Try sireId (if petB is female and has a sire recorded for her litter)
        if (petB.sireId) {
            petA = await Pet.findById(petB.sireId);
        }
        
        // Option 2: Try matingHistory
        if (!petA) {
            const matedEntry = petB.matingHistory?.find(r => r.status === 'mated');
            if (matedEntry) {
                petA = await Pet.findById(matedEntry.requesterPetId);
            }
        }
    }

    if (!petA) {
      return new Response(JSON.stringify({ error: "Partner pet not found. Genetic prediction requires two parents." }), { status: 404 });
    }

    // Determine species logic
    let babyTerm = "baby animal";
    let targetSpecies = petB.type || petA.type; 

    if (targetSpecies === "Dog") babyTerm = "Puppy";
    else if (targetSpecies === "Cat") babyTerm = "Kitten";
    else if (targetSpecies === "Rabbit") babyTerm = "Bunny";
    else if (targetSpecies === "Bird") babyTerm = "Chick";

    // 3. Define ENHANCED vision prompt
    const prompt = `
      You are an expert animal geneticist and skilled visual prompt engineer. 
      Analyze the provided photos of Pet A (${petA?.name}, ${petA?.breed}) and Pet B (${petB?.name}, ${petB?.breed}).
      
      1. Create a HYPER-DETAILED, photorealistic image generation prompt (max 50 words) for their **baby ${babyTerm}** (approx 8 weeks old).
      - **CRITICAL**: Do not use generic descriptions. You MUST extract specific visual phenotypes from the parent photos (e.g., exact fur color patches, eye colors, ear shapes, coat texture, snout length) and blend them realistically into the baby.
      - Make the description highly specific so the image generator produces a baby that looks *unmistakably* like a genetic mix of these exact two specific animals.
      - Start the prompt with: "A hyper-realistic 8k photograph of a baby ${babyTerm}..."
      
      2. Provide a separate "Behavior Prediction" (max 12 words) about its personality based on the parents' breeds.
      
      Return EXACTLY in this format: 
      Prompt: [highly detailed visual prompt] | Behavior: [behavior prediction]
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

    // 3. Execute Hybrid AI Request (Gemini -> Groq -> HF Fallback)
    const result = await executeHybridRequest("generate", { inputParts: inputParts });
    const aiText = result.response.text();
    
    let imageDescription = aiText;
    let behaviorPrediction = "Energetic and loyal companion.";
    
    if (aiText.includes("|")) {
        const parts = aiText.split("|");
        imageDescription = parts[0].replace(/Prompt:/i, "").trim();
        behaviorPrediction = parts[1].replace(/Behavior:/i, "").trim();
    }


    // 4. Generate Final Image URL (Stable Server-Side Gen + Cloudinary Proxy)
    let finalImageUrl = await generateStableAIImage(imageDescription);

    // 5. Final Fail-safe Fallback 
    if (!finalImageUrl) {
        console.warn("⚠️ All AI Image Generators failed. Using breed-specific placeholder.");
        const randomSeed = Math.floor(Math.random() * 100000);
        const breedKeyword = petA?.breed ? encodeURIComponent(petA.breed.split(' ')[0].toLowerCase()) : "dog";
        finalImageUrl = `https://loremflickr.com/1024/1024/${babyTerm.toLowerCase()},${breedKeyword}?random=${randomSeed}`;
    }

    // 6. Save to Database (Update old one if migrating, otherwise create new)
    if (!regenerate) {
        const oldImage = await GeneratedImage.findOne({
            $or: [
                { parentAId: petAId, parentBId: petBId },
                { parentAId: petBId, parentBId: petAId }
            ]
        });

        if (oldImage && !oldImage.imageUrl.includes("cloudinary")) {
            oldImage.imageUrl = finalImageUrl;
            oldImage.promptUsed = imageDescription;
            oldImage.behaviorPrediction = behaviorPrediction;
            await oldImage.save();
            console.log("✅ Migrated broken image record to Cloudinary.");
        } else {
             await GeneratedImage.create({
                userId: userId,
                parentAId: petAId,
                parentBId: petBId,
                imageUrl: finalImageUrl,
                promptUsed: imageDescription,
                behaviorPrediction: behaviorPrediction
            });
        }
    } else {
        await GeneratedImage.create({
            userId: userId,
            parentAId: petAId,
            parentBId: petBId,
            imageUrl: finalImageUrl,
            promptUsed: imageDescription,
            behaviorPrediction: behaviorPrediction
        });
    }

    return new Response(JSON.stringify({ 
      imageUrl: finalImageUrl, 
      behaviorPrediction: behaviorPrediction,
      fromCache: false 
    }), { status: 200 });

  } catch (err) {
    console.error("Image Gen Error:", err);
    return new Response(JSON.stringify({ error: err.message || "Failed to generate image" }), { status: 500 });
  }
}
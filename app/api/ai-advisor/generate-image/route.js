// app/api/ai-advisor/generate-image/route.js

// Standard imports
import { visionModel } from "../../../lib/gemini";
import connectDB from "../../../lib/mongodb";
import Pet from "../../../models/PetModel";
import GeneratedImage from "../../../models/GeneratedImage";
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

      if (existingImage) {
        return new Response(JSON.stringify({
          imageUrl: existingImage.imageUrl,
          behaviorPrediction: existingImage.behaviorPrediction,
          fromCache: true
        }), { status: 200 });
      }
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
    // 3. Define ENHANCED vision prompt - Hyper-concise to prevent Pollination HTML errors
    const prompt = `
      1. Create a highly detailed image prompt (max 40 words) for a **${babyTerm}** (baby/juvenile) that is a mix of ${petA?.breed} and ${petB?.breed}. 
      - **CRITICAL**: Subject MUST be a **baby ${babyTerm}** (approx 8 weeks old).
      - Explicit mention of "A generic, adorable ${babyTerm}, mix of ${petA?.breed} and ${petB?.breed}"
      - Combine physical traits from both parents (ears, coat, snout) but keep features distinctly juvenile (big eyes, clumsy paws, soft fur).
      - Do NOT use generic words like "fluffy" or "cute" unless the breeds are actually fluffy.
      2. Provide a separate "Behavior Prediction" (max 12 words) about its personality.
      Return format: Prompt: [image prompt] | Behavior: [behavior prediction]
      Style: Realistic 8k photo, studio lighting, macro photography, highly detailed.
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

    // Generate visual description and behavior
    const result = await visionModel.generateContent(inputParts);
    const aiText = result.response.text();
    
    let imageDescription = aiText;
    let behaviorPrediction = "Energetic and loyal companion.";
    
    if (aiText.includes("|")) {
        const parts = aiText.split("|");
        imageDescription = parts[0].replace(/Prompt:/i, "").trim();
        behaviorPrediction = parts[1].replace(/Behavior:/i, "").trim();
    }

    console.log("Generated Prompt:", imageDescription);
    console.log("Behavior Prediction:", behaviorPrediction);

    // 4. Generate Image URL (Hugging Face - SDXL)
    const apiKey = process.env.HUGGINGFACE_API_KEY;
    console.log(`[ImageGen] Using Hugging Face SDXL...`);

    let finalImageUrl = "";
    
    // Retry logic for HF
    let retries = 0;
    const MAX_RETRIES = 3;
    const hfModel = "stabilityai/stable-diffusion-xl-base-1.0";

    while (retries <= MAX_RETRIES) {
        try {
            console.log(`[ImageGen] Attempt ${retries + 1} (${hfModel})...`);
            const hfRes = await fetch(
                `https://router.huggingface.co/hf-inference/models/${hfModel}`,
                {
                    headers: {
                        Authorization: `Bearer ${apiKey}`,
                        "Content-Type": "application/json",
                    },
                    method: "POST",
                    body: JSON.stringify({ inputs: imageDescription }),
                }
            );

            if (hfRes.ok) {
                const buffer = Buffer.from(await hfRes.arrayBuffer());
                console.log(`Fetched image from HF, size: ${buffer.length} bytes`);

                if (process.env.CLOUDINARY_URL || (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY)) {
                    try {
                        const uploadToCloudinary = () => {
                            return new Promise((resolve, reject) => {
                                const uploadStream = cloudinary.uploader.upload_stream(
                                { folder: "pet_generated_art" },
                                (error, result) => {
                                    if (error) reject(error);
                                    else resolve(result);
                                }
                                );
                                uploadStream.end(buffer);
                            });
                        };

                        const cloudinaryResult = await uploadToCloudinary();
                        finalImageUrl = cloudinaryResult.secure_url;
                        break; // Success
                    } catch (cloudErr) {
                        console.error("Cloudinary Upload Failed:", cloudErr);
                        throw new Error("Failed to save generated image.");
                    }
                } else {
                    throw new Error("Cloudinary not configured. Cannot save binary image.");
                }
            } else {
                 const errText = await hfRes.text();
                 console.warn(`[ImageGen] HF Error (Attempt ${retries + 1}): ${hfRes.status} - ${errText}`);
                 if (hfRes.status === 503 || hfRes.status === 500) {
                     // Retryable
                 } else {
                     throw new Error(`HF API Error: ${errText}`);
                 }
            }

        } catch (e) {
            console.warn(`[ImageGen] Attempt ${retries + 1} exception:`, e.message);
            if (!e.message.includes("503") && !e.message.includes("500")) throw e;
        }

        retries++;
        if (retries <= MAX_RETRIES) {
            const waitTime = 2000 + (retries * 1000);
            console.log(`[ImageGen] Retrying in ${waitTime}ms...`);
            await new Promise(r => setTimeout(r, waitTime));
        }
    }

    if (!finalImageUrl) {
        throw new Error("Failed to generate image after retries.");
    }

    // 5. Save to Database
    await GeneratedImage.create({
      userId: userId,
      parentAId: petAId,
      parentBId: petBId,
      imageUrl: finalImageUrl,
      promptUsed: imageDescription,
      behaviorPrediction: behaviorPrediction
    });

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
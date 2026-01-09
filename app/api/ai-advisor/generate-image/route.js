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
      1. Create a short, descriptive image prompt (under 30 words) for an animal offspring pup based on parents: ${petA?.breed} and ${petB?.breed}. Focus on blending coat color and features.
      2. Provide a separate "Behavior Prediction" (max 12 words) about its personality.
      Return format: Prompt: [image prompt] | Behavior: [behavior prediction]
      Style: Full-body, realistic 8k photo, natural background, 1:1.
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

    // 4. Generate Image URL (Pollinations)
    const apiKey = process.env.POLLINATIONS_API_KEY;
    console.log(`[ImageGen] API Key configured: ${apiKey ? "YES (" + apiKey.slice(0, 5) + "...)" : "NO"}`);

    // Sanitize and shorten prompt for Pollinations stability
    const cleanDescription = imageDescription.replace(/["\n\r]/g, " ").substring(0, 200);
    const encodedPrompt = encodeURIComponent(cleanDescription);
    let pollinationsUrl = "";

    let imageRes;
    let retries = 0;
    const MAX_RETRIES = 4;
    const models = ["flux", "turbo", "unity"]; // Prioritize flux
    const subdomains = ["image.pollinations.ai", "gen.pollinations.ai"];

    while (retries <= MAX_RETRIES) {
      // Rotate through models and subdomains
      const model = models[retries % models.length];
      const subdomain = subdomains[retries % subdomains.length];
      const newSeed = Math.floor(Math.random() * 99999);
      
      // Use the updated URL structure: /prompt/{prompt} or /image/{prompt}
      pollinationsUrl = `https://${subdomain}/prompt/${encodedPrompt}?nologo=true&seed=${newSeed}&model=${model}&width=1024&height=1024`;
      
      try {
        console.log(`[ImageGen] Attempt ${retries + 1} (${model} on ${subdomain})...`);
        imageRes = await fetch(pollinationsUrl, {
          headers: apiKey ? { "Authorization": `Bearer ${apiKey}` } : {}
        });
        
        const contentType = imageRes.headers.get("content-type") || "";
        if (imageRes.ok && contentType.startsWith("image/")) {
          console.log(`✅ Success with model: ${model} on ${subdomain}`);
          break; // Success
        }
        
        if (contentType.includes("text/html")) {
          const html = await imageRes.text();
          console.warn(`[ImageGen] HTML Error (Attempt ${retries + 1}): ${html.substring(0, 200).replace(/\n/g, " ")}`);
        } else if (!imageRes.ok) {
          try {
            const errorData = await imageRes.json();
            console.warn(`[ImageGen] API Error (Attempt ${retries + 1}):`, errorData);
          } catch (e) {
            console.warn(`[ImageGen] Attempt ${retries + 1} failed with status ${imageRes.status}`);
          }
        }
      } catch (e) {
        console.warn(`[ImageGen] Attempt ${retries + 1} exception:`, e.message);
      }
      
      retries++;
      if (retries <= MAX_RETRIES) {
        const waitTime = 1000 + (retries * 500); // Gradual backoff
        console.log(`[ImageGen] Retrying in ${waitTime}ms...`);
        await new Promise(r => setTimeout(r, waitTime));
      }
    }

    if (!imageRes || !imageRes.ok || !(imageRes.headers.get("content-type") || "").startsWith("image/")) {
       throw new Error(`AI image engine is currently busy. Please try again in 10 seconds.`);
    }

    const contentType = imageRes.headers.get("content-type") || "";
    let finalImageUrl = pollinationsUrl;

    if (contentType.startsWith("image/")) {
      const buffer = Buffer.from(await imageRes.arrayBuffer());
      console.log(`Fetched image of type ${contentType}, size: ${buffer.length} bytes`);

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
        } catch (cloudErr) {
          console.error("Cloudinary Upload Failed, falling back to direct URL:", cloudErr);
        }
      } else {
        console.warn("Cloudinary not configured. Using direct Pollinations URL.");
      }
    } else {
      console.error(`Pollinations ERROR: Returned ${contentType} instead of image.`);
      
      // Fallback: If it's a small breed, sometimes shorter prompts work better
      if (contentType.includes("text/html")) {
        throw new Error("The AI image engine is currently busy. Please try again in a few seconds.");
      }
      throw new Error("AI engine is overloaded. Please try again in 10 seconds.");
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
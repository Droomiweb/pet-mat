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
        parentAId: petAId,
        parentBId: petBId
      }).sort({ createdAt: -1 }); // Get latest

      if (existingImage) {
        return new Response(JSON.stringify({
          imageUrl: existingImage.imageUrl,
          fromCache: true
        }), { status: 200 });
      }
    }

    // 2. Fetch parent pets for generation
    const petA = await Pet.findById(petAId);
    const petB = await Pet.findById(petBId);

    if (!petA || !petB) {
      return new Response(JSON.stringify({ error: "Pets not found" }), { status: 404 });
    }

    // Determine species logic
    let babyTerm = "baby animal";
    let targetSpecies = petA.type; // Default to mother

    if (targetSpecies === "Dog") babyTerm = "Puppy";
    else if (targetSpecies === "Cat") babyTerm = "Kitten";
    else if (targetSpecies === "Rabbit") babyTerm = "Bunny";
    else if (targetSpecies === "Bird") babyTerm = "Chick";

    // 3. Define ENHANCED vision prompt
    const prompt = `
      You are an expert animal photographer and geneticist.
      
      **TASK**: Describe the visual appearance of a **${babyTerm}** (${petA.breed} mix).
      
      **PARENT 1**: ${petA.breed} (${petA.type})
      **PARENT 2**: ${petB.breed} (${petB.type})
      **REQUIRED SPECIES**: ${targetSpecies} (${babyTerm})
      
      **VISUAL REQUIREMENTS (STRICT):**
      1. **FULL BODY SHOT**: The image must show the ENTIRE animal from head to paws. Do not crop the head or feet. Center the subject.
      2. **REALISM**: Photorealistic, 8k resolution, cinematic lighting, highly detailed fur/feathers.
      3. **BACKGROUND**: Soft, blurred natural background (bokeh) to emphasize the pet.
      4. **TRAITS**: Blend the coat colors and patterns of the parents naturally.
      5. **ASPECT RATIO**: Square 1:1.
      
      **OUTPUT FORMAT**:
      Return ONLY the raw image prompt string.
      Example: "A full-body studio shot of a fluffy Golden Retriever puppy with white paws, sitting on grass, soft lighting, 8k, wide angle."
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
    const imageDescription = response.text().replace(/\n/g, " ").trim();

    console.log("Generated Prompt:", imageDescription);

    // 4. Generate Image URL (Pollinations)
    const seed = Math.floor(Math.random() * 99999);
    const encodedPrompt = encodeURIComponent(imageDescription + " --ar 1:1 --no-crop");

    // Explicitly requesting 1024x1024
    let pollinationsUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?nologo=true&seed=${seed}&model=flux&width=1024&height=1024`;

    console.log("Fetching image from:", pollinationsUrl);

    const imageRes = await fetch(pollinationsUrl, {
      headers: process.env.POLLINATIONS_API_KEY ? { "Authorization": `Bearer ${process.env.POLLINATIONS_API_KEY}` } : {}
    });

    if (!imageRes.ok) throw new Error(`Pollinations API Failed: ${imageRes.statusText}`);

    const buffer = Buffer.from(await imageRes.arrayBuffer());

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
    const finalImageUrl = cloudinaryResult.secure_url;

    // 5. Save to Database
    await GeneratedImage.create({
      userId: userId,
      parentAId: petAId,
      parentBId: petBId,
      imageUrl: finalImageUrl,
      promptUsed: imageDescription
    });

    return new Response(JSON.stringify({ imageUrl: finalImageUrl, fromCache: false }), { status: 200 });

  } catch (err) {
    console.error("Image Gen Error:", err);
    return new Response(JSON.stringify({ error: "Failed to generate image" }), { status: 500 });
  }
}
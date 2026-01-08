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
    // 3. Define ENHANCED vision prompt - Hyper-concise to prevent Pollination HTML errors
    const prompt = `
      Create a short, descriptive prompt (under 30 words) for an animal offspring pup.
      Parents: ${petA?.breed} and ${petB?.breed}.
      Traits to blend: coat color, patterns, and features.
      Style: Full-body, realistic 8k photo, natural background, centered, 1:1 aspect ratio.
      DO NOT include fluff or technical jargon.
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
    // Sanitize and shorten prompt for Pollinations stability
    const cleanDescription = imageDescription.replace(/["\n\r]/g, " ").substring(0, 200);
    const encodedPrompt = encodeURIComponent(cleanDescription);

    // Using flux model for better reliability
    let pollinationsUrl = `https://pollinations.ai/p/${encodedPrompt}?nologo=true&seed=${seed}&model=flux`;

    console.log("Fetching image from:", pollinationsUrl);

    const imageRes = await fetch(pollinationsUrl, {
      headers: process.env.POLLINATIONS_API_KEY ? { "Authorization": `Bearer ${process.env.POLLINATIONS_API_KEY}` } : {}
    });

    if (!imageRes.ok) throw new Error(`Pollinations API Failed: ${imageRes.statusText}`);

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
      throw new Error("AI engine is overloaded. Please try again in 10 seconds.");
    }

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
    return new Response(JSON.stringify({ error: err.message || "Failed to generate image" }), { status: 500 });
  }
}
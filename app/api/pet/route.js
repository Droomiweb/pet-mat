// app/api/pet/route.js
import connectDB from "../../lib/mongodb";
import Pet from "../../models/PetModel"; 
import User from "../../models/User";
import { v2 as cloudinary } from "cloudinary";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// --- BACKGROUND VERIFICATION LOGIC (PRODUCTION GEMINI VERSION) ---
const runAutoVerification = async (petId, petData) => {
  try {
    const { name, breed, age, certificateUrl } = petData;
    
    console.log(`[Verification] Starting Gemini analysis for Pet ${petId}...`);

    // 1. Fetch image buffer from the Cloudinary URL
    // (Gemini needs the raw image data to analyze it)
    const imageResp = await fetch(certificateUrl);
    if (!imageResp.ok) throw new Error("Failed to fetch certificate image");
    
    const imageBuffer = await imageResp.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString("base64");

    const imagePart = {
      inlineData: {
        data: base64Image,
        mimeType: "image/jpeg",
      },
    };

    // 2. Construct the Prompt (IDENTICAL to your working Test Sandbox)
    const prompt = `
      Act as a strict Pet Verification Officer. Analyze this health certificate image.
      
      Expected Data (from User):
      - Name: "${name}"
      - Breed: "${breed}"
      - Age: "${age}"

      Tasks:
      1. Extract the Pet Name, Breed, Age, and Issuer Name visible on the document.
      2. Compare the extracted text with the Expected Data.
      3. Be flexible with Case Sensitivity (e.g., "pug" == "Pug") and slight spelling variations.
      4. Determine a status: "verified" (Matches), "rejected" (Clear mismatch or fake), or "needs-review" (Unclear).

      Respond ONLY with this JSON structure:
      {
        "extractedData": {
          "name": "...",
          "breed": "...",
          "age": "...",
          "issuer": "..."
        },
        "matchResults": {
          "nameMatch": boolean,
          "breedMatch": boolean,
          "issuerFound": boolean
        },
        "status": "verified" | "rejected" | "needs-review",
        "reason": "Short explanation"
      }
    `;

    // 3. Run AI Analysis
    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    
    // Clean response to ensure valid JSON
    const text = response.text().replace(/```json/g, "").replace(/```/g, "").trim();
    const aiResult = JSON.parse(text);
    
    // 4. Save Results to DB
    // We format the extracted data into a readable string for 'ocrText'
    // and save the full JSON object in 'aiResponse'.
    const readableSummary = `Extracted: Name=${aiResult.extractedData.name}, Breed=${aiResult.extractedData.breed}, Age=${aiResult.extractedData.age}, Issuer=${aiResult.extractedData.issuer}`;

    await Pet.findByIdAndUpdate(petId, {
      verificationStatus: aiResult.status,
      'verificationAnalysis.ocrText': readableSummary, 
      'verificationAnalysis.aiResponse': JSON.stringify(aiResult),
      'verificationAnalysis.aiStatus': `auto-${aiResult.status}`,
    });
    
    console.log(`✅ [Verification] Complete for ${petId}. Status: ${aiResult.status}`);

  } catch (err) {
    console.error(`❌ [Verification] Failed for Pet ${petId}:`, err);
    // Update status to 'needs-review' so an admin sees it failed
    try {
      await Pet.findByIdAndUpdate(petId, {
        verificationStatus: 'needs-review',
        'verificationAnalysis.aiStatus': 'error',
        'verificationAnalysis.aiResponse': JSON.stringify({ error: err.message }),
      });
    } catch (dbErr) {
      console.error("Failed to save error status to DB:", dbErr);
    }
  }
};

// --- MAIN ROUTE HANDLERS ---

// POST: Add a new pet
export async function POST(req) {
  try {
    await connectDB();

    const {
      name,
      type,
      age,
      breed,
      gender,
      listingType,
      certificateBase64,
      imagesBase64,
      ownerId,
    } = await req.json();

    if (!name || !type || !age || !breed || !gender || !listingType || !certificateBase64 || !imagesBase64 || !ownerId) {
      return new Response(JSON.stringify({ error: "All fields are required" }), { status: 400 });
    }

    // Upload Certificate
    const certUpload = await cloudinary.uploader.upload(certificateBase64, {
      folder: `certificates/${ownerId}`,
    });

    // Upload Images
    const imageUrls = [];
    for (const base64 of imagesBase64) {
      const upload = await cloudinary.uploader.upload(base64, {
        folder: `pets/${ownerId}`,
      });
      imageUrls.push(upload.secure_url);
    }

    const petData = {
      name,
      type,
      age,
      breed,
      gender,
      listingType,
      certificateUrl: certUpload.secure_url,
      imageUrls,
      ownerId,
      verificationStatus: "pending", 
    };

    const newPet = new Pet(petData);
    await newPet.save();

    // Trigger background verification (Non-blocking)
    // This calls the function above with the strict logic
    runAutoVerification(newPet._id, petData).catch((err) => {
      console.error("Failed to trigger background verification:", err);
    });

    return new Response(
      JSON.stringify({
        message: "Pet added successfully! Verification is in progress.",
        petId: newPet._id.toString(),
      }),
      { status: 201 }
    );
  } catch (err) {
    console.error("Error adding pet:", err);
    return new Response(JSON.stringify({ error: err.message || "Failed to add pet due to server error." }), { status: 500 });
  }
}

// GET: Fetch pets with filters (Unchanged)
export async function GET(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const breed = searchParams.get("breed");
    const city = searchParams.get("city");
    const excludeOwnerId = searchParams.get("excludeOwnerId");
    const listingType = searchParams.get("listingType");

    const petQuery = {};
    if (type) petQuery.type = type;
    if (breed) petQuery.breed = breed;
    if (excludeOwnerId) petQuery.ownerId = { $ne: excludeOwnerId };
    if (listingType) petQuery.listingType = listingType;

    // Hide pregnant pets
    petQuery.isPregnant = { $ne: true };

    // Only show verified pets
    // (Keep enabled for production so users only see verified listings)
    petQuery.verificationStatus = "verified";

    let pets = await Pet.find(petQuery).lean();

    // Filter by city
    if (city) {
      const usersInCity = await User.find({ "location.city": city }, "firebaseUid").lean();
      const userUids = usersInCity.map((u) => u.firebaseUid);
      pets = pets.filter((pet) => userUids.includes(pet.ownerId));
    }

    const petsWithLocation = await Promise.all(
      pets.map(async (pet) => {
        const owner = await User.findOne({ firebaseUid: pet.ownerId }, "location").lean();
        return {
          _id: pet._id.toString(),
          name: pet.name,
          type: pet.type,
          age: pet.age,
          breed: pet.breed,
          gender: pet.gender,
          temperament: pet.temperament,
          energyLevel: pet.energyLevel,
          listingType: pet.listingType,
          imageUrls: pet.imageUrls || [],
          certificateUrl: pet.certificateUrl || null,
          ownerId: pet.ownerId,
          location: owner?.location || null,
        };
      })
    );

    return new Response(JSON.stringify(petsWithLocation), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error fetching pets:", err);
    return new Response(JSON.stringify({ error: "Failed to fetch pets" }), { status: 500 });
  }
}
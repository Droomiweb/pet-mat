// app/api/pet/route.js
import connectDB from "../../lib/mongodb";
import Pet from "../../models/PetModel";
import User from "../../models/User";
import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// --- THIS IS THE NEW VERIFICATION LOGIC ---
// We run this in the background and don't make the user wait
const runAutoVerification = async (petId, petData) => {
  try {
    const { certificateUrl, name, age, breed } = petData;
    const pet = await Pet.findById(petId);
    if (!pet) throw new Error("Pet not found for verification");

    // 1. Get Base URL (for calling internal APIs)
    //    On Vercel, use process.env.NEXT_PUBLIC_APP_URL
    //    For local, use 'http://localhost:3000'
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // 2. Call OCR Tesseract API
    let ocrText = "";
    try {
      const ocrResponse = await fetch(`${baseUrl}/api/ocr-tesseract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ certificateUrl }),
      });
      if (ocrResponse.ok) {
        const ocrData = await ocrResponse.json();
        ocrText = ocrData.ocrText || "";
        pet.verificationAnalysis = pet.verificationAnalysis || {};
        pet.verificationAnalysis.ocrText = ocrText;
      }
    } catch (ocrError) {
      console.warn("OCR step failed:", ocrError.message);
      // Continue anyway, AI can still analyze the image
    }

    // 3. Call AI Verify API
    let aiStatus = "needs-review"; // Default
    let newVerificationStatus = "pending"; // Default

    try {
      const aiResponse = await fetch(`${baseUrl}/api/verify-certificate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ certificateUrl, petName: name, petAge: age, petBreed: breed, ocrText }),
      });

      if (!aiResponse.ok) {
        throw new Error(`AI API responded with status ${aiResponse.status}`);
      }

      const aiData = await aiResponse.json();
      const analysis = aiData.aiAnalysis;

      pet.verificationAnalysis = pet.verificationAnalysis || {};
      pet.verificationAnalysis.aiResponse = JSON.stringify(analysis);

      // 4. Decide on verification status
      if (analysis.isCertificateValid) {
        if (analysis.nameMatch && analysis.breedMatch) {
          aiStatus = "auto-verified";
          newVerificationStatus = "verified"; // SUCCESS!
        } else {
          // Valid cert, but data doesn't match. Flag for review.
          aiStatus = "needs-review";
          newVerificationStatus = "pending"; // Keep pending for admin
        }
      } else {
        // AI thinks it's a fake.
        aiStatus = "auto-rejected";
        newVerificationStatus = "rejected"; // REJECT!
      }
    } catch (aiError) {
      console.error("AI verification step failed:", aiError.message);
      pet.verificationAnalysis = pet.verificationAnalysis || {};
      pet.verificationAnalysis.aiResponse = JSON.stringify({ error: aiError.message });
      aiStatus = "needs-review";
      newVerificationStatus = "pending"; // Failed, so admin must check
    }

    // 5. Save all results to the Pet document
    pet.verificationAnalysis = pet.verificationAnalysis || {};
    pet.verificationAnalysis.aiStatus = aiStatus;
    pet.verificationStatus = newVerificationStatus;
    await pet.save();

    console.log(`Auto-verification complete for Pet ${petId}. Status: ${newVerificationStatus}`);
  } catch (err) {
    console.error(`Background verification failed for Pet ${petId}:`, err);
    // Try to update the pet to 'needs-review' if it fails
    try {
      await Pet.findByIdAndUpdate(petId, {
        verificationStatus: "pending",
        "verificationAnalysis.aiStatus": "needs-review",
        "verificationAnalysis.aiResponse": JSON.stringify({ error: `Verification process failed: ${err.message}` }),
      });
    } catch (updateError) {
      console.error("Failed to even update pet status after error:", updateError);
    }
  }
};
// --- END OF NEW VERIFICATION LOGIC ---


// Add a new pet (POST) - updated: temperament & energyLevel removed
export async function POST(req) {
  try {
    await connectDB();

    // Note: temperament & energyLevel removed here; they'll be set later in step 2
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

    // Validation
    if (!name || !type || !age || !breed || !gender || !listingType || !certificateBase64 || !imagesBase64 || !ownerId) {
      return new Response(JSON.stringify({ error: "All fields are required" }), { status: 400 });
    }

    // --- Cloudinary Uploads ---
    const certUpload = await cloudinary.uploader.upload(certificateBase64, {
      folder: `certificates/${ownerId}`,
    });

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
      verificationStatus: "pending", // Always start as pending
      // Temperament, EnergyLevel, and aiProfileString are now set in step 2
    };

    const newPet = new Pet(petData);
    await newPet.save();

    // --- TRIGGER AUTO-VERIFICATION (background) ---
    runAutoVerification(newPet._id, petData).catch((err) => {
      console.error("Failed to start auto-verification:", err.message);
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


// Fetch pets with optional filters (GET)
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

    // --- NEW: Hide pregnant pets from listings ---
    petQuery.isPregnant = { $ne: true };
    // --- END NEW ---

    // --- NEW: Only show verified pets ---
    petQuery.verificationStatus = "verified";
    // --- END NEW ---

    let pets = await Pet.find(petQuery).lean();

    // Filter by city if provided
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

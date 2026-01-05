// app/api/pet/route.js

// Standard imports
// Standard imports
import connectDB from "../../lib/mongodb";
import Pet from "../../models/PetModel";
import User from "../../models/User";
import { v2 as cloudinary } from "cloudinary";
import { NextResponse } from "next/server";
import { verifyAuth } from "../../lib/auth-middleware";
import { integrateNewPetIntoMatches } from "../../lib/matchLogic";
import { visionModel } from "../../lib/gemini"; // Import centralized service

// Service configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// REMOVED: Direct GoogleGenerativeAI initialization to allow key rotation via visionModel

// =====================
// Helper Functions
// =====================

// Format AI image
const fileToGenerativePart = (base64, mimeType) => {
  const base64Data = base64.split(",")[1] || base64;
  return {
    inlineData: {
      data: base64Data,
      mimeType: mimeType || "image/jpeg",
    },
  };
};

// Calculate pet age
const calculateAgeInYears = (dobString) => {
  if (!dobString || dobString.toUpperCase() === "N/A") return null;
  const parts = dobString.split("/");
  if (parts.length !== 3) return null;

  const dob = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
  const now = new Date();

  if (isNaN(dob.getTime()) || dob > now) return null;

  // Calculate decimal age
  const totalMonths =
    (now.getFullYear() - dob.getFullYear()) * 12 +
    (now.getMonth() - dob.getMonth()) +
    (now.getDate() < dob.getDate() ? -1 : 0);

  return Math.round((totalMonths / 12) * 10) / 10;
};

// Parse date format
const parseDateToUTC = (dateStr) => {
  if (!dateStr || dateStr.toUpperCase() === "N/A") return null;
  const parts = dateStr.split("/");
  if (parts.length === 3) {
    return new Date(
      Date.UTC(
        parseInt(parts[2], 10),
        parseInt(parts[1], 10) - 1,
        parseInt(parts[0], 10)
      )
    );
  }
  return null;
};

// =====================
// AI Analysis Logic
// =====================
const runCertificateAnalysis = async (petData) => {
  const { name, breed, age, certificateBase64, certificateMimeType, ownerName } =
    petData;

  console.log(
    `[Analysis] Starting Gemini analysis for Pet ${name} (Owner: ${ownerName})...`
  );

  const imagePart = fileToGenerativePart(certificateBase64, certificateMimeType);
  let aiResult = null;
  let ownerNameMatch = false;
  const MAX_RETRIES = 3;

  // Retry AI request
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      const prompt = `
        You are a specialized Pet Certificate Verification AI. Analyze the uploaded document (image or PDF) and compare it against the user-provided data.
        
        User-Provided Data:
        - Pet Name: "${name}"
        - Pet Breed: "${breed}"
        - Pet Age: "${age}"
        - Owner Name (Expected): "${ownerName}" 

        Tasks:
        1. Extract all key data from the document: Pet Name, Pet Owner Name.
        2. Extract Date of Birth (DOB). If DOB is found, use that value. If not, extract age.
        3. **Extract Lineage**: Look for "Sire" (Father) and "Dam" (Mother) names.
        4. Compare the extracted Pet Owner Name against the Expected Owner Name (case-insensitive & tolerant).
        5. Extract Vaccination Records: vaccine names, vaccination dates, and expiration dates.
        6. Provide a readable OCR text field for admin debugging.

        Respond ONLY with a valid JSON object in this exact format:
        {
          "extractedData": {
            "petName": "...",
            "ownerName": "...",
            "extractedDOB": "DD/MM/YYYY or N/A", 
            "extractedAge": "X years or N/A",
            "sireName": "Name or N/A",
            "damName": "Name or N/A",
            "aiOcrText": "Full readable text (for debug/admin)"
          },
          "vaccinationRecords": [
            { "vaccineName": "Rabies", "vaccinationDate": "DD/MM/YYYY", "expiryDate": "DD/MM/YYYY" }
          ],
          "status": "verified" | "rejected" | "needs-review",
          "reason": "Short explanation of the verification result."
        }
        If a date/value is missing, use "N/A". If no vaccinations are found, return an empty array.
      `;

      // Use visionModel from lib/gemini.js which handles rotation & formatted response
      const result = await visionModel.generateContent([prompt, imagePart]);
      const responseText = result.response.text();

      // Clean AI response
      const cleanedText = responseText
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

      aiResult = JSON.parse(cleanedText);
      break; // Exit on success
    } catch (err) {
      console.error(
        `Gemini Analysis Attempt ${i + 1} failed:`,
        err.message || err
      );
      if (i < MAX_RETRIES - 1) {
        // Exponential backoff delay
        const delay = (i + 1) * 2000;
        console.log(`Retrying in ${delay / 1000} seconds...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  // Handle AI failure
  if (!aiResult) {
    return {
      aiResult: null,
      ownerNameMatch: false,
      error: "AI analysis failed after all retries.",
    };
  }

  // Verify owner name
  const extractedOwnerName = aiResult.extractedData?.ownerName?.toLowerCase() || "";
  const expectedOwnerName = ownerName.toLowerCase();

  const isSubstringMatch =
    extractedOwnerName.includes(expectedOwnerName) ||
    expectedOwnerName.includes(extractedOwnerName);

  // Validate name length
  const isSane =
    extractedOwnerName.length >= 3 || expectedOwnerName.length >= 3;
  ownerNameMatch = isSubstringMatch && isSane;

  // Determine verification status
  let finalStatus;
  let finalReason;

  if (ownerNameMatch) {
    finalStatus = "verified";
    finalReason = "Owner name matched, and key certificate data was successfully extracted. Auto-verified.";
  } else {
    finalStatus = "rejected";
    finalReason = "Owner Name Mismatch. Primary security check failed (Name on certificate does not match user name).";
  }

  aiResult.finalStatus = finalStatus;
  aiResult.reason = finalReason;

  return { aiResult, ownerNameMatch };
};

// =====================
// POST Request Handler
// =====================
export async function POST(req) {
  try {
    await connectDB();

    const {
      name,
      type,
      age: userProvidedAge,
      breed,
      gender,
      listingType,
      certificateMimeType,
      imagesBase64,
      ownerName,
    } = await req.json();

    // Verify Authentication
    let decodedToken;
    try {
      decodedToken = await verifyAuth(req);
    } catch (authError) {
      return new Response(JSON.stringify({ error: authError.message }), { status: 401 });
    }

    // Enforce ownerId from token
    const ownerId = decodedToken.uid;

    // Validate input fields
    if (
      !name || !type || !userProvidedAge || !breed || !gender ||
      !name || !type || !userProvidedAge || !breed || !gender ||
      !listingType || !certificateBase64 || !imagesBase64 || !ownerName
    ) {
      return new Response(
        JSON.stringify({ error: "All fields are required" }),
        { status: 400 }
      );
    }

    // Upload certificate
    const certUpload = await cloudinary.uploader.upload(certificateBase64, {
      folder: `certificates/${ownerId}`,
      resource_type: "auto",
    });

    // Upload pet photo
    const imageUrls = [];
    if (imagesBase64.length > 0) {
      const upload = await cloudinary.uploader.upload(imagesBase64[0], {
        folder: `pets/${ownerId}`,
      });
      imageUrls.push(upload.secure_url);
    }

    // Run AI analysis
    const analysisResult = await runCertificateAnalysis({
      name,
      breed,
      age: userProvidedAge,
      certificateBase64,
      certificateMimeType,
      ownerName,
    });

    // Handle AI error
    if (analysisResult.error) {
      console.error("Critical AI Failure: ", analysisResult.error);

      const petCreationData = {
        name,
        type,
        age: parseInt(userProvidedAge, 10),
        breed,
        gender,
        listingType,
        certificateUrl: certUpload.secure_url,
        imageUrls,
        ownerId,
        sireName: null, // Unknown lineage
        damName: null,
        verificationStatus: "needs-review", // Admin review required
        certificateAnalysis: {
          certificateUrl: certUpload.secure_url,
          status: "ai-error",
          reason: analysisResult.error,
        },
        vaccinationHistory: [],
      };

      const newPet = new Pet(petCreationData);
      await newPet.save();

      return new Response(
        JSON.stringify({
          message: "Pet added successfully! Verification failed, pet is marked for Admin Review.",
          petId: newPet._id.toString(),
        }),
        { status: 201 }
      );
    }

    // Process AI results
    const aiData = analysisResult.aiResult;
    let finalAge = parseInt(userProvidedAge, 10);

    // Determine final age
    if (
      aiData?.extractedData?.extractedDOB &&
      aiData.extractedData.extractedDOB.toUpperCase() !== "N/A"
    ) {
      const calculatedAge = calculateAgeInYears(aiData.extractedData.extractedDOB);
      if (calculatedAge !== null) {
        finalAge = calculatedAge;
      }
    } else if (aiData?.extractedData?.extractedAge) {
      // Parse estimated age
      const ageMatch = aiData.extractedData.extractedAge.match(/(\d+)/);
      if (ageMatch) {
        finalAge = parseInt(ageMatch[1], 10);
      }
    }

    // Create pet object
    const petCreationData = {
      name,
      type,
      age: finalAge,
      breed,
      gender,
      listingType,
      certificateUrl: certUpload.secure_url,
      imageUrls,
      ownerId,

      // Extract lineage info
      sireName: aiData?.extractedData?.sireName !== "N/A" ? aiData.extractedData.sireName : null,
      damName: aiData?.extractedData?.damName !== "N/A" ? aiData.extractedData.damName : null,

      verificationStatus: aiData?.finalStatus || "needs-review",

      // Store analysis data
      certificateAnalysis: {
        certificateUrl: certUpload.secure_url,
        extractedOwnerName: aiData?.extractedData?.ownerName || null,
        extractedPetName: aiData?.extractedData?.petName || null,
        aiOcrText: aiData?.extractedData?.aiOcrText || (aiData?.extractedData ? JSON.stringify(aiData.extractedData) : null),
        ownerNameMatch: analysisResult.ownerNameMatch,
        status: aiData?.finalStatus || "ai-error",
        reason: aiData?.reason || analysisResult.error,
      },

      // Process vaccination records
      vaccinationHistory: (aiData?.vaccinationRecords || [])
        .map((vax) => {
          const vaxDate = parseDateToUTC(vax.vaccinationDate);
          const expiryDate = parseDateToUTC(vax.expiryDate);

          // Calculate status
          let status = "active";
          if (!expiryDate || isNaN(expiryDate.getTime())) {
            status = "needs-review";
          } else if (expiryDate < new Date()) {
            status = "expired";
          } else if (
            expiryDate < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          ) {
            status = "upcoming"; // Expiring soon
          }

          return {
            vaccineName: vax.vaccineName || "Unknown",
            vaccinationDate: vaxDate,
            expiryDate: expiryDate,
            status: status,
          };
        })
        .filter((vax) => vax.vaccinationDate),
    };

    const newPet = new Pet(petCreationData);
    await newPet.save();

    // --- TRIGGER EVENT-DRIVEN MATCHING ---
    // Update other pets' caches to include this new pet immediately
    await integrateNewPetIntoMatches(newPet);

    return new Response(
      JSON.stringify({
        message: "Pet added successfully! Verification is in progress.",
        petId: newPet._id.toString(),
      }),
      { status: 201 }
    );
  } catch (err) {
    console.error("Error adding pet:", err);
    return new Response(
      JSON.stringify({
        error: err.message || "Failed to add pet due to server error.",
      }),
      { status: 500 }
    );
  }
}

// =====================
// GET Request Handler
// =====================
export async function GET(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const breed = searchParams.get("breed");
    const city = searchParams.get("city");
    const excludeOwnerId = searchParams.get("excludeOwnerId");
    const listingType = searchParams.get("listingType");
    const isLostFilter = searchParams.get("isLost") === "true";

    // Pagination Params (Defaults: Page 1, 20 items per page)
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 20;
    const skip = (page - 1) * limit;

    const petQuery = {};

    // Apply lost filter
    if (isLostFilter) {
      petQuery.isLost = true;
    } else {
      // Apply standard filters
      if (type) petQuery.type = type;
      if (breed) petQuery.breed = breed;
      if (excludeOwnerId) petQuery.ownerId = { $ne: excludeOwnerId };
      if (listingType) petQuery.listingType = listingType;

      // Apply safety rules
      petQuery.isPregnant = { $ne: true };
      petQuery.verificationStatus = "verified";
      petQuery.isLost = { $ne: true };
      petQuery.adoptionRequests = {
        $not: { $elemMatch: { status: "approved" } },
      };

      // Filter mated females logic
      const matedRequesterIds = await Pet.distinct(
        "matingHistory.requesterPetId",
        { "matingHistory.status": "mated" }
      );

      // We combine existing query with the complex OR logic for mated/gender checks
      petQuery.$and = [
        // Preserve any existing conditions
        { ...petQuery },
        {
          $or: [
            { gender: { $ne: "Female" } },
            {
              $and: [
                { "matingHistory.status": { $ne: "mated" } },
                { _id: { $nin: matedRequesterIds } },
              ],
            },
          ]
        }
      ];

      // Clean up the initial flat properties if they are now wrapped in $and
      // (Optimization: In a simple case we can leave them, but to be safe vs overwrites)
      // Actually, standard practice: keep simple filters top-level, only complex logic in $and or $or.
      // The implementation below merges them effectively.
    }

    // === UPGRADE: Location Filter Optimized ===
    // Filter by city BEFORE querying Pets
    if (city) {
      const usersInCity = await User.find(
        { "location.city": city },
        "firebaseUid"
      ).lean();

      const userUids = usersInCity.map((u) => u.firebaseUid);

      // Add this restriction to the database query
      if (petQuery.ownerId) {
        // If there was already an exclude filter or other owner filter
        petQuery.ownerId = { $in: userUids, ...petQuery.ownerId };
      } else {
        petQuery.ownerId = { $in: userUids };
      }
    }

    // === UPGRADE: Pagination & Lean ===
    let pets = await Pet.find(petQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Attach location data (Still required as location is on User model)
    const petsWithLocation = await Promise.all(
      pets.map(async (pet) => {
        // Note: For high scale, consider denormalizing city into Pet model
        const owner = await User.findOne(
          { firebaseUid: pet.ownerId },
          "location"
        ).lean();

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
          isLost: pet.isLost,
          lastSeenDate: pet.lastSeenDate,
          location: owner?.location || null,
        };
      })
    );

    return new Response(JSON.stringify(petsWithLocation), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "X-Total-Count": pets.length.toString(), // Useful for frontend
        "X-Page": page.toString()
      },
    });
  } catch (err) {
    console.error("Error fetching pets:", err);
    return new Response(JSON.stringify({ error: "Failed to fetch pets" }), {
      status: 500,
    });
  }
}
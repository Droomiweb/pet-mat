// app/api/pet/route.js

// Standard imports
import connectDB from "../../lib/mongodb";
import Pet from "../../models/PetModel";
import User from "../../models/User";
import { v2 as cloudinary } from "cloudinary";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

// Service configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// Initialize AI model
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

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

      const result = await model.generateContent([prompt, imagePart]);
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
      certificateBase64,
      certificateMimeType,
      imagesBase64,
      ownerId,
      ownerName,
    } = await req.json();

    // Validate input fields
    if (
      !name || !type || !userProvidedAge || !breed || !gender ||
      !listingType || !certificateBase64 || !imagesBase64 || !ownerId || !ownerName
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
      // 1. Exclude pregnant pets
      petQuery.isPregnant = { $ne: true };
      // 2. Verified pets only
      petQuery.verificationStatus = "verified";
      // 3. Exclude lost pets
      petQuery.isLost = { $ne: true }; 
      // 4. Exclude adopted pets
      petQuery.adoptionRequests = {
        $not: { $elemMatch: { status: "approved" } },
      };

      // Filter mated females
      // Find successfully mated pets
      const matedRequesterIds = await Pet.distinct(
        "matingHistory.requesterPetId",
        { "matingHistory.status": "mated" }
      );
      
      // Exclude mated females
      petQuery.$or = [
        { gender: { $ne: "Female" } },
        {
          $and: [
            { "matingHistory.status": { $ne: "mated" } },
            { _id: { $nin: matedRequesterIds } },
          ],
        },
      ];
    }

    let pets = await Pet.find(petQuery).sort({ createdAt: -1 }).lean();

    // Filter by city
    // Filter based on user location
    if (city) {
      const usersInCity = await User.find(
        { "location.city": city },
        "firebaseUid"
      ).lean();
      const userUids = usersInCity.map((u) => u.firebaseUid);
      // Filter memory results
      pets = pets.filter((pet) => userUids.includes(pet.ownerId));
    }

    // Attach location data
    const petsWithLocation = await Promise.all(
      pets.map(async (pet) => {
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
          location: owner?.location || null, // Attach owner location
        };
      })
    );

    return new Response(JSON.stringify(petsWithLocation), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error fetching pets:", err);
    return new Response(JSON.stringify({ error: "Failed to fetch pets" }), {
      status: 500,
    });
  }
}
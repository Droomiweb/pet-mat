// app/api/pet/route.js

// 1. IMPORTS
import connectDB from "../../lib/mongodb";
import Pet from "../../models/PetModel";
import User from "../../models/User";
import { v2 as cloudinary } from "cloudinary";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

// 2. CONFIGURATION
// Setup Cloudinary for image storage and Gemini for AI analysis
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// We use 'flash' model for speed and cost-efficiency
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// =====================
// 3. HELPERS
// =====================

// Converts Base64 string to a format Gemini API accepts
const fileToGenerativePart = (base64, mimeType) => {
  const base64Data = base64.split(",")[1] || base64;
  return {
    inlineData: {
      data: base64Data,
      mimeType: mimeType || "image/jpeg",
    },
  };
};

// Calculates precise age (e.g., 2.5 years) from a DD/MM/YYYY string
const calculateAgeInYears = (dobString) => {
  if (!dobString || dobString.toUpperCase() === "N/A") return null;
  const parts = dobString.split("/");
  if (parts.length !== 3) return null;

  const dob = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
  const now = new Date();

  if (isNaN(dob.getTime()) || dob > now) return null;

  // Calculate difference in months to get decimal age
  const totalMonths =
    (now.getFullYear() - dob.getFullYear()) * 12 +
    (now.getMonth() - dob.getMonth()) +
    (now.getDate() < dob.getDate() ? -1 : 0);

  return Math.round((totalMonths / 12) * 10) / 10;
};

// Parses "DD/MM/YYYY" into a standardized UTC Date object for MongoDB
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
// 4. CORE AI LOGIC
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

  // Retry Loop: AI requests can occasionally fail or timeout. 
  // We try 3 times before giving up.
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

      // Clean Markdown formatting (```json) often added by LLMs
      const cleanedText = responseText
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

      aiResult = JSON.parse(cleanedText);
      break; // Success! Exit loop.
    } catch (err) {
      console.error(
        `Gemini Analysis Attempt ${i + 1} failed:`,
        err.message || err
      );
      if (i < MAX_RETRIES - 1) {
        // Exponential backoff: wait 2s, 4s, etc.
        const delay = (i + 1) * 2000;
        console.log(`Retrying in ${delay / 1000} seconds...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  // Handle Total AI Failure
  if (!aiResult) {
    return {
      aiResult: null,
      ownerNameMatch: false,
      error: "AI analysis failed after all retries.",
    };
  }

  // NAME VERIFICATION LOGIC
  // We perform a permissive check. "Smith" matches "Mr. Smith".
  const extractedOwnerName = aiResult.extractedData?.ownerName?.toLowerCase() || "";
  const expectedOwnerName = ownerName.toLowerCase();

  const isSubstringMatch =
    extractedOwnerName.includes(expectedOwnerName) ||
    expectedOwnerName.includes(extractedOwnerName);

  // Sanity check: ensure names aren't too short (e.g., "Bo") to avoid false positives
  const isSane =
    extractedOwnerName.length >= 3 || expectedOwnerName.length >= 3;
  ownerNameMatch = isSubstringMatch && isSane;

  // Determine Verification Status
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
// 5. POST: CREATE PET
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

    // Basic Validation
    if (
      !name || !type || !userProvidedAge || !breed || !gender ||
      !listingType || !certificateBase64 || !imagesBase64 || !ownerId || !ownerName
    ) {
      return new Response(
        JSON.stringify({ error: "All fields are required" }),
        { status: 400 }
      );
    }

    // A. Upload Certificate to Cloudinary (Private Folder)
    const certUpload = await cloudinary.uploader.upload(certificateBase64, {
      folder: `certificates/${ownerId}`,
      resource_type: "auto",
    });

    // B. Upload Pet Photo to Cloudinary (Public Folder)
    const imageUrls = [];
    if (imagesBase64.length > 0) {
      const upload = await cloudinary.uploader.upload(imagesBase64[0], {
        folder: `pets/${ownerId}`,
      });
      imageUrls.push(upload.secure_url);
    }

    // C. Execute AI Analysis
    const analysisResult = await runCertificateAnalysis({
      name,
      breed,
      age: userProvidedAge,
      certificateBase64,
      certificateMimeType,
      ownerName,
    });

    // Fallback: If AI crashed, save the pet anyway but flag it for human review.
    // We don't want to lose the user's data just because the AI had a hiccup.
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
        sireName: null, // Lineage unknown due to AI failure
        damName: null,
        verificationStatus: "needs-review", // Flag for admin
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

    // D. Process AI Success Data
    const aiData = analysisResult.aiResult;
    let finalAge = parseInt(userProvidedAge, 10);

    // Age Logic: Trust the Certificate's DOB over the user's manual input
    if (
      aiData?.extractedData?.extractedDOB &&
      aiData.extractedData.extractedDOB.toUpperCase() !== "N/A"
    ) {
      const calculatedAge = calculateAgeInYears(aiData.extractedData.extractedDOB);
      if (calculatedAge !== null) {
        finalAge = calculatedAge;
      }
    } else if (aiData?.extractedData?.extractedAge) {
      // Try to parse "2 years" -> 2
      const ageMatch = aiData.extractedData.extractedAge.match(/(\d+)/);
      if (ageMatch) {
        finalAge = parseInt(ageMatch[1], 10);
      }
    }

    // E. Construct Final Pet Object
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

      // Lineage (Sire/Dam) extraction
      sireName: aiData?.extractedData?.sireName !== "N/A" ? aiData.extractedData.sireName : null,
      damName: aiData?.extractedData?.damName !== "N/A" ? aiData.extractedData.damName : null,

      verificationStatus: aiData?.finalStatus || "needs-review",

      // Store the full analysis for future reference/debugging
      certificateAnalysis: {
        certificateUrl: certUpload.secure_url,
        extractedOwnerName: aiData?.extractedData?.ownerName || null,
        extractedPetName: aiData?.extractedData?.petName || null,
        aiOcrText: aiData?.extractedData?.aiOcrText || (aiData?.extractedData ? JSON.stringify(aiData.extractedData) : null),
        ownerNameMatch: analysisResult.ownerNameMatch,
        status: aiData?.finalStatus || "ai-error",
        reason: aiData?.reason || analysisResult.error,
      },

      // Parse Vaccinations
      vaccinationHistory: (aiData?.vaccinationRecords || [])
        .map((vax) => {
          const vaxDate = parseDateToUTC(vax.vaccinationDate);
          const expiryDate = parseDateToUTC(vax.expiryDate);

          // Auto-calculate status based on dates
          let status = "active";
          if (!expiryDate || isNaN(expiryDate.getTime())) {
            status = "needs-review";
          } else if (expiryDate < new Date()) {
            status = "expired";
          } else if (
            expiryDate < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          ) {
            status = "upcoming"; // Expiring in < 30 days
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
// 6. GET: FETCH PETS
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

    // LOGIC: Lost Filter overrides everything else
    if (isLostFilter) {
      petQuery.isLost = true;
    } else {
      // Standard Filters
      if (type) petQuery.type = type;
      if (breed) petQuery.breed = breed;
      if (excludeOwnerId) petQuery.ownerId = { $ne: excludeOwnerId };
      if (listingType) petQuery.listingType = listingType;

      // SAFETY RULES:
      // 1. Never show pregnant pets in mating lists
      petQuery.isPregnant = { $ne: true };
      // 2. Only show verified pets
      petQuery.verificationStatus = "verified";
      // 3. Don't show lost pets in the normal feed (they have their own section)
      petQuery.isLost = { $ne: true }; 
      // 4. Hide pets that have an approved adoption (they are effectively "sold")
      petQuery.adoptionRequests = {
        $not: { $elemMatch: { status: "approved" } },
      };

      // 5. Hide Females that have already mated successfully
      // We find all pets who are the "Requester" in a 'mated' transaction
      const matedRequesterIds = await Pet.distinct(
        "matingHistory.requesterPetId",
        { "matingHistory.status": "mated" }
      );
      
      // Complex Query: Either NOT female OR (if female, not mated AND not in that list)
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

    // LOCATION FILTERING
    // Since 'location' is on the User model, we must fetch relevant Users first.
    if (city) {
      const usersInCity = await User.find(
        { "location.city": city },
        "firebaseUid"
      ).lean();
      const userUids = usersInCity.map((u) => u.firebaseUid);
      // Filter the pets array in memory based on owner IDs
      pets = pets.filter((pet) => userUids.includes(pet.ownerId));
    }

    // Attach Location Data to Response
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
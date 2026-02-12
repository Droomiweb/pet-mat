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
import { classifyImage } from "../../lib/huggingface"; // Import Visual Fallback
import { runCertificateAnalysis } from "../../lib/verification";


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
// Logic moved to app/lib/verification.js

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

    // Handle AI error with Visual Fallback
    if (analysisResult.error) {
      console.warn("Certificate AI Failed, attempting Visual Fallback...", analysisResult.error);

      let visualStatus = "needs-review";
      let visualReason = `Certificate Analysis Failed: ${analysisResult.error}`;

      // FALLBACK: Use Hugging Face Vision on the pet photo
      if (imagesBase64.length > 0) {
          try {
              // Extract base64 content
              const imageB64 = imagesBase64[0].includes(",") ? imagesBase64[0].split(",")[1] : imagesBase64[0];
              const visionResult = await classifyImage(imageB64);
              console.log("Visual Fallback Result:", visionResult);

              // Verify Type Match (Case Insensitive)
              if (visionResult.type && visionResult.type.toLowerCase() === type.toLowerCase()) {
                  visualStatus = "verified";
                  // Update reason to reflect success
                  visualReason = `Visual Verified: Detected valid ${visionResult.type} (${visionResult.breed}) matching listing.`;
              } else {
                  visualReason += ` | Visual Mismatch: Saw ${visionResult.type} vs ${type}.`;
              }
          } catch (visErr) {
              console.error("Visual Fallback Error:", visErr);
              visualReason += " | Visual Check Failed.";
          }
      }

      const petCreationData = {
        name,
        type,
        age: parseInt(userProvidedAge, 10),
        breed,
        gender,
        listingType,
        // Generate Slug: "Pro" + Unique Suffix
        slug: `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}`,
        certificateUrl: certUpload.secure_url,
        imageUrls,
        ownerId,
        sireName: null, // Unknown lineage
        damName: null,
        verificationStatus: visualStatus, // Use the fallback status
        certificateAnalysis: {
          certificateUrl: certUpload.secure_url,
          status: "fallback-check",
          reason: visualReason,
        },
        vaccinationHistory: [],
      };

      const newPet = new Pet(petCreationData);
      await newPet.save();
      
      // Trigger matching even if verification is pending/fallback
      await integrateNewPetIntoMatches(newPet);

      return new Response(
        JSON.stringify({
          message: visualStatus === 'verified' ? "Pet verified via Image Analysis!" : "Pet added. Pending Admin Review.",
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
      // Generate Slug
      slug: `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}`,
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
      if (listingType) {
          if (listingType === 'Mating') {
              petQuery.listingType = { $in: ['Mating', null, undefined] };
          } else {
              petQuery.listingType = listingType;
          }
      }

      // Apply safety rules
      petQuery.isPregnant = { $ne: true };
      petQuery.verificationStatus = { $in: ['verified', 'fallback-verified'] };
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

    console.log("Explore Pet Query:", JSON.stringify(petQuery)); // DEBUG

    // === UPGRADE: Pagination & Lean ===
    let pets = await Pet.find(petQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    console.log(`Explore found ${pets.length} pets before distance filter.`); // DEBUG

    // Get Current User Location for Distance Calc (if radius provided)
    // We can infer the requester's location from the excludeOwnerId if matches user, or fetch user if auth token used.
    // For simplicity, let's fetch the "excludeOwnerId" user's location if it exists, assuming that's the current user.
    let userLocation = null;
    if (excludeOwnerId) {
        const u = await User.findOne({ firebaseUid: excludeOwnerId }, "location").lean();
        if (u && u.location && u.location.lat && u.location.lng) {
            userLocation = u.location;
        }
    }

    // Radius Filter Prep
    const radiusVal = searchParams.get("radius");
    const maxDistanceKm = radiusVal ? parseInt(radiusVal) : 50;

    // Attach location data & Calculate Distance
    const petsWithLocation = await Promise.all(
      pets.map(async (pet) => {
        // Note: For high scale, consider denormalizing city into Pet model
        const owner = await User.findOne(
          { firebaseUid: pet.ownerId },
          "location"
        ).lean();

        // --- LAZY MIGRATION: Generate Slug if missing ---
        let finalSlug = pet.slug;
        if (!finalSlug) {
           finalSlug = `${pet.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${pet._id.toString().slice(-6)}`;
           // Await update to ensure consistency before user clicks
           await Pet.updateOne({ _id: pet._id }, { $set: { slug: finalSlug } }).catch(console.error);
        }
        // ------------------------------------------------

        let distance = null;
        if (userLocation && owner?.location?.lat && owner?.location?.lng) {
            // Haversine Formula
            const R = 6371; // Radius of the earth in km
            const dLat = (owner.location.lat - userLocation.lat) * (Math.PI / 180);
            const dLon = (owner.location.lng - userLocation.lng) * (Math.PI / 180);
            const a =
                Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(userLocation.lat * (Math.PI / 180)) * Math.cos(owner.location.lat * (Math.PI / 180)) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            distance = R * c; // Distance in km
        }

        return {
          _id: pet._id.toString(),
          slug: finalSlug, // Return SLUG
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
          distance: distance // Return calculated distance
        };
      })
    );

    // Apply Radius Filter in Memory (if distance calculated)
    // Only filter if we actually have distance data.
    const filteredPets = petsWithLocation.filter(p => {
        if (p.distance !== null) {
            return p.distance <= maxDistanceKm;
        }
        return true; // Keep if distance unknown (fallback)
    });

    return new Response(JSON.stringify(filteredPets), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "X-Total-Count": filteredPets.length.toString(), // Update count
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
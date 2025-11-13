// app/api/pet/route.js
import connectDB from "./../../lib/mongodb";
import Pet from "./../../models/PetModel";
import User from "./../../models/User";
import { v2 as cloudinary } from "cloudinary";

// ... (cloudinary.config and POST function remain the same) ...
//
// Add a new pet (No changes needed)
export async function POST(req) {
  // ... (your existing POST logic)
}


// --- 
// V MAJOR UPDATE: GET pets with geospatial filtering V
// ---
export async function GET(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const breed = searchParams.get("breed");
    const listingType = searchParams.get("listingType");
    const excludeOwnerId = searchParams.get("excludeOwnerId"); // Firebase UID

    // NEW: Get radius filter. Default to 50km
    // Radius is expected in kilometers, so we convert to meters for MongoDB
    const radiusInKm = parseFloat(searchParams.get("radius")) || 50;
    const radiusInMeters = radiusInKm * 1000;

    // 1. Find the current user to get their location
    // We *need* an authenticated user to search "near"
    if (!excludeOwnerId) {
      // Fallback for unauthenticated users: just filter, no geo-search
      const petQuery = {};
      if (type) petQuery.type = type;
      if (breed) petQuery.breed = breed;
      if (listingType) petQuery.listingType = listingType;
      
      const pets = await Pet.find(petQuery).limit(20).lean();
      return new Response(JSON.stringify(pets), { status: 200 });
    }

    const currentUser = await User.findOne({ firebaseUid: excludeOwnerId }).lean();
    if (!currentUser || !currentUser.location) {
      return new Response(JSON.stringify({ error: "Current user location not found." }), { status: 404 });
    }

    const userCoordinates = currentUser.location.coordinates; // [lng, lat]

    // 2. Build the aggregation pipeline
    let pipeline = [];

    // Stage 1: Find all USERS near the current user
    pipeline.push({
      $geoNear: {
        near: {
          type: "Point",
          coordinates: userCoordinates
        },
        distanceField: "distance", // Adds a 'distance' field to each doc
        maxDistance: radiusInMeters,
        query: {
          firebaseUid: { $ne: excludeOwnerId } // Exclude the user themselves
        },
        spherical: true
      }
    });

    // Stage 2: Join with the 'pets' collection
    pipeline.push({
      $lookup: {
        from: "pets", // The name of the Pet collection in MongoDB
        localField: "firebaseUid", // Field from User
        foreignField: "ownerId",   // Field from Pet
        as: "pets"
      }
    });

    // Stage 3: Deconstruct the 'pets' array
    pipeline.push({ $unwind: "$pets" });

    // Stage 4: Replace the root with the pet document
    // and add the user's location and distance
    pipeline.push({
      $replaceRoot: {
        newRoot: {
          $mergeObjects: [
            "$pets",
            {
              location: "$location", // Add the owner's location to the pet
              distance: { $divide: ["$distance", 1000] } // Convert meters to km
            }
          ]
        }
      }
    });

    // Stage 5: Match the pet filters
    const matchFilters = {
      isBanned: false, // Don't show banned pets
      verificationStatus: 'verified' // Only show verified pets
    };
    if (listingType) matchFilters.listingType = listingType;
    if (type) matchFilters.type = type;
    if (breed) matchFilters.breed = breed;

    pipeline.push({ $match: matchFilters });

    // Stage 6: Sort by distance (closest first)
    pipeline.push({ $sort: { distance: 1 } });

    // 3. Run the aggregation
    const petsWithLocation = await User.aggregate(pipeline);
    
    // We must manually convert _id as aggregation doesn't do it
    const finalPets = petsWithLocation.map(pet => ({
        ...pet,
        _id: pet._id.toString(),
    }));

    return new Response(JSON.stringify(finalPets), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Error fetching pets:", err);
    return new Response(JSON.stringify({ error: "Failed to fetch pets" }), { status: 500 });
  }
}
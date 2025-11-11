// app/api/pet/route.js
import connectDB from "./../../lib/mongodb";
import Pet from "./../../models/PetModel";
import User from "./../../models/User";
import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Add a new pet
export async function POST(req) {
  try {
    await connectDB();
    // --- UPDATED: Destructure listingType ---
    const { name, type, age, breed, gender, temperament, energyLevel, listingType, certificateBase64, imagesBase64, ownerId } = await req.json();

    // --- UPDATED: Check for listingType ---
    if (!name || !type || !age || !breed || !gender || !temperament || !energyLevel || !listingType || !certificateBase64 || !imagesBase64 || !ownerId) {
      return new Response(JSON.stringify({ error: "All fields are required" }), { status: 400 });
    }
    
    // ... (cloudinary uploads remain the same) ...
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

    const newPet = new Pet({
      name,
      type,
      age,
      breed,
      gender,
      temperament,
      energyLevel,
      listingType, // --- ADDED: Save listingType ---
      certificateUrl: certUpload.secure_url,
      imageUrls,
      ownerId,
    });

    await newPet.save();

    return new Response(JSON.stringify({ message: "Pet added successfully!", petId: newPet._id.toString() }), { status: 201 });
  } catch (err) {
    console.error("Error adding pet:", err);
    return new Response(JSON.stringify({ error: err.message || "Failed to add pet due to server error." }), { status: 500 });
  }
}

// Fetch pets with optional filters
export async function GET(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const breed = searchParams.get("breed");
    const city = searchParams.get("city");
    const excludeOwnerId = searchParams.get("excludeOwnerId");
    
    // --- NEW: Filter for listingType ---
    const listingType = searchParams.get("listingType");

    const petQuery = {};
    if (type) petQuery.type = type;
    if (breed) petQuery.breed = breed;
    if (excludeOwnerId) petQuery.ownerId = { $ne: excludeOwnerId };
    
    // --- ADDED: Add listingType to the query if provided ---
    if (listingType) {
      petQuery.listingType = listingType;
    }

    let pets = await Pet.find(petQuery).lean();

    // Filter by city if provided
    if (city) {
      const usersInCity = await User.find({ "location.city": city }, "firebaseUid").lean();
      const userUids = usersInCity.map(u => u.firebaseUid);
      pets = pets.filter(pet => userUids.includes(pet.ownerId));
    }
    
    const petsWithLocation = await Promise.all(pets.map(async (pet) => {
        const owner = await User.findOne({ firebaseUid: pet.ownerId }, 'location').lean();
        return {
            _id: pet._id.toString(),
            name: pet.name,
            type: pet.type,
            age: pet.age,
            breed: pet.breed,
            gender: pet.gender,
            temperament: pet.temperament,
            energyLevel: pet.energyLevel,
            listingType: pet.listingType, // --- ADDED: Return listingType ---
            imageUrls: pet.imageUrls || [],
            certificateUrl: pet.certificateUrl || null,
            ownerId: pet.ownerId,
            location: owner?.location || null, 
        };
    }));


    return new Response(JSON.stringify(petsWithLocation), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error fetching pets:", err);
    return new Response(JSON.stringify({ error: "Failed to fetch pets" }), { status: 500 });
  }
}
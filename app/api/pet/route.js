import connectDB from "./../../lib/mongodb";
import Pet from "./../../models/PetModel";
import User from "./../../models/User";
import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary (remains the same)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Add a new pet
export async function POST(req) {
  try {
    await connectDB();
    // UPDATED: Destructure gender
    const { name, type, age, breed, gender, certificateBase64, imagesBase64, ownerId } = await req.json();

    // UPDATED: Check for gender
    if (!name || !type || !age || !breed || !gender || !certificateBase64 || !imagesBase64 || !ownerId) {
      return new Response(JSON.stringify({ error: "All fields are required" }), { status: 400 });
    }
    
    // Upload certificate
    const certUpload = await cloudinary.uploader.upload(certificateBase64, {
      folder: `certificates/${ownerId}`,
    });

    // Upload pet images
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
      gender, // ADDED: Save gender
      certificateUrl: certUpload.secure_url,
      imageUrls,
      ownerId,
    });

    await newPet.save();

    return new Response(JSON.stringify({ message: "Pet added successfully!", petId: newPet._id.toString() }), { status: 201 });
  } catch (err) {
    console.error("Error adding pet:", err);
    // FIX: Ensure a valid JSON error response is always returned on failure (HTTP 500)
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
    // ADDED: Parameter to exclude user's own pets
    const excludeOwnerId = searchParams.get("excludeOwnerId"); 

    const petQuery = {};
    if (type) petQuery.type = type;
    if (breed) petQuery.breed = breed;
    // ADDED: Exclusion query
    if (excludeOwnerId) petQuery.ownerId = { $ne: excludeOwnerId }; 

    let pets = await Pet.find(petQuery).lean();

    // Filter by city if provided
    if (city) {
      // ... (city filtering logic remains the same)
      const usersInCity = await User.find({ "location.city": city }, "firebaseUid").lean(); // Changed _id to firebaseUid for consistency
      const userUids = usersInCity.map(u => u.firebaseUid); // Use firebaseUid to match PetModel ownerId
      pets = pets.filter(pet => userUids.includes(pet.ownerId));
    }
    
    // FETCH LOCATION FOR EACH PET (required for suggestions in Home/page.js)
    const petsWithLocation = await Promise.all(pets.map(async (pet) => {
        const owner = await User.findOne({ firebaseUid: pet.ownerId }, 'location').lean();
        return {
            _id: pet._id.toString(),
            name: pet.name,
            type: pet.type,
            age: pet.age,
            breed: pet.breed,
            gender: pet.gender, // ADDED: Include gender
            imageUrls: pet.imageUrls || [],
            certificateUrl: pet.certificateUrl || null,
            ownerId: pet.ownerId,
            location: owner?.location || null, // Include owner's location
        };
    }));


    return new Response(JSON.stringify(petsWithLocation), { // Return updated list
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error fetching pets:", err);
    return new Response(JSON.stringify({ error: "Failed to fetch pets" }), { status: 500 });
  }
}

// ... (remaining code)
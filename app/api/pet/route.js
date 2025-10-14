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
    const { name, type, age, breed, certificateBase64, imagesBase64, ownerId } = await req.json();

    if (!name || !type || !age || !breed || !certificateBase64 || !imagesBase64 || imagesBase64.length === 0 || !ownerId) {
      console.error("Missing required fields in POST request:", { name, type, age, breed, certificateBase64, imagesBase64, ownerId });
      return new Response(JSON.stringify({ error: "All fields are required, including at least one image." }), { status: 400 });
    }

    // Upload certificate
    const certUpload = await cloudinary.uploader.upload(certificateBase64, {
      folder: `certificates/${ownerId}`,
    });

    // Upload pet images
    const imageUrls = [];
    for (const base64 of imagesBase64) {
      try {
        const upload = await cloudinary.uploader.upload(base64, {
          folder: `pets/${ownerId}`,
        });
        imageUrls.push(upload.secure_url);
      } catch (uploadError) {
        console.error("Cloudinary upload failed for an image:", uploadError);
        // Continue with other images even if one fails
      }
    }

    if (imageUrls.length === 0) {
      console.error("No images were successfully uploaded to Cloudinary.");
      // You can decide to fail here or proceed without images
      return new Response(JSON.stringify({ error: "Failed to upload any images." }), { status: 500 });
    }

    const newPet = new Pet({
      name,
      type,
      age,
      breed,
      certificateUrl: certUpload.secure_url,
      imageUrls,
      ownerId,
      verificationStatus: 'pending'
    });

    await newPet.save();

    return new Response(JSON.stringify({ message: "Pet added successfully!", pet: newPet }), { status: 201 });
  } catch (err) {
    console.error("Error adding pet:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

// ... the rest of the file (GET function) remains the same
// Fetch pets with optional filters
export async function GET(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const breed = searchParams.get("breed");
    const city = searchParams.get("city");

    const petQuery = {};
    if (type) petQuery.type = type;
    if (breed) petQuery.breed = breed;

    let pets = await Pet.find(petQuery).lean();

    // Filter by city if provided
    if (city) {
      const usersInCity = await User.find({ "location.city": city }, "_id").lean();
      const userIds = usersInCity.map(u => u._id.toString());
      pets = pets.filter(pet => userIds.includes(pet.ownerId));
    }

    const formattedPets = pets.map((pet) => ({
      _id: pet._id.toString(),
      name: pet.name,
      type: pet.type,
      age: pet.age,
      breed: pet.breed,
      imageUrls: pet.imageUrls || [],
      certificateUrl: pet.certificateUrl || null,
      ownerId: pet.ownerId,
    }));

    return new Response(JSON.stringify(formattedPets), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error fetching pets:", err);
    return new Response(JSON.stringify({ error: "Failed to fetch pets" }), { status: 500 });
  }
}

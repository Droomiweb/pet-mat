import connectDB from "../../lib/mongodb"; // default import
import Pet from "../../models/PetModel";
import cloudinary from "../../lib/cloudinary"; // optional if you use it

// Add a new pet
export async function POST(req) {
  try {
    await connectDB();
    const { name, age, breed, certificateBase64, imagesBase64, ownerId } = await req.json();

    if (!name || !age || !breed || !certificateBase64 || !imagesBase64 || !ownerId) {
      return new Response(JSON.stringify({ error: "All fields are required" }), { status: 400 });
    }

    // Upload certificate to Cloudinary
    const certUpload = await cloudinary.uploader.upload(certificateBase64, {
      folder: `certificates/${ownerId}`,
    });

    // Upload pet images to Cloudinary
    const imageUrls = [];
    for (let base64 of imagesBase64) {
      const upload = await cloudinary.uploader.upload(base64, {
        folder: `pets/${ownerId}`,
      });
      imageUrls.push(upload.secure_url);
    }

    const newPet = new Pet({
      name,
      age,
      breed,
      certificateUrl: certUpload.secure_url,
      imageUrls,
      ownerId,
    });

    await newPet.save();

    return new Response(JSON.stringify({ message: "Pet added successfully!" }), { status: 201 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

// Fetch all pets (for homepage)
export async function GET(req) {
  try {
    await connectDB();

    const pets = await Pet.find().lean();

    const formattedPets = pets.map((pet) => ({
      _id: pet._id.toString(),
      name: pet.name,
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
    return new Response(JSON.stringify({ error: "Failed to fetch pets" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

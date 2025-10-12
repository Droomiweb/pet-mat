import connectDB from "../../lib/mongodb";
import Pet from "../../models/PetModel";
import User from "../../models/User"; // make sure you have a User model

// Add a new pet
export async function POST(req) {
  try {
    await connectDB();
    const { name, type, age, breed, certificateBase64, imagesBase64, ownerId } = await req.json();

    if (!name || !type || !age || !breed || !certificateBase64 || !imagesBase64 || !ownerId) {
      return new Response(JSON.stringify({ error: "All fields are required" }), { status: 400 });
    }

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
      certificateUrl: certUpload.secure_url,
      imageUrls,
      ownerId,
    });

    await newPet.save();

    return new Response(JSON.stringify({ message: "Pet added successfully!" }), { status: 201 });
  } catch (err) {
    console.error("Error adding pet:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
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

    // Build query for type and breed
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

    const formattedPets = pets.map(pet => ({
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

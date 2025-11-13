// app/api/pet/user/[uid]/route.js
import connectDB from "./../../../../lib/mongodb";
import Pet from "./../../../../models/PetModel";

export async function GET(req, context) {
  try {
    await connectDB();

    const { uid } = await context.params;

    const pets = await Pet.find({ ownerId: uid }).lean();

    // We must map all fields, not just a few
    const formattedPets = pets.map((pet) => ({
      _id: pet._id.toString(),
      name: pet.name,
      age: pet.age,
      breed: pet.breed,
      
      // --- V V V THIS IS THE FIX V V V ---
      // Add all the missing fields so the filter can work
      type: pet.type,
      gender: pet.gender,
      listingType: pet.listingType,
      temperament: pet.temperament,
      energyLevel: pet.energyLevel,
      // --- ^ ^ ^ END OF FIX ^ ^ ^ ---

      imageUrls: pet.imageUrls || [],
      certificateUrl: pet.certificateUrl || null,
      messages: pet.messages || [],
      matingHistory: pet.matingHistory || [],
    }));

    return new Response(JSON.stringify(formattedPets), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error in GET /api/pet/user/[uid]:", err);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
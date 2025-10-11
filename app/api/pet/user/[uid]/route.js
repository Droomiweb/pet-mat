import connectDB from "./../../../../lib/mongodb";
import Pet from "./../../../../models/PetModel";

export async function GET(req, context) {
  try {
    await connectDB();

    // ✅ Must await context.params in Next.js 15+
    const { uid } = await context.params;

    // ✅ Match correct field name in DB
    const pets = await Pet.find({ ownerId: uid }).lean();

    const formattedPets = pets.map((pet) => ({
      _id: pet._id.toString(),
      name: pet.name,
      age: pet.age,
      breed: pet.breed,
      imageUrls: pet.imageUrls || [],
      certificateUrl: pet.certificateUrl || null,
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

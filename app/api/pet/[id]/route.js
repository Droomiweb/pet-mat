import connectDB from "./../../../lib/mongodb";
import Pet from "./../../../models/PetModel";

// GET a single pet by ID
export async function GET(req, context) {
  try {
    await connectDB();

    const { id } = context.params;
    const pet = await Pet.findById(id).lean();

    if (!pet) {
      return new Response(JSON.stringify({ error: "Pet not found" }), { status: 404 });
    }

    return new Response(
      JSON.stringify({
        _id: pet._id.toString(),
        name: pet.name,
        type: pet.type, // ✅ Added pet type
        age: pet.age,
        breed: pet.breed,
        imageUrls: pet.imageUrls || [],
        certificateUrl: pet.certificateUrl || null,
        ownerId: pet.ownerId,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Error fetching pet:", err);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }
}

// DELETE a pet by ID
export async function DELETE(req, context) {
  try {
    await connectDB();

    const { id } = context.params;
    const deleted = await Pet.findByIdAndDelete(id);

    if (!deleted) {
      return new Response(
        JSON.stringify({ error: "Pet not found" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ message: "Pet deleted successfully" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Error deleting pet:", err);
    return new Response(
      JSON.stringify({ error: "Internal Server Error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

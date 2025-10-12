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
        type: pet.type,
        age: pet.age,
        breed: pet.breed,
        imageUrls: pet.imageUrls || [],
        certificateUrl: pet.certificateUrl || null,
        ownerId: pet.ownerId,
        messages: pet.messages || [],
        matingHistory: pet.matingHistory || [],
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
      return new Response(JSON.stringify({ error: "Pet not found" }), { status: 404 });
    }

    return new Response(JSON.stringify({ message: "Pet deleted successfully" }), { status: 200 });
  } catch (err) {
    console.error("Error deleting pet:", err);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }
}

// PATCH: send mating request or add a message
export async function PATCH(req, context) {
  try {
    await connectDB();
    const { id } = context.params;
    const { action, requesterId, requesterName, messageText } = await req.json();

    const pet = await Pet.findById(id);
    if (!pet) return new Response(JSON.stringify({ error: "Pet not found" }), { status: 404 });

    if (action === "matingRequest") {
      pet.matingHistory.push({ requesterId, requesterName, status: "pending" });
      if (messageText) {
        pet.messages.push({ senderId: requesterId, senderName: requesterName, text: messageText });
      }
      await pet.save();
      return new Response(JSON.stringify({ message: "Mating request sent!" }), { status: 200 });
    }

    if (action === "addMessage") {
      if (!messageText || !requesterId || !requesterName)
        return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400 });

      pet.messages.push({ senderId: requesterId, senderName: requesterName, text: messageText });
      await pet.save();
      return new Response(JSON.stringify({ message: "Message added!" }), { status: 200 });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }
}

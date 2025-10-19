// app/api/pet/[id]/route.js
import connectDB from "../../../lib/mongodb";
import Pet from "../../../models/PetModel";
import cloudinary from "../../../lib/cloudinary";

// GET a single pet by ID
export async function GET(req, context) {
  try {
    await connectDB();
    const { id } = await context.params;
    const pet = await Pet.findById(id).lean();
    if (!pet) return new Response(JSON.stringify({ error: "Pet not found" }), { status: 404 });

    return new Response(JSON.stringify(pet), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (err) {
    console.error("Error fetching pet:", err);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }
}

// PATCH: send mating request or add a message
export async function PATCH(req, context) {
  try {
    await connectDB();
    // ✅ Must await context.params in Next.js 15
    const { id } = await context.params;
    const { action, requesterId, requesterName, messageText } = await req.json();

    const pet = await Pet.findById(id);
    if (!pet) return new Response(JSON.stringify({ error: "Pet not found" }), { status: 404 });

    if (!pet.matingHistory) pet.matingHistory = [];
    if (!pet.messages) pet.messages = [];

    if (action === "matingRequest") {
      pet.matingHistory.push({ requesterId, requesterName, status: "pending", requestedAt: new Date() });
      if (messageText) {
        pet.messages.push({ senderId: requesterId, senderName: requesterName, text: messageText, sentAt: new Date() });
      }
      await pet.save();
      return new Response(JSON.stringify({ message: "Mating request sent!" }), { status: 200 });
    }

    if (action === "addMessage") {
      if (!messageText || !requesterId || !requesterName)
        return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400 });

      pet.messages.push({ senderId: requesterId, senderName: requesterName, text: messageText, sentAt: new Date() });
      await pet.save();
      return new Response(JSON.stringify({ message: "Message added!" }), { status: 200 });
    }
    // app/api/pet/[id]/route.js (Excerpt from PATCH)
// ...
    if (action === "addMessage") {
      if (!messageText || !requesterId || !requesterName)
        return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400 });

      pet.messages.push({ senderId: requesterId, senderName: requesterName, text: messageText, sentAt: new Date() });
      await pet.save();
      return new Response(JSON.stringify({ message: "Message added!" }), { status: 200 });
    }
// ...

    return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }
}

// DELETE a pet by ID
export async function DELETE(req, context) {
  try {
    await connectDB();
    const { id } = await context.params;
    const deleted = await Pet.findByIdAndDelete(id);

    if (!deleted) {
      return new Response(JSON.stringify({ error: "Pet not found" }), { status: 404 });
    }

    // Delete images and certificate from Cloudinary
    if (deleted.imageUrls?.length > 0) {
      for (const imageUrl of deleted.imageUrls) {
        const publicId = `pets/${deleted.ownerId}/${imageUrl.split('/').pop().split('.')[0]}`;
        await cloudinary.uploader.destroy(publicId);
      }
    }
    if (deleted.certificateUrl) {
      const publicId = `certificates/${deleted.ownerId}/${deleted.certificateUrl.split('/').pop().split('.')[0]}`;
      await cloudinary.uploader.destroy(publicId);
    }

    return new Response(JSON.stringify({ message: "Pet deleted successfully" }), { status: 200 });
  } catch (err) {
    console.error("Error deleting pet:", err);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }
}
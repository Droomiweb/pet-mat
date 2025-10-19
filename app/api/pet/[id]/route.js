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
    const { id } = await context.params;
    // UPDATED: Destructure new fields
    const { action, requesterId, requesterName, requesterPetId, requesterPetName, messageText } = await req.json();

    if (!requesterId || !requesterName) {
        return new Response(JSON.stringify({ error: "Authentication data missing. Please try logging in again." }), { status: 401 });
    }
    
    const petExists = await Pet.findById(id).select('_id');
    if (!petExists) return new Response(JSON.stringify({ error: "Pet not found" }), { status: 404 });

    const newMessage = { senderId: requesterId, senderName: requesterName, text: messageText, sentAt: new Date() };

    if (action === "matingRequest") {
      // NEW CHECK: Require the requester pet info
      if (!requesterPetId || !requesterPetName) {
         return new Response(JSON.stringify({ error: "Requester pet details are required." }), { status: 400 });
      }

      const updatePayload = {
        $push: {
          matingHistory: { 
            requesterId, 
            requesterName, 
            requesterPetId,     // STORE THIS
            requesterPetName,   // STORE THIS
            status: "pending", 
            requestedAt: new Date() 
          }
        }
      };
      // If a message is included with the request, push it as well
      if (messageText) {
        updatePayload.$push.messages = newMessage;
      }

      const updatedPet = await Pet.findByIdAndUpdate(
        id, 
        updatePayload,
        { new: true, runValidators: false } // Avoid full document validation
      );

      if (!updatedPet) return new Response(JSON.stringify({ error: "Pet not found during update" }), { status: 404 });

      return new Response(JSON.stringify({ message: "Mating request sent!" }), { status: 200 });
    }

    if (action === "addMessage") {
      if (!messageText)
        return new Response(JSON.stringify({ error: "Message text is required" }), { status: 400 });

      const updatedPet = await Pet.findByIdAndUpdate(
        id,
        { $push: { messages: newMessage } },
        { new: true, runValidators: false } // Avoid full document validation
      );
      
      if (!updatedPet) return new Response(JSON.stringify({ error: "Pet not found during message add" }), { status: 404 });

      return new Response(JSON.stringify({ message: "Message added!" }), { status: 200 });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400 });
  } catch (err) {
    console.error("Error in PATCH /api/pet/[id]:", err);
    // Return a 500 error response with a generic message
    return new Response(JSON.stringify({ error: "Internal Server Error during update" }), { status: 500 });
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
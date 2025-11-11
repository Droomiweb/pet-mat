// app/api/pet/[id]/route.js
import connectDB from "../../../lib/mongodb";
import Pet from "../../../models/PetModel";
import cloudinary from "../../../lib/cloudinary";

// GET a single pet by ID (remains the same)
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

// PATCH: send mating request, add a message, OR UPDATE REQUEST STATUS
export async function PATCH(req, context) {
  try {
    await connectDB();
    const { id } = await context.params;
    // UPDATED: Destructure new fields for status update
    const { 
      action, 
      requesterId, 
      requesterName, 
      requesterPetId, 
      requesterPetName, 
      messageText,
      // --- NEW FIELDS FOR STATUS UPDATE ---
      requestId, 
      newStatus 
      // --- END NEW FIELDS ---
    } = await req.json();

    if (!requesterId || !requesterName) {
        return new Response(JSON.stringify({ error: "Authentication data missing. Please try logging in again." }), { status: 401 });
    }
    
    const pet = await Pet.findById(id);
    if (!pet) return new Response(JSON.stringify({ error: "Pet not found" }), { status: 404 });

    // --- MATING REQUEST ACTION ---
    if (action === "matingRequest") {
      if (!requesterPetId || !requesterPetName) {
         return new Response(JSON.stringify({ error: "Requester pet details are required." }), { status: 400 });
      }

      const newMatingRequest = { 
        requesterId, 
        requesterName, 
        requesterPetId,
        requesterPetName,
        status: "pending", 
        requestedAt: new Date() 
      };
      
      pet.matingHistory.push(newMatingRequest);

      if (messageText) {
        pet.messages.push({ senderId: requesterId, senderName: requesterName, text: messageText, sentAt: new Date() });
      }
      
      await pet.save();
      return new Response(JSON.stringify({ message: "Mating request sent!" }), { status: 200 });
    }

    // --- ADD MESSAGE ACTION ---
    if (action === "addMessage") {
      if (!messageText)
        return new Response(JSON.stringify({ error: "Message text is required" }), { status: 400 });

      pet.messages.push({ senderId: requesterId, senderName: requesterName, text: messageText, sentAt: new Date() });
      await pet.save();
      return new Response(JSON.stringify({ message: "Message added!" }), { status: 200 });
    }
    
    // --- *** NEW: UPDATE REQUEST STATUS ACTION *** ---
    if (action === "updateRequestStatus") {
        if (!requestId || !newStatus || !['accepted', 'rejected'].includes(newStatus)) {
            return new Response(JSON.stringify({ error: "Invalid request ID or status" }), { status: 400 });
        }
        
        // Check if current user is the pet owner
        if (pet.ownerId !== requesterId) {
            return new Response(JSON.stringify({ error: "Only the pet owner can update requests." }), { status: 403 });
        }

        const request = pet.matingHistory.id(requestId);
        if (!request) {
            return new Response(JSON.stringify({ error: "Mating request not found" }), { status: 404 });
        }
        
        request.status = newStatus;
        
        // Add a system message to the chat
        pet.messages.push({
            senderId: "system", // Or use pet.ownerId
            senderName: "System",
            text: `Mating request from ${request.requesterName} for ${request.requesterPetName} has been ${newStatus}.`,
            sentAt: new Date()
        });

        await pet.save();
        return new Response(JSON.stringify({ message: `Request ${newStatus}` }), { status: 200 });
    }
    // --- *** END NEW ACTION *** ---

    return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400 });
  } catch (err) {
    console.error("Error in PATCH /api/pet/[id]:", err);
    return new Response(JSON.stringify({ error: "Internal Server Error during update" }), { status: 500 });
  }
}

// DELETE a pet by ID (remains the same)
export async function DELETE(req, context) {
  // ... (delete logic remains the same) ...
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
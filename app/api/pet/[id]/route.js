// app/api/pet/[id]/route.js
import connectDB from "../../../lib/mongodb";
import Pet from "../../../models/PetModel";
import User from "../../../models/User";
import cloudinary from "../../../lib/cloudinary";
import { db } from "../../../lib/firebase"; // Ensure this imports your initialized Firestore
import { collection, addDoc, serverTimestamp, doc, setDoc } from "firebase/firestore";

// Helper to create stable Conversation ID
const createConversationId = (petId, uid1, uid2) => {
    const sortedUIDs = [uid1, uid2].sort();
    return `${petId}_${sortedUIDs[0]}_${sortedUIDs[1]}`;
};

export async function GET(req, context) {
  try {
    await connectDB();
    const { id } = await context.params;
    const pet = await Pet.findById(id).lean();
    if (!pet) return new Response(JSON.stringify({ error: "Pet not found" }), { status: 404 });

    const owner = await User.findOne({ firebaseUid: pet.ownerId }).select("location").lean();

    const responseData = {
      ...pet,
      ownerLocation: owner ? owner.location : pet.location || null, 
    };

    return new Response(JSON.stringify(responseData), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (err) {
    console.error("Error fetching pet:", err);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }
}

export async function PATCH(req, context) {
  try {
    await connectDB();
    const { id } = await context.params; // ID of the Pet receiving the request
    
    const { 
      action, 
      requesterId, 
      requesterName, 
      requesterPetId, 
      requesterPetName, 
      messageText,
      requestId, 
      newStatus 
    } = await req.json();

    if (!requesterId || !requesterName) {
        return new Response(JSON.stringify({ error: "Authentication data missing." }), { status: 401 });
    }
    
    const pet = await Pet.findById(id);
    if (!pet) return new Response(JSON.stringify({ error: "Pet not found" }), { status: 404 });

    // --- MATING REQUEST ACTION ---
    if (action === "matingRequest") {
      if (!requesterPetId || !requesterPetName) {
         return new Response(JSON.stringify({ error: "Requester pet details are required." }), { status: 400 });
      }

      // 1. Add to MongoDB Mating History
      const newMatingRequest = { 
        requesterId, 
        requesterName, 
        requesterPetId,
        requesterPetName,
        status: "pending", 
        requestedAt: new Date() 
      };
      pet.matingHistory.push(newMatingRequest);

      // 2. If message provided, sync to BOTH MongoDB and Firestore (for real-time chat)
      if (messageText) {
        // A. MongoDB (Backup/Static View)
        pet.messages.push({ 
            senderId: requesterId, 
            senderName: requesterName, 
            text: `REQUEST: ${messageText}`, 
            sentAt: new Date() 
        });

        // B. Firestore (Real-time Chat Visibility) -- THIS FIXES THE MESSAGING ISSUE
        try {
            const conversationId = createConversationId(pet._id.toString(), requesterId, pet.ownerId);
            
            // Add message to subcollection
            await addDoc(collection(db, "conversations", conversationId, "messages"), {
                senderId: requesterId,
                senderName: requesterName,
                text: `Mating Request: ${messageText}`,
                createdAt: serverTimestamp(),
            });

            // Update main conversation doc (so it shows in the list)
            await setDoc(doc(db, "conversations", conversationId), {
                petId: pet._id.toString(),
                participants: [requesterId, pet.ownerId],
                lastMessage: `Mating Request: ${messageText}`,
                updatedAt: serverTimestamp()
            }, { merge: true });

        } catch (fsError) {
            console.error("Error syncing request message to Firestore:", fsError);
            // We don't fail the whole request, just log the error
        }
      }
      
      await pet.save();
      return new Response(JSON.stringify({ message: "Mating request sent and chat started!" }), { status: 200 });
    }

    // --- ADD MESSAGE ACTION ---
    if (action === "addMessage") {
      if (!messageText) return new Response(JSON.stringify({ error: "Message text is required" }), { status: 400 });
      pet.messages.push({ senderId: requesterId, senderName: requesterName, text: messageText, sentAt: new Date() });
      await pet.save();
      return new Response(JSON.stringify({ message: "Message added!" }), { status: 200 });
    }
    
    // --- UPDATE REQUEST STATUS ACTION ---
    if (action === "updateRequestStatus") {
        // ... (This is legacy; prefer /api/pet/requests for status updates)
    }
    
    // --- ADOPTION REQUEST ACTION ---
    if (action === "adoptionRequest") {
      if (!messageText) return new Response(JSON.stringify({ error: "Message required." }), { status: 400 });

      const existingRequest = pet.adoptionRequests.find(
        (req) => req.requesterId === requesterId && req.status === "pending"
      );
      if (existingRequest) return new Response(JSON.stringify({ error: "Request already pending." }), { status: 400 });

      pet.adoptionRequests.push({
        requesterId,
        requesterName,
        message: messageText,
        status: "pending",
        requestedAt: new Date()
      });
      
      // Add system message for adoption too
      pet.messages.push({
        senderId: "system",
        senderName: "System",
        text: `New adoption request from ${requesterName}: "${messageText}"`,
        sentAt: new Date()
      });

      await pet.save();
      return new Response(JSON.stringify({ message: "Adoption request sent!" }), { status: 200 });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400 });
  } catch (err) {
    console.error("Error in PATCH /api/pet/[id]:", err);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }
}

export async function DELETE(req, context) {
    // (Deletion logic remains the same as your existing file)
    try {
        await connectDB();
        const { id } = await context.params;
        const deleted = await Pet.findByIdAndDelete(id);
        if (!deleted) return new Response(JSON.stringify({ error: "Pet not found" }), { status: 404 });
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
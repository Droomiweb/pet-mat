// app/api/pet/[id]/route.js
import connectDB from "../../../lib/mongodb";
import Pet from "../../../models/PetModel";
import User from "../../../models/User"; // <-- Used for fetching phone number
import cloudinary from "../../../lib/cloudinary";
import { db } from "../../../lib/firebase"; 
import { collection, addDoc, serverTimestamp, doc, setDoc } from "firebase/firestore";
import { sendWhatsAppText } from "../../../lib/greenApi"; // <-- WhatsApp function

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

    // --- MATING REQUEST ACTION (Request Sent to Owner / User B) ---
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

      // 2. Sync to MongoDB and Firestore
      if (messageText) {
        // A. MongoDB (Backup/Static View)
        pet.messages.push({ 
            senderId: requesterId, 
            senderName: requesterName, 
            text: `REQUEST: ${messageText}`, 
            sentAt: new Date() 
        });

        // B. Firestore (Real-time Chat Visibility)
        try {
            const conversationId = createConversationId(pet._id.toString(), requesterId, pet.ownerId);
            
            await addDoc(collection(db, "conversations", conversationId, "messages"), {
                senderId: requesterId,
                senderName: requesterName,
                text: `Mating Request: ${messageText}`,
                createdAt: serverTimestamp(),
            });

            await setDoc(doc(db, "conversations", conversationId), {
                petId: pet._id.toString(),
                participants: [requesterId, pet.ownerId],
                lastMessage: `Mating Request: ${messageText}`,
                updatedAt: serverTimestamp()
            }, { merge: true });

        } catch (fsError) {
            console.error("Error syncing request message to Firestore:", fsError);
        }
      }
      
      // --- 3. WHATSAPP NOTIFICATION TO OWNER (USER B) ---
      try {
        const ownerUser = await User.findOne({ firebaseUid: pet.ownerId }).select('phone name').lean();
        if (ownerUser && ownerUser.phone) {
            const petProfileLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/pet/${pet._id}`;
            
            const whatsappMessage = `
                🔔 NEW MATING REQUEST for ${pet.name}!
                
                Your pet ${pet.name} has received a mating request from ${requesterPetName} (Owner: ${requesterName}).
                
                View Request & Manage: ${petProfileLink}
                
                Log in to the PetLink app to chat with the owner!
            `.trim();
            
            const fullPhoneNumber = `91${ownerUser.phone}`;
            await sendWhatsAppText(fullPhoneNumber, whatsappMessage);
            console.log(`[WhatsApp] Sent mating request notification to Owner: ${ownerUser.phone}`);
        }
      } catch (waError) {
          console.error("Error sending WhatsApp notification:", waError);
      }
      // --- END WHATSAPP NOTIFICATION ---

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
    // (Deletion logic remains the same)
    try {
        await connectDB();
        const { id } = await context.params;
        const deleted = await Pet.findByIdAndDelete(id);
        if (!deleted) return new Response(JSON.stringify({ error: "Pet not found" }), { status: 404 });
        if (deleted.imageUrls?.length > 0) {
            // ... (cloudinary deletion logic) ...
        }
        if (deleted.certificateUrl) {
            // ... (cloudinary deletion logic) ...
        }
        return new Response(JSON.stringify({ message: "Pet deleted successfully" }), { status: 200 });
    } catch (err) {
        console.error("Error deleting pet:", err);
        return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
    }
}
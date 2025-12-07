// app/api/pet/[id]/route.js

// 1. IMPORTS
import connectDB from "../../../lib/mongodb";
import Pet from "../../../models/PetModel";
import User from "../../../models/User"; 
import cloudinary from "../../../lib/cloudinary";
// Firebase imports for real-time chat creation
import { db } from "../../../lib/firebase"; 
import { collection, addDoc, serverTimestamp, doc, setDoc } from "firebase/firestore";
// WhatsApp helper
import { sendWhatsAppText } from "../../../lib/greenApi"; 

// 2. HELPER: Conversation ID Generator
// Ensures a unique, consistent ID for any pair of users discussing a specific pet.
// Sorting UIDs prevents duplicate chats (A-B vs B-A).
const createConversationId = (petId, uid1, uid2) => {
    const sortedUIDs = [uid1, uid2].sort();
    return `${petId}_${sortedUIDs[0]}_${sortedUIDs[1]}`;
};

// 3. GET HANDLER (Fetch Single Pet Profile)
export async function GET(req, context) {
  try {
    await connectDB();
    const { id } = await context.params;
    
    // Fetch pet data as a plain object
    const pet = await Pet.findById(id).lean();
    if (!pet) return new Response(JSON.stringify({ error: "Pet not found" }), { status: 404 });

    // Fetch owner's location to display on the map if the pet doesn't have a specific one
    const owner = await User.findOne({ firebaseUid: pet.ownerId }).select("location").lean();

    const responseData = {
      ...pet,
      // Fallback logic: Use pet's location first, then owner's, then null
      ownerLocation: owner ? owner.location : pet.location || null, 
    };

    return new Response(JSON.stringify(responseData), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (err) {
    console.error("Error fetching pet:", err);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }
}

// 4. PATCH HANDLER (Interactions: Requests, Messages, etc.)
export async function PATCH(req, context) {
  try {
    await connectDB();
    const { id } = await context.params;
    
    // Extract everything we might need from the body
    const { 
      action, 
      requesterId, 
      requesterName, 
      requesterPetId, 
      requesterPetName, 
      messageText,
      answers, // For adoption questionnaires
      requestId, 
      newStatus 
    } = await req.json();

    // Basic Authentication Check
    if (!requesterId || !requesterName) {
        return new Response(JSON.stringify({ error: "Authentication data missing." }), { status: 401 });
    }
    
    const pet = await Pet.findById(id);
    if (!pet) return new Response(JSON.stringify({ error: "Pet not found" }), { status: 404 });

    // --- ACTION A: MATING REQUEST ---
    if (action === "matingRequest") {
      if (!requesterPetId || !requesterPetName) {
         return new Response(JSON.stringify({ error: "Requester pet details are required." }), { status: 400 });
      }

      // Add to MongoDB History
      const newMatingRequest = { 
        requesterId, 
        requesterName, 
        requesterPetId, 
        requesterPetName,
        status: "pending", 
        requestedAt: new Date() 
      };
      pet.matingHistory.push(newMatingRequest);

      // Sync to Firestore (Start the chat)
      if (messageText) {
        // Legacy MongoDB Message (Optional backup)
        pet.messages.push({ 
            senderId: requesterId, 
            senderName: requesterName, 
            text: `REQUEST: ${messageText}`, 
            sentAt: new Date() 
        });

        try {
            const conversationId = createConversationId(pet._id.toString(), requesterId, pet.ownerId);
            // 1. Add the initial message
            await addDoc(collection(db, "conversations", conversationId, "messages"), {
                senderId: requesterId,
                senderName: requesterName,
                text: `Mating Request: ${messageText}`,
                createdAt: serverTimestamp(),
            });
            // 2. Create/Update the conversation metadata
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
      
      // WhatsApp Notification
      try {
        const ownerUser = await User.findOne({ firebaseUid: pet.ownerId }).select('phone name').lean();
        if (ownerUser && ownerUser.phone) {
            const petProfileLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/pet/${pet._id}`;
            const whatsappMessage = `🔔 NEW MATING REQUEST for ${pet.name}! Check PetLink to respond. ${petProfileLink}`;
            const fullPhoneNumber = `91${ownerUser.phone}`;
            await sendWhatsAppText(fullPhoneNumber, whatsappMessage);
        }
      } catch (waError) { console.error("Error sending WhatsApp notification:", waError); }

      await pet.save();
      return new Response(JSON.stringify({ message: "Mating request sent!" }), { status: 200 });
    }

    // --- ACTION B: SIMPLE MESSAGE (Legacy) ---
    if (action === "addMessage") {
      if (!messageText) return new Response(JSON.stringify({ error: "Message text is required" }), { status: 400 });
      
      pet.messages.push({ 
        senderId: requesterId, 
        senderName: requesterName, 
        text: messageText, 
        sentAt: new Date() 
      });
      
      await pet.save();
      return new Response(JSON.stringify({ message: "Message added!" }), { status: 200 });
    }

    // --- ACTION C: ADOPTION REQUEST ---
    if (action === "adoptionRequest") {
      if (!messageText) return new Response(JSON.stringify({ error: "Reason for adoption required." }), { status: 400 });

      // Check for duplicates
      const existingRequest = pet.adoptionRequests.find(
        (req) => req.requesterId === requesterId && req.status === "pending"
      );
      if (existingRequest) return new Response(JSON.stringify({ error: "Request already pending." }), { status: 400 });

      // Add to MongoDB
      pet.adoptionRequests.push({
        requesterId,
        requesterName,
        message: messageText, 
        answers: answers || [], // Save questionnaire answers
        status: "pending",
        requestedAt: new Date()
      });
      
      // Add system message to MongoDB log
      pet.messages.push({
        senderId: "system",
        senderName: "System",
        text: `New adoption application from ${requesterName}: "${messageText}"`,
        sentAt: new Date()
      });

      // Initialize Firestore Chat
      try {
        const conversationId = createConversationId(pet._id.toString(), requesterId, pet.ownerId);
        await addDoc(collection(db, "conversations", conversationId, "messages"), {
            senderId: requesterId,
            senderName: requesterName,
            text: `ADOPTION INQUIRY: ${messageText}`,
            createdAt: serverTimestamp(),
        });
        await setDoc(doc(db, "conversations", conversationId), {
            petId: pet._id.toString(),
            participants: [requesterId, pet.ownerId],
            lastMessage: `ADOPTION INQUIRY: ${messageText}`,
            updatedAt: serverTimestamp()
        }, { merge: true });
      } catch (fsError) {
        console.error("Error creating adoption chat:", fsError);
      }

      // Send WhatsApp to Owner
      try {
        const ownerUser = await User.findOne({ firebaseUid: pet.ownerId }).select('phone name').lean();
        if (ownerUser && ownerUser.phone) {
            const chatLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/messages`;
            const whatsappMessage = `🔔 NEW ADOPTION REQUEST for ${pet.name} from ${requesterName}!\n\nReason: "${messageText}"\n\nChat with them here: ${chatLink}`;
            const fullPhoneNumber = `91${ownerUser.phone}`;
            await sendWhatsAppText(fullPhoneNumber, whatsappMessage);
        }
      } catch (waError) { console.error("Error sending WhatsApp adoption notification:", waError); }

      await pet.save();
      return new Response(JSON.stringify({ message: "Adoption application submitted!" }), { status: 200 });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400 });

  } catch (err) {
    console.error("Error in PATCH /api/pet/[id]:", err);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }
}

// 5. DELETE HANDLER (Remove Pet)
export async function DELETE(req, context) {
    try {
        await connectDB();
        const { id } = await context.params;
        
        const deleted = await Pet.findByIdAndDelete(id);
        if (!deleted) return new Response(JSON.stringify({ error: "Pet not found" }), { status: 404 });

        // Note: Ideally, delete images from Cloudinary here too using pet.imageUrls
        
        return new Response(JSON.stringify({ message: "Pet deleted successfully" }), { status: 200 });
    } catch (err) {
        console.error("Error deleting pet:", err);
        return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
    }
}
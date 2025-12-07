// app/api/pet/requests/route.js

// 1. IMPORTS
import connectDB from "../../../lib/mongodb";
import Pet from "../../../models/PetModel";
import User from "../../../models/User"; 
import { db } from "../../../lib/firebase"; 
import { collection, addDoc, serverTimestamp, doc, setDoc } from "firebase/firestore";
import { sendWhatsAppText } from "../../../lib/greenApi"; 

// 2. HELPER: Conversation ID Generator
// Ensures the chat room ID is consistent regardless of who initiates it.
const createConversationId = (petId, uid1, uid2) => {
    const sortedUIDs = [uid1, uid2].sort();
    return `${petId}_${sortedUIDs[0]}_${sortedUIDs[1]}`;
};

// 3. PATCH HANDLER (Manage Requests)
export async function PATCH(req) {
  try {
    await connectDB();
    
    // Parse Payload
    // requestType: 'mating' or 'adoption'
    // newStatus: 'accepted', 'rejected', 'confirmHandover', etc.
    // userId: The person currently performing the action (Owner or Requester)
    const { ownerId, petId, requestId, requestType, newStatus, requesterId, userId } = await req.json();

    if (!petId || !requestType) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
    }

    const pet = await Pet.findById(petId);
    if (!pet) return new Response(JSON.stringify({ error: "Pet not found" }), { status: 404 });

    // ============================================================
    // 1. MATING LOGIC
    // ============================================================
    if (requestType === 'mating') {
      // Security: Only owner can accept/reject mating requests
      if (pet.ownerId !== ownerId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 403 });

      // Find the specific request in the subdocument array
      let request;
      // Try by ID first
      if (requestId && typeof pet.matingHistory.id === 'function') {
        request = pet.matingHistory.id(requestId);
      }
      // Fallback: Search manually by String ID or Requester ID
      if (!request) {
          request = pet.matingHistory.find(r => r._id?.toString() === requestId);
          if (!request && requesterId) {
             request = pet.matingHistory.find(
               r => r.requesterId === requesterId && r.status === 'pending'
             );
          }
      }

      if (!request) return new Response(JSON.stringify({ error: "Mating request not found" }), { status: 404 });
      
      // Update Status
      request.status = newStatus;
      pet.markModified('matingHistory'); 

      // If Accepted -> Trigger Notifications
      if (newStatus === 'accepted') {
          const targetRequesterId = request.requesterId; 
          const conversationId = createConversationId(petId, ownerId, targetRequesterId);
          
          // A. Create Firestore Chat (System Message)
          try {
              await addDoc(collection(db, "conversations", conversationId, "messages"), {
                  senderId: "system",
                  senderName: "PetMate System",
                  text: `✅ Mating Request Accepted!`,
                  createdAt: serverTimestamp(),
              });
              await setDoc(doc(db, "conversations", conversationId), {
                  petId: petId,
                  participants: [ownerId, targetRequesterId],
                  lastMessage: `✅ Mating Request Accepted!`,
                  updatedAt: serverTimestamp()
              }, { merge: true });
          } catch (fsError) {
              console.error("Firestore error:", fsError);
          }

          // B. Send WhatsApp Notification
          try {
            const requesterUser = await User.findOne({ firebaseUid: targetRequesterId }).select('phone name').lean();
            if (requesterUser && requesterUser.phone) {
                const petProfileLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/pet/${pet._id}`;
                const whatsappMessage = `🎉 Mating request for ${pet.name} ACCEPTED! Start chatting now: ${petProfileLink}`;
                await sendWhatsAppText(`91${requesterUser.phone}`, whatsappMessage);
            }
          } catch (waError) {
              console.error("WhatsApp error:", waError);
          }
      }
    
    // ============================================================
    // 2. ADOPTION LOGIC
    // ============================================================
    } else if (requestType === 'adoption') {
      
      // Find the adoption request
      let request;
      if (requestId && typeof pet.adoptionRequests.id === 'function') {
         request = pet.adoptionRequests.id(requestId);
      }
      if (!request) {
         request = pet.adoptionRequests.find(r => r._id?.toString() === requestId);
         // Fallback logic
         if (!request && requesterId) {
            request = pet.adoptionRequests.find(r => r.requesterId === requesterId && (r.status === 'pending' || r.status === 'approved'));
         }
      }
      if (!request) return new Response(JSON.stringify({ error: "Adoption request not found" }), { status: 404 });

      // --- A. STATUS UPDATE (Approve/Reject) ---
      // This is the initial step by the Owner.
      if (newStatus === 'approved' || newStatus === 'rejected') {
          if (pet.ownerId !== ownerId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 403 });
          
          request.status = newStatus;
          
          if (newStatus === 'approved') {
              // Notify Requester that they are approved
              const conversationId = createConversationId(petId, ownerId, request.requesterId);
              try {
                  await addDoc(collection(db, "conversations", conversationId, "messages"), {
                      senderId: "system",
                      senderName: "PetMate System",
                      text: `🎉 Adoption Request Approved! Please confirm "Handover" in your profiles when the physical transfer is done.`,
                      createdAt: serverTimestamp(),
                  });
                  await setDoc(doc(db, "conversations", conversationId), {
                      petId: petId,
                      participants: [ownerId, request.requesterId],
                      lastMessage: `Adoption Approved! Pending Handover.`,
                      updatedAt: serverTimestamp()
                  }, { merge: true });
              } catch (e) {}

              // Send WhatsApp
              try {
                  const requesterUser = await User.findOne({ firebaseUid: request.requesterId }).select('phone name').lean();
                  if (requesterUser && requesterUser.phone) {
                      const chatLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/messages`;
                      const whatsappMessage = `🎉 ADOPTION APPROVED! The owner has accepted your request for ${pet.name}. \n\nPlease coordinate the meetup in the chat: ${chatLink}`;
                      await sendWhatsAppText(`91${requesterUser.phone}`, whatsappMessage);
                  }
              } catch (wa) { console.error(wa); }
          }
      }

      // --- B. HANDOVER CONFIRMATION LOGIC ---
      // This happens AFTER meetup. Both parties must click "Confirm Handover".
      else if (newStatus === 'confirmHandover') {
          if (!userId) return new Response(JSON.stringify({ error: "User ID required for handover" }), { status: 400 });

          // Determine who is clicking and set their flag
          if (userId === pet.ownerId) {
              request.ownerConfirmedHandover = true;
          } else if (userId === request.requesterId) {
              request.requesterConfirmedHandover = true;
          } else {
              return new Response(JSON.stringify({ error: "Unauthorized to confirm handover" }), { status: 403 });
          }

          // IF BOTH have confirmed -> EXECUTE TRANSFER
          if (request.ownerConfirmedHandover && request.requesterConfirmedHandover) {
              
              // 1. Fetch Previous Owner Name (for the certificate generation)
              const previousOwner = await User.findOne({ firebaseUid: pet.ownerId }).select('name').lean();
              const previousOwnerName = previousOwner ? previousOwner.name : "Previous Owner";

              // 2. Create the immutable Adoption Log
              pet.adoptionLog = {
                  previousOwnerId: pet.ownerId,
                  previousOwnerName: previousOwnerName,
                  newOwnerId: request.requesterId,
                  newOwnerName: request.requesterName,
                  adoptionDate: new Date(),
                  certificateId: `CERT-${pet._id.toString().slice(-6)}-${Date.now().toString().slice(-6)}`
              };

              // 3. TRANSFER OWNERSHIP
              pet.ownerId = request.requesterId; // The requester is now the owner
              pet.listingType = 'None'; // Pet is no longer for sale/adoption
              
              // 4. Cleanup: Reject any other pending requests for this pet
              pet.adoptionRequests.forEach(r => {
                  if (r._id.toString() !== request._id.toString() && r.status === 'pending') {
                      r.status = 'rejected';
                  }
              });
              
              // 5. Add system log
              pet.messages.push({
                  senderId: "system",
                  senderName: "System",
                  text: `Adoption Handover Complete. Ownership transferred to ${request.requesterName}.`,
                  sentAt: new Date()
              });
          }
      }

      pet.markModified('adoptionRequests');
      
    } else {
      return new Response(JSON.stringify({ error: "Invalid request type" }), { status: 400 });
    }

    await pet.save();
    return new Response(JSON.stringify({ message: `Request updated`, pet }), { status: 200 });

  } catch (err) {
    console.error("Error updating request status:", err);
    return new Response(JSON.stringify({ error: "Failed to update request", details: err.message }), { status: 500 });
  }
}
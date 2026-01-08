// app/api/pet/requests/route.js

// Standard imports
import connectDB from "../../../lib/mongodb";
import Pet from "../../../models/PetModel";
import User from "../../../models/User"; 
import { db } from "../../../lib/firebase"; 
import { collection, addDoc, serverTimestamp, doc, setDoc } from "firebase/firestore";
import { sendWhatsAppText } from "../../../lib/greenApi"; 

// Generate conversation ID
const createConversationId = (petId, uid1, uid2) => {
    const sortedUIDs = [uid1, uid2].sort();
    return `${petId}_${sortedUIDs[0]}_${sortedUIDs[1]}`;
};

// PATCH request handler
export async function PATCH(req) {
  try {
    await connectDB();
    
    // Parse request data
    const { ownerId, petId, requestId, requestType, newStatus, requesterId, userId } = await req.json();

    if (!petId || !requestType) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
    }

    const pet = await Pet.findById(petId);
    if (!pet) return new Response(JSON.stringify({ error: "Pet not found" }), { status: 404 });

    // Handle mating requests
    if (requestType === 'mating') {
      // Verify ownership
      if (pet.ownerId !== ownerId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 403 });

      // Find specific request
      let request;
      // Try ID lookup
      if (requestId && typeof pet.matingHistory.id === 'function') {
        request = pet.matingHistory.id(requestId);
      }
      // Fallback lookup
      if (!request) {
          request = pet.matingHistory.find(r => r._id?.toString() === requestId);
          if (!request && requesterId) {
             request = pet.matingHistory.find(
               r => r.requesterId === requesterId && r.status === 'pending'
             );
          }
      }

      if (!request) return new Response(JSON.stringify({ error: "Mating request not found" }), { status: 404 });
      
      // Update status for ALL pending requests from this requester (to handle duplicates)
      let requesterIdToUpdate = request ? request.requesterId : requesterId;

      if (requesterIdToUpdate) {
        pet.matingHistory.forEach(r => {
            if (r.requesterId === requesterIdToUpdate && r.status === 'pending') {
                r.status = newStatus;
            }
        });
      } else if (request) {
          // Fallback if we only found one specific request and somehow don't have requesterId (shouldn't happen)
          request.status = newStatus;
      }
      
      pet.markModified('matingHistory'); 

      // Handle acceptance
      if (newStatus === 'accepted') {
          const targetRequesterId = request.requesterId; 
          const conversationId = createConversationId(petId, ownerId, targetRequesterId);
          
          // Update Firestore chat
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

          // Send WhatsApp alert
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
    
    // Handle adoption requests
    } else if (requestType === 'adoption') {
      
      // Find specific request
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

      // Handle status update
      if (newStatus === 'approved' || newStatus === 'rejected') {
          if (pet.ownerId !== ownerId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 403 });
          
          request.status = newStatus;
          
          if (newStatus === 'approved') {
              // Notify via Firestore
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

              // Send WhatsApp alert
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

      // Handle handover confirmation
      else if (newStatus === 'confirmHandover') {
          if (!userId) return new Response(JSON.stringify({ error: "User ID required for handover" }), { status: 400 });

          // Identify confirmant
          if (userId === pet.ownerId) {
              request.ownerConfirmedHandover = true;
          } else if (userId === request.requesterId) {
              request.requesterConfirmedHandover = true;
          } else {
              return new Response(JSON.stringify({ error: "Unauthorized to confirm handover" }), { status: 403 });
          }

          // Check mutual confirmation
          if (request.ownerConfirmedHandover && request.requesterConfirmedHandover) {
              
              // Fetch previous owner
              const previousOwner = await User.findOne({ firebaseUid: pet.ownerId }).select('name').lean();
              const previousOwnerName = previousOwner ? previousOwner.name : "Previous Owner";

              // Create adoption log
              pet.adoptionLog = {
                  previousOwnerId: pet.ownerId,
                  previousOwnerName: previousOwnerName,
                  newOwnerId: request.requesterId,
                  newOwnerName: request.requesterName,
                  adoptionDate: new Date(),
                  certificateId: `CERT-${pet._id.toString().slice(-6)}-${Date.now().toString().slice(-6)}`
              };

              // Transfer ownership
              pet.ownerId = request.requesterId; // New owner
              pet.listingType = 'None'; // Remove listing
              
              // Reject other requests
              pet.adoptionRequests.forEach(r => {
                  if (r._id.toString() !== request._id.toString() && r.status === 'pending') {
                      r.status = 'rejected';
                  }
              });
              
              // Log system message
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

    // Save changes
    await pet.save();
    return new Response(JSON.stringify({ message: `Request updated`, pet }), { status: 200 });

  } catch (err) {
    console.error("Error updating request status:", err);
    return new Response(JSON.stringify({ error: "Failed to update request", details: err.message }), { status: 500 });
  }
}
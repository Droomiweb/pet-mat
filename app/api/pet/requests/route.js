// app/api/pet/requests/route.js
import connectDB from "../../../lib/mongodb";
import Pet from "../../../models/PetModel";
import User from "../../../models/User"; // <-- Import User model
import { db } from "../../../lib/firebase"; 
import { collection, addDoc, serverTimestamp, doc, setDoc } from "firebase/firestore";
import { sendWhatsAppText } from "../../../lib/greenApi"; // <-- WhatsApp function

// Helper to create stable Conversation ID
const createConversationId = (petId, uid1, uid2) => {
    const sortedUIDs = [uid1, uid2].sort();
    return `${petId}_${sortedUIDs[0]}_${sortedUIDs[1]}`;
};

export async function PATCH(req) {
  try {
    await connectDB();
    const { ownerId, petId, requestId, requestType, newStatus, requesterId } = await req.json();

    if (!ownerId || !petId || !requestType || !newStatus) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
    }

    const pet = await Pet.findById(petId); // This is User B's pet
    if (!pet) return new Response(JSON.stringify({ error: "Pet not found" }), { status: 404 });

    if (pet.ownerId !== ownerId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 403 });

    let request;
    
    // --- MATING LOGIC ---
    if (requestType === 'mating') {
      // 1. Try finding by ID first
      if (requestId && typeof pet.matingHistory.id === 'function') {
        request = pet.matingHistory.id(requestId);
      }
      
      // 2. Fallback: Find by Requester ID and 'pending' status
      if (!request) {
          // Try finding by ID manually in array if .id() failed
          request = pet.matingHistory.find(r => r._id?.toString() === requestId);
          
          // If still not found, use requesterId
          if (!request && requesterId) {
             request = pet.matingHistory.find(
               r => r.requesterId === requesterId && r.status === 'pending'
             );
          }
      }

      if (!request) return new Response(JSON.stringify({ error: "Mating request not found" }), { status: 404 });
      
      // UPDATE STATUS
      request.status = newStatus;
      
      // *** CRITICAL FIX: Tell Mongoose the array changed ***
      pet.markModified('matingHistory'); 

      // Send System Message to Chat and WHATSAPP
      if (newStatus === 'accepted') {
          const targetRequesterId = request.requesterId; 
          const conversationId = createConversationId(petId, ownerId, targetRequesterId);
          
          // A. Firestore Message (Real-time)
          try {
              await addDoc(collection(db, "conversations", conversationId, "messages"), {
                  senderId: "system",
                  senderName: "PetMate System",
                  text: `✅ Mating Request Accepted! You can now discuss details here.`,
                  createdAt: serverTimestamp(),
              });

              await setDoc(doc(db, "conversations", conversationId), {
                  petId: petId,
                  participants: [ownerId, targetRequesterId],
                  lastMessage: `✅ Mating Request Accepted!`,
                  updatedAt: serverTimestamp()
              }, { merge: true });
              
          } catch (fsError) {
              console.error("Error sending acceptance msg to Firestore:", fsError);
          }

          // B. WHATSAPP NOTIFICATION TO REQUESTER (USER A)
          try {
            // Fetch the requester's phone number
            const requesterUser = await User.findOne({ firebaseUid: targetRequesterId }).select('phone name').lean();
            if (requesterUser && requesterUser.phone) {
                const petProfileLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/pet/${pet._id}`;
                const whatsappMessage = `
                    🎉 GREAT NEWS! Your mating request for ${pet.name} has been **ACCEPTED** by the owner!
                    
                    Start chatting now to finalize the details.
                    
                    View Pet Profile: ${petProfileLink}
                `.trim();
                
                const fullPhoneNumber = `91${requesterUser.phone}`;
                await sendWhatsAppText(fullPhoneNumber, whatsappMessage);
                console.log(`[WhatsApp] Sent acceptance notification to Requester: ${requesterUser.phone}`);
            }
          } catch (waError) {
              console.error("Error sending WhatsApp acceptance notification:", waError);
          }

      }
      if (newStatus === 'rejected') {
          // You could optionally send a rejection notification here as well
          console.log(`Mating request for ${pet.name} rejected.`);
      }

    // --- ADOPTION LOGIC (UNCHANGED) ---
    } else if (requestType === 'adoption') {
      if (requestId && typeof pet.adoptionRequests.id === 'function') {
         request = pet.adoptionRequests.id(requestId);
      }
      if (!request) {
         request = pet.adoptionRequests.find(r => r._id?.toString() === requestId);
         if (!request && requesterId) {
            request = pet.adoptionRequests.find(
                r => r.requesterId === requesterId && r.status === 'pending'
            );
         }
      }

      if (!request) return new Response(JSON.stringify({ error: "Adoption request not found" }), { status: 404 });
      
      request.status = newStatus;
      
      if (newStatus === 'approved') {
        pet.adoptionRequests.forEach(req => {
          if (req._id?.toString() !== request._id?.toString() && req.status === 'pending') {
              req.status = 'rejected';
          }
        });
        pet.ownerId = request.requesterId;
        pet.listingType = 'Mating';
        pet.adoptionRequests = []; // Clear requests on transfer
      }
      
      // *** CRITICAL FIX: Tell Mongoose the array changed ***
      pet.markModified('adoptionRequests');
      
    } else {
      return new Response(JSON.stringify({ error: "Invalid request type" }), { status: 400 });
    }

    await pet.save();

    return new Response(JSON.stringify({ message: `${requestType} request ${newStatus}`, pet }), { status: 200 });

  } catch (err) {
    console.error("Error updating request status:", err);
    return new Response(JSON.stringify({ error: "Failed to update request", details: err.message }), { status: 500 });
  }
}
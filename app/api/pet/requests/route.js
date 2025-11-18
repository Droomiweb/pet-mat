// app/api/pet/requests/route.js
import connectDB from "../../../lib/mongodb";
import Pet from "../../../models/PetModel";
import { db } from "../../../lib/firebase"; 
import { collection, addDoc, serverTimestamp, doc, setDoc } from "firebase/firestore";

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

    const pet = await Pet.findById(petId);
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

      // Send System Message to Chat upon Acceptance
      if (newStatus === 'accepted') {
          try {
              const targetRequesterId = request.requesterId; 
              const conversationId = createConversationId(petId, ownerId, targetRequesterId);
              
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
      }

    // --- ADOPTION LOGIC ---
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
// app/api/pet/requests/route.js
import connectDB from "../../../lib/mongodb";
import Pet from "../../../models/PetModel";
import { db } from "../../../lib/firebase"; 
import { collection, addDoc, serverTimestamp, doc, setDoc } from "firebase/firestore";

// Helper to create stable Conversation ID (duplicated here for safety)
const createConversationId = (petId, uid1, uid2) => {
    const sortedUIDs = [uid1, uid2].sort();
    return `${petId}_${sortedUIDs[0]}_${sortedUIDs[1]}`;
};

export async function PATCH(req) {
  try {
    await connectDB();
    const { ownerId, petId, requestId, requestType, newStatus } = await req.json();

    if (!ownerId || !petId || !requestId || !requestType || !newStatus) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
    }

    const pet = await Pet.findById(petId);
    if (!pet) return new Response(JSON.stringify({ error: "Pet not found" }), { status: 404 });

    if (pet.ownerId !== ownerId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 403 });

    let request;
    
    // --- ADOPTION LOGIC ---
    if (requestType === 'adoption') {
      request = pet.adoptionRequests.id(requestId);
      if (!request) return new Response(JSON.stringify({ error: "Adoption request not found" }), { status: 404 });
      request.status = newStatus;
      
      if (newStatus === 'approved') {
        pet.adoptionRequests.forEach(req => {
          if (req.id !== requestId && req.status === 'pending') req.status = 'rejected';
        });
        pet.ownerId = request.requesterId;
        pet.listingType = 'Mating';
        pet.adoptionRequests = [];
      }
      
    // --- MATING LOGIC ---
    } else if (requestType === 'mating') {
      request = pet.matingHistory.id(requestId);
      if (!request) return new Response(JSON.stringify({ error: "Mating request not found" }), { status: 404 });
      
      request.status = newStatus;

      // --- FIX: Send System Message to Chat upon Acceptance ---
      if (newStatus === 'accepted') {
          try {
              const conversationId = createConversationId(petId, ownerId, request.requesterId);
              
              // Add system message
              await addDoc(collection(db, "conversations", conversationId, "messages"), {
                  senderId: "system",
                  senderName: "PetMate System",
                  text: `✅ Mating Request Accepted! You can now discuss details here.`,
                  createdAt: serverTimestamp(),
              });

              // Ensure conversation exists/updates
              await setDoc(doc(db, "conversations", conversationId), {
                  petId: petId,
                  participants: [ownerId, request.requesterId],
                  lastMessage: `✅ Mating Request Accepted!`,
                  updatedAt: serverTimestamp()
              }, { merge: true });
              
          } catch (fsError) {
              console.error("Error sending acceptance msg to Firestore:", fsError);
          }
      }

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
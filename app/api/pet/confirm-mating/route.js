// app/api/pet/confirm-mating/route.js

// 1. IMPORTS
import connectDB from "../../../lib/mongodb";
import Pet from "../../../models/PetModel";

// 2. PATCH HANDLER
// This route is called when a user clicks "We Mated!" on the dashboard.
export async function PATCH(req) {
  try {
    await connectDB();
    
    // We need to know WHO is clicking (userId) and WHICH interaction they are confirming.
    const { userId, petId, requestId, requesterId } = await req.json();

    if (!userId || !petId) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
    }
    
    // Find the host pet (usually the one receiving the request)
    const pet = await Pet.findById(petId);
    if (!pet) {
      return new Response(JSON.stringify({ error: "Pet not found" }), { status: 404 });
    }

    // 3. FIND THE REQUEST SUB-DOCUMENT
    let request;
    
    // Strategy A: Direct ID lookup (Most accurate)
    if (requestId) {
        request = pet.matingHistory.id(requestId);
    }
    
    // Strategy B: Fallback Search
    // If we don't have the specific request ID, we look for an active interaction 
    // involving the specific requester.
    if (!request && requesterId) {
        request = pet.matingHistory.find(
            r => r.requesterId === requesterId && 
            ['accepted', 'ownerConfirmedMating', 'requesterConfirmedMating'].includes(r.status)
        );
    }

    if (!request) {
      return new Response(JSON.stringify({ error: "Mating request not found or not active" }), { status: 404 });
    }

    // 4. VALIDATE CURRENT STATUS
    // You can only confirm mating if the request was previously accepted.
    if (!['accepted', 'ownerConfirmedMating', 'requesterConfirmedMating'].includes(request.status)) {
      return new Response(JSON.stringify({ error: `Cannot confirm mating. Request status is '${request.status}'` }), { status: 400 });
    }
    
    // Find the other pet involved to verify ownership
    const otherPet = await Pet.findById(request.requesterPetId);
    if (!otherPet) {
        return new Response(JSON.stringify({ error: "Requester pet not found" }), { status: 404 });
    }

    // 5. DETERMINE USER ROLE (Owner vs Requester)
    let userRole = '';
    
    if (pet.ownerId === userId) {
        userRole = 'owner';
        request.ownerMatedConfirmation = true; // Mark owner's checkbox
    } else if (otherPet.ownerId === userId) {
        userRole = 'requester';
        request.requesterMatedConfirmation = true; // Mark requester's checkbox
    } else {
        return new Response(JSON.stringify({ error: "Unauthorized: You do not own either pet" }), { status: 403 });
    }

    // 6. CHECK FOR MUTUAL CONFIRMATION
    // Logic: If BOTH flags are now true, the mating is officially complete.
    if (request.ownerMatedConfirmation && request.requesterMatedConfirmation) {
      request.status = 'mated';
      
      // NOTE: We do NOT set isPregnant=true here. 
      // Biology takes time! The owner must update pregnancy status manually later.
    } else {
      // If only one person has confirmed so far, update status to reflect that.
      request.status = userRole === 'owner' ? 'ownerConfirmedMating' : 'requesterConfirmedMating';
    }

    // Mongoose requires us to mark mixed types/arrays as modified to save nested changes
    pet.markModified('matingHistory');
    await pet.save();

    return new Response(JSON.stringify({ message: "Mating confirmation updated!", request }), { status: 200 });

  } catch (err) {
    console.error("Error confirming mating:", err);
    return new Response(JSON.stringify({ error: "Failed to confirm mating", details: err.message }), { status: 500 });
  }
}
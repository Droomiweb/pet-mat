// app/api/pet/confirm-mating/route.js
import connectDB from "../../../lib/mongodb";
import Pet from "../../../models/PetModel";

export async function PATCH(req) {
  try {
    await connectDB();
    const { userId, petId, requestId, requesterId } = await req.json();

    if (!userId || !petId) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
    }
    
    const pet = await Pet.findById(petId);
    if (!pet) {
      return new Response(JSON.stringify({ error: "Pet not found" }), { status: 404 });
    }

    // 1. Try finding request by ID
    let request;
    if (requestId) {
        request = pet.matingHistory.id(requestId);
    }
    
    // 2. Fallback: Find by Requester ID + Status
    if (!request && requesterId) {
        request = pet.matingHistory.find(
            r => r.requesterId === requesterId && 
            ['accepted', 'ownerConfirmedMating', 'requesterConfirmedMating'].includes(r.status)
        );
    }

    if (!request) {
      return new Response(JSON.stringify({ error: "Mating request not found" }), { status: 404 });
    }

    // Validate Status
    if (!['accepted', 'ownerConfirmedMating', 'requesterConfirmedMating'].includes(request.status)) {
      return new Response(JSON.stringify({ error: `Cannot confirm mating. Request status is '${request.status}'` }), { status: 400 });
    }
    
    const otherPet = await Pet.findById(request.requesterPetId);
    if (!otherPet) {
        return new Response(JSON.stringify({ error: "Requester pet not found" }), { status: 404 });
    }

    let userRole = '';
    if (pet.ownerId === userId) {
        userRole = 'owner';
        request.ownerMatedConfirmation = true;
    } else if (otherPet.ownerId === userId) {
        userRole = 'requester';
        request.requesterMatedConfirmation = true;
    } else {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 403 });
    }

    // --- CHECK FOR MUTUAL CONFIRMATION ---
    if (request.ownerMatedConfirmation && request.requesterMatedConfirmation) {
      request.status = 'mated';
      
      // --- CHANGE: WE DO NOT SET isPregnant = true HERE ANYMORE ---
      // The female pet owner must explicitly click "Confirm Pregnancy" in the UI later.
    } else {
      request.status = userRole === 'owner' ? 'ownerConfirmedMating' : 'requesterConfirmedMating';
    }

    pet.markModified('matingHistory');
    await pet.save();

    return new Response(JSON.stringify({ message: "Mating confirmation updated!", request }), { status: 200 });

  } catch (err) {
    console.error("Error confirming mating:", err);
    return new Response(JSON.stringify({ error: "Failed to confirm mating", details: err.message }), { status: 500 });
  }
}
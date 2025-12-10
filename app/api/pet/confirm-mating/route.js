// app/api/pet/confirm-mating/route.js

// Standard imports
import connectDB from "../../../lib/mongodb";
import Pet from "../../../models/PetModel";

// PATCH request handler
export async function PATCH(req) {
  try {
    await connectDB();
    
    // Parse request data
    const { userId, petId, requestId, requesterId } = await req.json();

    if (!userId || !petId) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
    }
    
    // Find host pet
    const pet = await Pet.findById(petId);
    if (!pet) {
      return new Response(JSON.stringify({ error: "Pet not found" }), { status: 404 });
    }

    // Find mating request
    let request;
    
    // Lookup by ID
    if (requestId) {
        request = pet.matingHistory.id(requestId);
    }
    
    // Lookup by requester
    if (!request && requesterId) {
        request = pet.matingHistory.find(
            r => r.requesterId === requesterId && 
            ['accepted', 'ownerConfirmedMating', 'requesterConfirmedMating'].includes(r.status)
        );
    }

    if (!request) {
      return new Response(JSON.stringify({ error: "Mating request not found or not active" }), { status: 404 });
    }

    // Validate request status
    if (!['accepted', 'ownerConfirmedMating', 'requesterConfirmedMating'].includes(request.status)) {
      return new Response(JSON.stringify({ error: `Cannot confirm mating. Request status is '${request.status}'` }), { status: 400 });
    }
    
    // Find partner pet
    const otherPet = await Pet.findById(request.requesterPetId);
    if (!otherPet) {
        return new Response(JSON.stringify({ error: "Requester pet not found" }), { status: 404 });
    }

    // Identify user role
    let userRole = '';
    
    if (pet.ownerId === userId) {
        userRole = 'owner';
        request.ownerMatedConfirmation = true; // Mark owner confirmed
    } else if (otherPet.ownerId === userId) {
        userRole = 'requester';
        request.requesterMatedConfirmation = true; // Mark requester confirmed
    } else {
        return new Response(JSON.stringify({ error: "Unauthorized: You do not own either pet" }), { status: 403 });
    }

    // Check mutual confirmation
    if (request.ownerMatedConfirmation && request.requesterMatedConfirmation) {
      request.status = 'mated';
      
      // Mating confirmed fully
    } else {
      // Update partial status
      request.status = userRole === 'owner' ? 'ownerConfirmedMating' : 'requesterConfirmedMating';
    }

    // Save pet changes
    pet.markModified('matingHistory');
    await pet.save();

    return new Response(JSON.stringify({ message: "Mating confirmation updated!", request }), { status: 200 });

  } catch (err) {
    console.error("Error confirming mating:", err);
    return new Response(JSON.stringify({ error: "Failed to confirm mating", details: err.message }), { status: 500 });
  }
}
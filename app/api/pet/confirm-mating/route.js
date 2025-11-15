// app/api/pet/confirm-mating/route.js
import connectDB from "../../../lib/mongodb";
import Pet from "../../../models/PetModel";
// This route is for BOTH users to confirm mating has occurred *after* // a request has been 'accepted'.

export async function PATCH(req) {
  try {
    await connectDB();
    // 'userId' is the person logged in
    const { userId, petId, requestId } = await req.json();

    if (!userId || !petId || !requestId) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
    }
    
    // Find the pet who OWNS the request (the "dam" or "sire")
    const pet = await Pet.findById(petId);
    if (!pet) {
      return new Response(JSON.stringify({ error: "Pet not found" }), { status: 404 });
    }

    const request = pet.matingHistory.id(requestId);
    if (!request) {
      return new Response(JSON.stringify({ error: "Mating request not found" }), { status: 404 });
    }

    // The request must be in 'accepted' state to be confirmed
    if (request.status !== 'accepted') {
      return new Response(JSON.stringify({ error: `Cannot confirm mating. Request status is '${request.status}'` }), { status: 400 });
    }
    
    // Find the other pet (the requester's pet)
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
      
      // Mating is confirmed! Set the female pet to 'pregnant'
      // and hide her from listings.
      if (pet.gender === 'Female') {
        pet.isPregnant = true;
      } else if (otherPet.gender === 'Female') {
        otherPet.isPregnant = true;
        await otherPet.save();
      }
    } else {
      // Only one person has confirmed, update the status
      request.status = userRole === 'owner' ? 'ownerConfirmedMating' : 'requesterConfirmedMating';
    }

    await pet.save();

    return new Response(JSON.stringify({ message: "Mating confirmation updated!", request }), { status: 200 });

  } catch (err) {
    console.error("Error confirming mating:", err);
    return new Response(JSON.stringify({ error: "Failed to confirm mating", details: err.message }), { status: 500 });
  }
}
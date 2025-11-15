// app/api/pet/requests/route.js
import connectDB from "../../../lib/mongodb";
import Pet from "../../../models/PetModel";
// This single PATCH route will handle accepting/rejecting
// both Mating and Adoption requests by the PET OWNER.

export async function PATCH(req) {
  try {
    await connectDB();
    // 'ownerId' is the person logged in, 'petId' is their pet
    const { ownerId, petId, requestId, requestType, newStatus } = await req.json();

    if (!ownerId || !petId || !requestId || !requestType || !newStatus) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
    }

    if (!['approved', 'rejected', 'accepted'].includes(newStatus)) {
      return new Response(JSON.stringify({ error: "Invalid new status" }), { status: 400 });
    }

    const pet = await Pet.findById(petId);
    if (!pet) {
      return new Response(JSON.stringify({ error: "Pet not found" }), { status: 404 });
    }

    // --- SECURITY CHECK ---
    // Ensure the person making the request is the owner of the pet
    if (pet.ownerId !== ownerId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 403 });
    }

    let request;
    
    if (requestType === 'adoption') {
      if (newStatus === 'accepted') { // 'accepted' is not valid for adoption
          return new Response(JSON.stringify({ error: "Invalid status for adoption" }), { status: 400 });
      }
      
      request = pet.adoptionRequests.id(requestId);
      if (!request) {
        return new Response(JSON.stringify({ error: "Adoption request not found" }), { status: 404 });
      }
      
      request.status = newStatus;

      // If approved, reject all other pending adoption requests
      if (newStatus === 'approved') {
        pet.adoptionRequests.forEach(req => {
          if (req.id !== requestId && req.status === 'pending') {
            req.status = 'rejected';
          }
        });
        
        // --- TRANSFER OWNERSHIP ---
        pet.ownerId = request.requesterId;
        pet.listingType = 'Mating'; // No longer for adoption
        pet.adoptionRequests = []; // Clear all requests
      }
      
    } else if (requestType === 'mating') {
      if (newStatus === 'approved') { // 'approved' is not valid for mating
          return new Response(JSON.stringify({ error: "Invalid status for mating" }), { status: 400 });
      }
      
      request = pet.matingHistory.id(requestId);
      if (!request) {
        return new Response(JSON.stringify({ error: "Mating request not found" }), { status: 404 });
      }
      
      // 'accepted' means chat is now open
      // 'rejected' ends the request
      request.status = newStatus;

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
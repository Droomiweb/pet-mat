// app/api/pet/user/[uid]/route.js
import connectDB from "./../../../../lib/mongodb";
import Pet from "./../../../../models/PetModel";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req, context) {
  try {
    await connectDB();
    const { uid } = await context.params;

    // 1. Fetch pets owned by the user
    const userPets = await Pet.find({ ownerId: uid }).lean();

    // 2. Fetch pets where user is the requester (Mating or Adoption)
    const partnerPets = await Pet.find({
      ownerId: { $ne: uid },
      $or: [
        {
            "matingHistory": {
                $elemMatch: {
                    requesterId: uid,
                    status: { $in: ['accepted', 'ownerConfirmedMating', 'requesterConfirmedMating', 'mated'] }
                }
            }
        },
        {
            "adoptionRequests": {
                $elemMatch: {
                    requesterId: uid,
                    status: { $in: ['approved'] } // Only care if approved (pending handover)
                }
            }
        }
      ]
    }).lean();

    // 3. Create a map
    const formattedPetsMap = {};
    
    userPets.forEach(pet => {
        if (pet._id) {
            const safeMatingHistory = (pet.matingHistory || []).map(item => ({
                ...item,
                _id: item._id ? item._id.toString() : null,
            }));
            const safeAdoptionRequests = (pet.adoptionRequests || []).map(item => ({
                ...item,
                _id: item._id ? item._id.toString() : null
            }));

            formattedPetsMap[pet._id.toString()] = {
                _id: pet._id.toString(),
                name: pet.name,
                age: pet.age, 
                breed: pet.breed, 
                type: pet.type, 
                gender: pet.gender, 
                listingType: pet.listingType, 
                temperament: pet.temperament, 
                energyLevel: pet.energyLevel, 
                imageUrls: pet.imageUrls || [], 
                certificateUrl: pet.certificateUrl || null, 
                messages: pet.messages || [], 
                verificationStatus: pet.verificationStatus, 
                isBanned: pet.isBanned, 
                isPregnant: pet.isPregnant, 
                aiProfileString: pet.aiProfileString, 
                vaccinationHistory: pet.vaccinationHistory || [],
                
                // --- CRITICAL ADDITION: Include adoptionLog ---
                adoptionLog: pet.adoptionLog || null,
                // -----------------------------------------------

                matingHistory: safeMatingHistory, 
                adoptionRequests: safeAdoptionRequests, 
                outgoingRequests: [] 
            };
        }
    });

    // 4. Attach Outgoing Requests (User is requester)
    if (Array.isArray(partnerPets)) {
        partnerPets.forEach(partnerPet => {
            // Mating
            if (partnerPet.matingHistory) {
                partnerPet.matingHistory.forEach(req => {
                    if (req.requesterId === uid && ['accepted', 'ownerConfirmedMating', 'requesterConfirmedMating', 'mated'].includes(req.status)) {
                        const requesterPetIdStr = req.requesterPetId ? req.requesterPetId.toString() : null;
                        if (requesterPetIdStr && formattedPetsMap[requesterPetIdStr]) {
                            formattedPetsMap[requesterPetIdStr].outgoingRequests.push({
                                ...req,
                                _id: req._id ? req._id.toString() : null,
                                partnerId: partnerPet._id.toString(),
                                partnerName: partnerPet.name,         
                                requestType: 'mating',
                                isOutgoing: true 
                            });
                        }
                    }
                });
            }
            
            // Adoption Incoming (The pet being adopted)
            if (partnerPet.adoptionRequests) {
                const adoptionReq = partnerPet.adoptionRequests.find(r => r.requesterId === uid && r.status === 'approved');
                if (adoptionReq) {
                    formattedPetsMap[partnerPet._id.toString()] = {
                        _id: partnerPet._id.toString(),
                        name: partnerPet.name,
                        breed: partnerPet.breed,
                        type: partnerPet.type,
                        imageUrls: partnerPet.imageUrls || [],
                        isIncomingAdoption: true, // Flag for UI
                        adoptionRequests: [adoptionReq], // Include specific req
                        ownerId: partnerPet.ownerId // Current owner
                    };
                }
            }
        });
    }

    const responsePets = Object.values(formattedPetsMap);

    return new Response(JSON.stringify(responsePets), {
      status: 200,
      headers: { 
          "Content-Type": "application/json",
          "Cache-Control": "no-store, no-cache",
      },
    });
  } catch (err) {
    console.error("Error in GET /api/pet/user/[uid]:", err);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }
}
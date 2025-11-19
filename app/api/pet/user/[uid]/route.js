// app/api/pet/user/[uid]/route.js
import connectDB from "./../../../../lib/mongodb";
import Pet from "./../../../../models/PetModel";

// Force dynamic to ensure fresh data on profile load
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req, context) {
  try {
    await connectDB();

    const { uid } = await context.params;

    // 1. Fetch pets owned by the user
    const userPets = await Pet.find({ ownerId: uid }).lean();

    // 2. Fetch pets NOT owned by user, but where user has an active accepted request
    const partnerPets = await Pet.find({
      ownerId: { $ne: uid },
      "matingHistory": {
        $elemMatch: {
          requesterId: uid,
          status: { $in: ['accepted', 'ownerConfirmedMating', 'requesterConfirmedMating', 'mated'] }
        }
      }
    }).lean();

    // 3. Create a map of userPets for easy data injection
    const formattedPetsMap = {};
    
    userPets.forEach(pet => {
        if (pet._id) {
            // Format matingHistory items
            const safeMatingHistory = (pet.matingHistory || []).map(item => ({
                ...item,
                _id: item._id ? item._id.toString() : null,
                requesterPetId: item.requesterPetId ? item.requesterPetId.toString() : null
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
                matingHistory: safeMatingHistory, 
                adoptionRequests: safeAdoptionRequests, 
                verificationStatus: pet.verificationStatus,
                isBanned: pet.isBanned,
                isPregnant: pet.isPregnant,
                aiProfileString: pet.aiProfileString, 
                // --- CRITICAL FIX: ADD VACCINATION HISTORY HERE ---
                vaccinationHistory: pet.vaccinationHistory || [],
                // ---------------------------------------------------
                outgoingRequests: [] 
            };
        }
    });

    // 4. Find outgoing requests in Partner Pets and attach them to User Pets (unchanged)
    if (Array.isArray(partnerPets)) {
        partnerPets.forEach(partnerPet => {
            if (!Array.isArray(partnerPet.matingHistory)) return;

            partnerPet.matingHistory.forEach(req => {
                if (!req || !req.requesterId) return;

                if (req.requesterId === uid && 
                   ['accepted', 'ownerConfirmedMating', 'requesterConfirmedMating', 'mated'].includes(req.status)) {
                    
                    const requesterPetIdStr = req.requesterPetId ? req.requesterPetId.toString() : null;

                    if (requesterPetIdStr && formattedPetsMap[requesterPetIdStr]) {
                        formattedPetsMap[requesterPetIdStr].outgoingRequests.push({
                            ...req,
                            _id: req._id ? req._id.toString() : null,
                            partnerId: partnerPet._id.toString(),
                            partnerName: partnerPet.name,         
                            partnerOwnerId: partnerPet.ownerId,
                            isOutgoing: true 
                        });
                    }
                }
            });
        });
    }

    const responsePets = Object.values(formattedPetsMap);

    return new Response(JSON.stringify(responsePets), {
      status: 200,
      headers: { 
          "Content-Type": "application/json",
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
      },
    });
  } catch (err) {
    console.error("Error in GET /api/pet/user/[uid]:", err);
    return new Response(JSON.stringify({ error: "Internal Server Error", details: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
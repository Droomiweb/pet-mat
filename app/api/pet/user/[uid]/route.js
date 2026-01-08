// app/api/pet/user/[uid]/route.js

// Standard imports
import connectDB from "./../../../../lib/mongodb";
import Pet from "./../../../../models/PetModel";

// Disable caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET request handler
export async function GET(req, context) {
  try {
    await connectDB();
    
    // Parse user ID
    const { uid } = await context.params;

    // Fetch user pets
    const userPets = await Pet.find({ ownerId: uid }).lean();
    console.log(`[API] User Pets for ${uid}: Found ${userPets.length}`);

    // Fetch partner pets
    // Pets I don't own but interact with
    const partnerPets = await Pet.find({
      ownerId: { $ne: uid }, // Exclude own pets
      $or: [
        {
            "matingHistory": {
                $elemMatch: {
                    requesterId: uid,
                    // Match active status
                    status: { $in: ['accepted', 'ownerConfirmedMating', 'requesterConfirmedMating', 'mated'] }
                }
            }
        },
        {
            "adoptionRequests": {
                $elemMatch: {
                    requesterId: uid,
                    // Match approved status
                    status: { $in: ['approved'] } 
                }
            }
        }
      ]
    }).lean();

    // Format pet data
    const formattedPetsMap = {};
    
    // Process user pets
    userPets.forEach(pet => {
        if (pet._id) {
            // Sanitize sub-documents
            const safeMatingHistory = (pet.matingHistory || []).map(item => ({
                ...item,
                _id: item._id ? item._id.toString() : null,
            }));
            const safeAdoptionRequests = (pet.adoptionRequests || []).map(item => ({
                ...item,
                _id: item._id ? item._id.toString() : null
            }));

            // Map pet details
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
                
                // Include adoption log
                adoptionLog: pet.adoptionLog || null,

                matingHistory: safeMatingHistory, 
                adoptionRequests: safeAdoptionRequests, 
                
                // Init outgoing requests
                outgoingRequests: [] 
            };
        }
    });

    // Process interactions
    if (Array.isArray(partnerPets)) {
        partnerPets.forEach(partnerPet => {
            
            // Handle mating requests
            if (partnerPet.matingHistory) {
                partnerPet.matingHistory.forEach(req => {
                    // Verify request status
                    if (req.requesterId === uid && ['accepted', 'ownerConfirmedMating', 'requesterConfirmedMating', 'mated'].includes(req.status)) {
                        
                        // Identify source pet
                        const requesterPetIdStr = req.requesterPetId ? req.requesterPetId.toString() : null;
                        
                        // Attach request info
                        if (requesterPetIdStr && formattedPetsMap[requesterPetIdStr]) {
                            formattedPetsMap[requesterPetIdStr].outgoingRequests.push({
                                ...req,
                                _id: req._id ? req._id.toString() : null,
                                partnerId: partnerPet._id.toString(), // Partner pet ID
                                partnerName: partnerPet.name,         
                                requestType: 'mating',
                                isOutgoing: true 
                            });
                        }
                    }
                });
            }
            
            // Handle adoption requests
            if (partnerPet.adoptionRequests) {
                const adoptionReq = partnerPet.adoptionRequests.find(r => r.requesterId === uid && r.status === 'approved');
                
                if (adoptionReq) {
                    // Create incoming entry
                    formattedPetsMap[partnerPet._id.toString()] = {
                        _id: partnerPet._id.toString(),
                        name: partnerPet.name,
                        breed: partnerPet.breed,
                        type: partnerPet.type,
                        imageUrls: partnerPet.imageUrls || [],
                        isIncomingAdoption: true, // UI Flag
                        adoptionRequests: [adoptionReq], 
                        ownerId: partnerPet.ownerId 
                    };
                }
            }
        });
    }

    // Convert to array
    const responsePets = Object.values(formattedPetsMap);

    // Return JSON response
    return new Response(JSON.stringify(responsePets), {
      status: 200,
      headers: { 
          "Content-Type": "application/json",
          "Cache-Control": "no-store, no-cache",
      },
    });
  } catch (err) {
    // Handle server errors
    console.error("Error in GET /api/pet/user/[uid]:", err);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }
}
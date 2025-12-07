// app/api/pet/user/[uid]/route.js

// 1. IMPORTS
import connectDB from "./../../../../lib/mongodb";
import Pet from "./../../../../models/PetModel";

// 2. CONFIGURATION
// These settings ensure the dashboard is always fresh.
// "force-dynamic": Don't cache this at build time.
// "revalidate = 0": Don't cache the data even for a second.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// 3. GET HANDLER
export async function GET(req, context) {
  try {
    await connectDB();
    
    // We need the UID of the logged-in user to find their data.
    // Note: Await params for Next.js 15 compatibility.
    const { uid } = await context.params;

    // --- QUERY 1: MY PETS ---
    // Fetch all pets where I am the owner.
    const userPets = await Pet.find({ ownerId: uid }).lean();

    // --- QUERY 2: PARTNER PETS ---
    // Fetch pets I don't own, but am interacting with.
    // Case A: I sent a mating request that is active (accepted/confirmed).
    // Case B: I sent an adoption request that is approved.
    const partnerPets = await Pet.find({
      ownerId: { $ne: uid }, // Not mine
      $or: [
        {
            "matingHistory": {
                $elemMatch: {
                    requesterId: uid,
                    // Only care if it's progressed beyond "pending"
                    status: { $in: ['accepted', 'ownerConfirmedMating', 'requesterConfirmedMating', 'mated'] }
                }
            }
        },
        {
            "adoptionRequests": {
                $elemMatch: {
                    requesterId: uid,
                    // Only care if approved (waiting for handover)
                    status: { $in: ['approved'] } 
                }
            }
        }
      ]
    }).lean();

    // 4. DATA TRANSFORMATION
    // We use a Map (Key: ID, Value: Pet Object) to easily merge data.
    const formattedPetsMap = {};
    
    // Process User's Own Pets first
    userPets.forEach(pet => {
        if (pet._id) {
            // Clean up sub-documents (convert ObjectIDs to strings for JSON safety)
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
                
                // Include adoptionLog for certificate generation
                adoptionLog: pet.adoptionLog || null,

                matingHistory: safeMatingHistory, 
                adoptionRequests: safeAdoptionRequests, 
                
                // Initialize empty array for requests I sent regarding this pet
                outgoingRequests: [] 
            };
        }
    });

    // 5. ATTACH OUTGOING REQUESTS (Interactions)
    if (Array.isArray(partnerPets)) {
        partnerPets.forEach(partnerPet => {
            
            // LOGIC: Mating Requests I Sent
            if (partnerPet.matingHistory) {
                partnerPet.matingHistory.forEach(req => {
                    // Check if this request belongs to me and is active
                    if (req.requesterId === uid && ['accepted', 'ownerConfirmedMating', 'requesterConfirmedMating', 'mated'].includes(req.status)) {
                        
                        // Find "My Pet" that I offered for mating
                        const requesterPetIdStr = req.requesterPetId ? req.requesterPetId.toString() : null;
                        
                        // If my pet is in the map, attach this info to it
                        if (requesterPetIdStr && formattedPetsMap[requesterPetIdStr]) {
                            formattedPetsMap[requesterPetIdStr].outgoingRequests.push({
                                ...req,
                                _id: req._id ? req._id.toString() : null,
                                partnerId: partnerPet._id.toString(), // The ID of the dog we are mating with
                                partnerName: partnerPet.name,         
                                requestType: 'mating',
                                isOutgoing: true 
                            });
                        }
                    }
                });
            }
            
            // LOGIC: Adoption Requests I Sent (Approved)
            if (partnerPet.adoptionRequests) {
                const adoptionReq = partnerPet.adoptionRequests.find(r => r.requesterId === uid && r.status === 'approved');
                
                if (adoptionReq) {
                    // Since I don't own this pet yet, I create a temporary "Incoming" card
                    // This allows me to see the "Confirm Handover" button on my dashboard.
                    formattedPetsMap[partnerPet._id.toString()] = {
                        _id: partnerPet._id.toString(),
                        name: partnerPet.name,
                        breed: partnerPet.breed,
                        type: partnerPet.type,
                        imageUrls: partnerPet.imageUrls || [],
                        isIncomingAdoption: true, // Special flag for UI
                        adoptionRequests: [adoptionReq], 
                        ownerId: partnerPet.ownerId 
                    };
                }
            }
        });
    }

    // Convert map back to array
    const responsePets = Object.values(formattedPetsMap);

    // 6. RESPONSE
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
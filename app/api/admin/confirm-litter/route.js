// app/api/admin/confirm-litter/route.js
import connectDB from "../../lib/mongodb";
import Pet from "../../models/PetModel";

export async function POST(req) {
  try {
    await connectDB();
    const { damPet, sirePet, matingRequest, litterData } = await req.json();

    if (!damPet || !sirePet || !matingRequest || !litterData || litterData.length === 0) {
      return new Response(JSON.stringify({ error: "Missing required litter data" }), { status: 400 });
    }

    // --- Create each new pet in the litter ---
    for (const newPet of litterData) {
      if (!newPet.name || !newPet.gender) {
        // Skip invalid entries
        console.warn("Skipping litter entry with missing name or gender");
        continue;
      }

      const createdPet = new Pet({
        name: newPet.name,
        gender: newPet.gender,
        type: damPet.type, // Inherit type from mother
        breed: damPet.breed, // Default to mother's breed (admin can change later if needed)
        age: 0,
        
        // --- THIS IS THE KEY ---
        damId: damPet._id,
        sireId: sirePet._id,
        // --- END KEY ---

        ownerId: damPet.ownerId, // Assign new litter to the mother's owner
        verificationStatus: 'verified', // Admin-confirmed, so auto-verify
        isBanned: false,
        listingType: 'Mating', // Default to Mating
        temperament: 'Friendly', // Default
        energyLevel: 'Medium', // Default
        
        // New pets have no images or certs yet
        imageUrls: [],
        certificateUrl: null,
      });
      await createdPet.save();
    }

    // --- Update the mother's mating request status to "completed" ---
    const motherPet = await Pet.findById(damPet._id);
    const request = motherPet.matingHistory.id(matingRequest._id);
    
    if (request) {
      request.status = 'completed'; // Mark as completed so it leaves the admin queue
      await motherPet.save();
    }

    return new Response(JSON.stringify({ message: "Litter confirmed and pedigree linked successfully!" }), { status: 201 });

  } catch (err) {
    console.error("Error confirming litter:", err);
    return new Response(JSON.stringify({ error: "Failed to confirm litter", details: err.message }), { status: 500 });
  }
}
// app/api/admin/confirm-litter/route.js

import connectDB from "../../../lib/mongodb";
// Import Pet model
import Pet from "../../../models/PetModel";

// POST request handler
export async function POST(req) {
  try {
    // Connect to database
    await connectDB();

    // Parse request body
    const { damPet, sirePet, matingRequest, litterData } = await req.json();

    // Validate required data
    if (!damPet || !sirePet || !matingRequest || !litterData || litterData.length === 0) {
      return new Response(JSON.stringify({ error: "Missing required litter data" }), { status: 400 });
    }

    // Process new pets
    for (const newPet of litterData) {
      // Check data validity
      if (!newPet.name || !newPet.gender) {
        console.warn("Skipping litter entry with missing name or gender");
        continue; // Skip invalid entry
      }

      // Create pet instance
      const createdPet = new Pet({
        name: newPet.name,
        gender: newPet.gender,
        type: damPet.type,     // Inherit mother's type
        breed: damPet.breed,   // Inherit mother's breed
        age: 0,                // Set newborn age
        
        // Link parent lineage
        damId: damPet._id,
        sireId: sirePet._id,

        ownerId: damPet.ownerId, // Set owner
        verificationStatus: 'verified', // Auto-verify pet
        isBanned: false,
        listingType: 'Mating',   // Default listing
        temperament: 'Friendly', // Default temperament
        energyLevel: 'Medium',   // Default energy
        
        // Initialize empty fields
        imageUrls: [],
        certificateUrl: null,
      });

      // Save to database
      await createdPet.save();
    }

    // Find mother pet
    const motherPet = await Pet.findById(damPet._id);
    
    // Find mating request
    const request = motherPet.matingHistory.id(matingRequest._id);
    
    // Mark request complete
    if (request) {
      request.status = 'completed'; 
      await motherPet.save(); // Save mother updates
    }

    // Return success response
    return new Response(JSON.stringify({ message: "Litter confirmed and pedigree linked successfully!" }), { status: 201 });

  } catch (err) {
    // Log error details
    console.error("Error confirming litter:", err);
    // Return server error
    return new Response(JSON.stringify({ error: "Failed to confirm litter", details: err.message }), { status: 500 });
  }
}
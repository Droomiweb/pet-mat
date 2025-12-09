// app/api/admin/confirm-litter/route.js

import connectDB from "../../../lib/mongodb";
// We import the Pet model to create new pet documents and update existing ones.
import Pet from "../../../models/PetModel";

// 2. DEFINE THE POST HANDLER
// This function handles the POST request sent to '/api/admin/confirm-litter'.
export async function POST(req) {
  try {
    // Ensure the database connection is established.
    await connectDB();

    // 3. PARSE THE REQUEST BODY
    // We extract the mother (dam), father (sire), the specific mating request object,
    // and the array of new pets (litterData) provided by the admin.
    const { damPet, sirePet, matingRequest, litterData } = await req.json();

    // 4. VALIDATION
    // Check if any critical information is missing. If so, return a 400 Bad Request error.
    if (!damPet || !sirePet || !matingRequest || !litterData || litterData.length === 0) {
      return new Response(JSON.stringify({ error: "Missing required litter data" }), { status: 400 });
    }

    // 5. PROCESS THE LITTER (Create New Pets)
    // Loop through every new pet object provided in the litterData array.
    for (const newPet of litterData) {
      // Basic validation for individual litter entries.
      if (!newPet.name || !newPet.gender) {
        console.warn("Skipping litter entry with missing name or gender");
        continue; // Skip this iteration if data is invalid
      }

      // Create a new Pet instance using the Mongoose model.
      const createdPet = new Pet({
        name: newPet.name,
        gender: newPet.gender,
        type: damPet.type,     // Logic: The offspring is the same species as the mother.
        breed: damPet.breed,   // Logic: Default to mother's breed (admin/owner can edit later).
        age: 0,                // Logic: They are newborns.
        
        // --- CRITICAL PEDIGREE LINKING ---
        // This is how we build the family tree. We store the IDs of the parents
        // on the child's record. This allows us to look up lineage later.
        damId: damPet._id,
        sireId: sirePet._id,
        // --------------------------------

        ownerId: damPet.ownerId, // Logic: The owner of the mother owns the litter by default.
        verificationStatus: 'verified', // Logic: Since an Admin is creating this, it is automatically trusted/verified.
        isBanned: false,
        listingType: 'Mating',   // Default listing status.
        temperament: 'Friendly', // Default value to prevent null errors.
        energyLevel: 'Medium',   // Default value to prevent null errors.
        
        // Initialize empty arrays/values for fields that don't exist yet.
        imageUrls: [],
        certificateUrl: null,
      });

      // Save the new pet to the database.
      await createdPet.save();
    }

    // 6. CLOSE THE MATING REQUEST
    // We need to find the mother in the database to update her specific mating history record.
    const motherPet = await Pet.findById(damPet._id);
    
    // Mongoose sub-document search: Find the specific request inside the mother's `matingHistory` array.
    const request = motherPet.matingHistory.id(matingRequest._id);
    
    // If the request is found, mark it as 'completed'.
    // This effectively removes it from the Admin's "Pending" queue in the UI.
    if (request) {
      request.status = 'completed'; 
      await motherPet.save(); // Save the changes to the mother's record.
    }

    // 7. SUCCESS RESPONSE
    // Return a 201 Created status with a success message.
    return new Response(JSON.stringify({ message: "Litter confirmed and pedigree linked successfully!" }), { status: 201 });

  } catch (err) {
    // 8. ERROR HANDLING
    // Log the error to the server console for debugging.
    console.error("Error confirming litter:", err);
    // Return a 500 Internal Server Error to the client.
    return new Response(JSON.stringify({ error: "Failed to confirm litter", details: err.message }), { status: 500 });
  }
}
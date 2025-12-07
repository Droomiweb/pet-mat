// app/api/pedigree/[petId]/route.js

// 1. IMPORTS
import connectDB from "../../../lib/mongodb";
import Pet from "../../../models/PetModel";

// 2. HELPER FUNCTION: Get Pet Stub
// This is an optimization helper. Instead of fetching the ENTIRE pet document,
// we only fetch the fields necessary for the visual tree.
const getPetStub = async (petId) => {
  // If no ID exists (e.g. parent is unknown), return null immediately.
  if (!petId) return null;
  
  try {
    const pet = await Pet.findById(petId)
      .select('name breed damId sireId imageUrls') // Only select vital info
      .lean(); // Return a plain JS object (faster than Mongoose document)
    return pet;
  } catch (error) {
    // If the ID is malformed or not found, just return null so the tree doesn't crash
    console.error("Error fetching pet stub:", error);
    return null;
  }
};

// 3. GET HANDLER
export async function GET(req, context) {
  try {
    await connectDB();
    
    // --- NEXT.JS 15 FIX ---
    // In the App Router, 'params' is a Promise. We must await it to get the ID.
    const { petId } = await context.params;

    // 4. LEVEL 1: The Base Pet (The child)
    const basePet = await getPetStub(petId);
    
    if (!basePet) {
      return new Response(JSON.stringify({ error: "Pet not found" }), { status: 404 });
    }

    // 5. LEVEL 2: The Parents
    // Dam = Mother, Sire = Father
    const dam = await getPetStub(basePet.damId);
    const sire = await getPetStub(basePet.sireId);

    // 6. LEVEL 3: The Grandparents
    // We only attempt to fetch grandparents if the parents actually exist.
    const paternalGrandDam = dam ? await getPetStub(dam.damId) : null;
    const paternalGrandSire = dam ? await getPetStub(dam.sireId) : null;
    
    const maternalGrandDam = sire ? await getPetStub(sire.damId) : null;
    const maternalGrandSire = sire ? await getPetStub(sire.sireId) : null;

    // 7. CONSTRUCT THE TREE JSON
    // We assemble the fetched pieces into a nested structure that the frontend 
    // organization chart library can easily read.
    const pedigree = {
      ...basePet, // The Child
      
      // The Mother's Branch
      dam: dam ? {
        ...dam,
        dam: paternalGrandDam,  // Paternal Grandmother
        sire: paternalGrandSire, // Paternal Grandfather
      } : null,
      
      // The Father's Branch
      sire: sire ? {
        ...sire,
        dam: maternalGrandDam,   // Maternal Grandmother
        sire: maternalGrandSire, // Maternal Grandfather
      } : null,
    };

    // 8. RETURN RESPONSE
    return new Response(JSON.stringify(pedigree), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Error fetching pedigree:", err);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }
}
// app/api/pedigree/[petId]/route.js

// Standard imports
import connectDB from "../../../lib/mongodb";
import Pet from "../../../models/PetModel";

// Helper: Fetch pet data
const getPetStub = async (petId) => {
  // Check ID existence
  if (!petId) return null;
  
  try {
    const pet = await Pet.findById(petId)
      .select('name breed damId sireId imageUrls') // Select specific fields
      .lean(); // Return plain object
    return pet;
  } catch (error) {
    // Handle fetch error
    console.error("Error fetching pet stub:", error);
    return null;
  }
};

// GET request handler
export async function GET(req, context) {
  try {
    await connectDB();
    
    // Await request params
    const { petId } = await context.params;

    // Fetch base pet
    const basePet = await getPetStub(petId);
    
    if (!basePet) {
      return new Response(JSON.stringify({ error: "Pet not found" }), { status: 404 });
    }

    // Fetch parents
    const dam = await getPetStub(basePet.damId);
    const sire = await getPetStub(basePet.sireId);

    // Fetch grandparents
    // Only fetch if parents exist
    const paternalGrandDam = dam ? await getPetStub(dam.damId) : null;
    const paternalGrandSire = dam ? await getPetStub(dam.sireId) : null;
    
    const maternalGrandDam = sire ? await getPetStub(sire.damId) : null;
    const maternalGrandSire = sire ? await getPetStub(sire.sireId) : null;

    // Build pedigree tree
    const pedigree = {
      ...basePet, // Base pet
      
      // Mother's side
      dam: dam ? {
        ...dam,
        dam: paternalGrandDam,  // Paternal Grandmother
        sire: paternalGrandSire, // Paternal Grandfather
      } : null,
      
      // Father's side
      sire: sire ? {
        ...sire,
        dam: maternalGrandDam,   // Maternal Grandmother
        sire: maternalGrandSire, // Maternal Grandfather
      } : null,
    };

    // Return JSON response
    return new Response(JSON.stringify(pedigree), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Error fetching pedigree:", err);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }
}
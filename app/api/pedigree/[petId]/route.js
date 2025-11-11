// app/api/pedigree/[petId]/route.js
import connectDB from "../../../lib/mongodb";
import Pet from "../../../models/PetModel";

// Helper function to fetch a pet's details (name, id, breed)
const getPetStub = async (petId) => {
  if (!petId) return null;
  try {
    const pet = await Pet.findById(petId)
      .select('name breed damId sireId imageUrls')
      .lean();
    return pet;
  } catch (error) {
    console.error("Error fetching pet stub:", error);
    return null;
  }
};

export async function GET(req, context) {
  try {
    await connectDB();
    const { petId } = context.params;

    // 1. Fetch the base pet
    const basePet = await getPetStub(petId);
    if (!basePet) {
      return new Response(JSON.stringify({ error: "Pet not found" }), { status: 404 });
    }

    // 2. Fetch parents (Dam and Sire)
    const dam = await getPetStub(basePet.damId);
    const sire = await getPetStub(basePet.sireId);

    // 3. Fetch grandparents
    const paternalGrandDam = dam ? await getPetStub(dam.damId) : null;
    const paternalGrandSire = dam ? await getPetStub(dam.sireId) : null;
    const maternalGrandDam = sire ? await getPetStub(sire.damId) : null;
    const maternalGrandSire = sire ? await getPetStub(sire.sireId) : null;

    // 4. Construct the pedigree tree
    const pedigree = {
      ...basePet,
      dam: dam ? {
        ...dam,
        dam: paternalGrandDam,
        sire: paternalGrandSire,
      } : null,
      sire: sire ? {
        ...sire,
        dam: maternalGrandDam,
        sire: maternalGrandSire,
      } : null,
    };

    return new Response(JSON.stringify(pedigree), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Error fetching pedigree:", err);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }
}
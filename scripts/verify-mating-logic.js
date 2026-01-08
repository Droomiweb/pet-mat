
const mongoose = require('mongoose');
const ListingType = ['adoption', 'mating', 'none']; // Adjust based on your schema

// Mock Mongoose setup (Basic)
require('dotenv').config({ path: '.env.local' });

// We need to define schema/model if we can't import existing ones easily in standalone script
// Trying to reuse existing model if possible, but might be hard with ES6 imports in CommonJS script.
// So I will define a lightweight schema here for testing.

const petSchema = new mongoose.Schema({
  name: String,
  type: String,
  gender: String,
  ownerId: String,
  listingType: String,
}, { strict: false });

const Pet = mongoose.models.Pet || mongoose.model('Pet', petSchema);

async function verifyLogic() {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    console.error("No MONGODB_URI found in .env.local");
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to DB");

    // 1. Setup Test Data
    const owner1 = "test_owner_1_" + Date.now();
    const owner2 = "test_owner_2_" + Date.now();

    const requesterPet = await Pet.create({
        name: "Requester Dog",
        type: "Dog",
        gender: "Male",
        ownerId: owner1,
        listingType: "None"
    });

    const targetPet = await Pet.create({
        name: "Target Dog",
        type: "Dog",
        gender: "Female",
        ownerId: owner2,
        listingType: "Mating" // Correct type
    });
    
    const targetPetWrongGender = await Pet.create({
        name: "Target Dog Male",
        type: "Dog",
        gender: "Male",
        ownerId: owner2, 
        listingType: "Mating"
    });

    console.log(`Created pets: ${requesterPet._id}, ${targetPet._id}`);

    // 2. Run Validation Logic (Simulated)
    console.log("--- TEST 1: Valid Request ---");
    try {
        if (!requesterPet) throw "Requester not found";
        if (requesterPet.ownerId === targetPet.ownerId) throw "Same owner";
        if (requesterPet.type !== targetPet.type) throw "Species mismatch";
        if (requesterPet.gender === targetPet.gender) throw "Gender mismatch";
        if (targetPet.listingType !== 'Mating') throw "Not listed for mating";
        console.log("✅ TEST 1 PASSED: valid request allowed");
    } catch (e) {
        console.error("❌ TEST 1 FAILED:", e);
    }

    console.log("--- TEST 2: Invalid Gender ---");
    try {
        if (!requesterPet) throw "Requester not found";
        if (requesterPet.ownerId === targetPetWrongGender.ownerId) throw "Same owner";
        if (requesterPet.type !== targetPetWrongGender.type) throw "Species mismatch";
        if (requesterPet.gender === targetPetWrongGender.gender) throw "Gender mismatch";
        // Should throw
        console.error("❌ TEST 2 FAILED: Invalid gender was allowed");
    } catch (e) {
        if (e === "Gender mismatch") console.log("✅ TEST 2 PASSED: Gender mismatch caught");
        else console.error("❌ TEST 2 FAILED with wrong error:", e);
    }

    // 3. Cleanup
    await Pet.findByIdAndDelete(requesterPet._id);
    await Pet.findByIdAndDelete(targetPet._id);
    await Pet.findByIdAndDelete(targetPetWrongGender._id);
    console.log("Cleanup done.");

  } catch (err) {
    console.error("Test failed:", err);
  } finally {
    await mongoose.disconnect();
  }
}

verifyLogic();

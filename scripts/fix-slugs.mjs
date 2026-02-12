
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load env
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI not found");
  process.exit(1);
}

// Define Schema roughly (or import if possible, but standalone is safer)
const petSchema = new mongoose.Schema({
  name: String,
  slug: { type: String, unique: true, sparse: true },
}, { strict: false });

const Pet = mongoose.models.Pet || mongoose.model("Pet", petSchema);

async function fixSlugs() {
  try {
    console.log("Connecting to DB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected.");

    const pets = await Pet.find({});
    console.log(`Found ${pets.length} pets.`);

    let updated = 0;
    for (const pet of pets) {
      if (!pet.slug) {
        const newSlug = `${pet.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${pet._id.toString().slice(-6)}`;
        console.log(`🔹 Generating slug for ${pet.name}: ${newSlug}`);
        
        // Update directly
        await Pet.updateOne({ _id: pet._id }, { $set: { slug: newSlug } });
        updated++;
      } else {
        console.log(`✅ ${pet.name} already has slug: ${pet.slug}`);
      }
    }

    console.log(`🎉 Finished. Updated ${updated} pets.`);
    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err);
    process.exit(1);
  }
}

fixSlugs();

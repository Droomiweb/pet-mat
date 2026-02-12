import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI not found!");
  process.exit(1);
}

const geminiKeySchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  isActive: { type: Boolean, default: true },
  lastUsed: { type: Date, default: Date.now },
  failureCount: { type: Number, default: 0 }
});

const GeminiKey = mongoose.models.GeminiKey || mongoose.model("GeminiKey", geminiKeySchema);

async function resetKeys() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected.");

    console.log("Deleting all GeminiKey documents...");
    const result = await GeminiKey.deleteMany({});
    console.log(`Deleted ${result.deletedCount} keys.`);

    console.log("✅ Successfully cleared invalid keys.");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected.");
    process.exit(0);
  }
}

resetKeys();

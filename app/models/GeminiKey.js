import mongoose from "mongoose";

const GeminiKeySchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  failureCount: {
    type: Number,
    default: 0,
  },
  lastUsed: {
    type: Date,
    default: Date.now,
  },
  addedAt: {
    type: Date,
    default: Date.now,
  }
});

// Prevent recompilation
export default mongoose.models.GeminiKey || mongoose.model("GeminiKey", GeminiKeySchema);

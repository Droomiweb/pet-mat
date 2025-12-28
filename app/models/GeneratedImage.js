import mongoose from "mongoose";

const GeneratedImageSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  parentAId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pet',
    required: true
  },
  parentBId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pet',
    required: true
  },
  imageUrl: {
    type: String,
    required: true
  },
  promptUsed: {
    type: String // Optional: good for debugging or future features
  }
}, { timestamps: true });

// Prevent recompilation error in development
const GeneratedImage = mongoose.models.GeneratedImage || mongoose.model("GeneratedImage", GeneratedImageSchema);

export default GeneratedImage;
import mongoose from "mongoose";

const PetSchema = new mongoose.Schema({
  name: { type: String, required: true },
  breed: { type: String },
  age: { type: Number },
  certificateUrl: { type: String, required: true }, 
  imageUrls: { type: [String], default: [] },
  ownerId: { type: String, required: true }, // Firebase UID
}, { timestamps: true });

export default mongoose.models.Pet || mongoose.model("Pet", PetSchema);

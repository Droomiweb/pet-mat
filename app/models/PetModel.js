import mongoose from "mongoose";

const PetSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    type: { 
      type: String, 
      required: true, 
      enum: ["Dog", "Cat", "Rabbit", "Bird", "Other"], 
    }, // New field for pet type
    breed: { type: String, required: true },
    age: { type: Number, required: true },
    certificateUrl: { type: String, required: true },
    imageUrls: { type: [String], default: [] },
    ownerId: { type: String, required: true }, // Firebase UID
  },
  { timestamps: true }
);

export default mongoose.models.Pet || mongoose.model("Pet", PetSchema);

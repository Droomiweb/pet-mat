// app/models/PetModel.js
import mongoose from "mongoose";

const petSchema = new mongoose.Schema({
  name: String,
  type: String,
  age: Number,
  breed: String,
  certificateUrl: String,
  imageUrls: [String],
  ownerId: String,
  // New field for certificate verification status
  verificationStatus: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
  // NEW FIELD for pet banning
  isBanned: { type: Boolean, default: false },
  matingHistory: [
    {
      requesterId: String,
      requesterName: String,
      status: { type: String, default: "pending" },
      requestedAt: { type: Date, default: Date.now }
    }
  ],
  messages: [
    {
      senderId: String,
      senderName: String,
      text: String,
      sentAt: { type: Date, default: Date.now }
    }
  ]
});

const Pet = mongoose.models.Pet || mongoose.model("Pet", petSchema);
export default Pet;
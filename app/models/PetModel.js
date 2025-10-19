import mongoose from "mongoose";

const petSchema = new mongoose.Schema({
  name: String,
  type: String,
  age: Number,
  breed: String,
  // ADDED: Gender field (from previous step)
  gender: { type: String, enum: ['Male', 'Female'], required: true },
  certificateUrl: String,
  imageUrls: [String],
  ownerId: String,
  
  // NEW FIELD: Certificate verification status for moderation
  verificationStatus: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
  // NEW FIELD: Pet banning flag for moderation
  isBanned: { type: Boolean, default: false },

  matingHistory: [
    {
      requesterId: String,
      requesterName: String,
      status: { type: String, default: "pending" }, // pending/accepted/rejected
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
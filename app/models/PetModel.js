import mongoose from "mongoose";

const petSchema = new mongoose.Schema({
  name: String,
  type: String,
  age: Number,
  breed: String,
  certificateUrl: String,
  imageUrls: [String],
  ownerId: String,
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

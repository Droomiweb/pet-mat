import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  senderId: String,
  senderName: String,
  text: String,
  timestamp: { type: Date, default: Date.now },
});

const matingRequestSchema = new mongoose.Schema({
  requesterId: String,
  requesterName: String,
  status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending" },
  timestamp: { type: Date, default: Date.now },
});

const petSchema = new mongoose.Schema({
  name: String,
  type: String,
  age: Number,
  breed: String,
  ownerId: String,
  imageUrls: [String],
  certificateUrl: String,
  messages: [messageSchema], // for chat
  matingHistory: [matingRequestSchema], // track mating requests
});

const Pet = mongoose.models.Pet || mongoose.model("Pet", petSchema);
export default Pet;

// app/models/PetModel.js
import mongoose from "mongoose";

const petSchema = new mongoose.Schema({
  name: String,
  type: String,
  age: Number,
  breed: String,
  gender: { type: String, enum: ['Male', 'Female'], required: true },
  
  temperament: { 
    type: String, 
    enum: ['Calm', 'Playful', 'Shy', 'Friendly', 'Energetic', 'Independent', 'Curious', 'Other'], 
    default: 'Other' 
  },
  energyLevel: { 
    type: String, 
    enum: ['Low', 'Medium', 'High'], 
    default: 'Medium' 
  },
  listingType: {
    type: String,
    enum: ['Mating', 'Adoption'],
    default: 'Mating',
    required: true
  },
  
  // --- NEW FIELDS FOR PEDIGREE ---
  damId: { // Mother's ID
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pet',
    default: null
  },
  sireId: { // Father's ID
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pet',
    default: null
  },
  // --- END NEW FIELDS ---

  certificateUrl: String,
  imageUrls: [String],
  ownerId: String,
  
  verificationStatus: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
  isBanned: { type: Boolean, default: false },

  matingHistory: [
    {
      requesterId: String,
      requesterName: String,
      requesterPetId: String,
      requesterPetName: String,
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
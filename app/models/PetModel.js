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
  
  // --- Pedigree Fields ---
  damId: { // Mother's MONGO ID
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pet',
    default: null
  },
  sireId: { // Father's MONGO ID
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pet',
    default: null
  },
  
  // --- Blockchain Fields ---
  nftTokenId: { 
    type: Number,
    default: null,
    index: true 
  },
  nftContractAddress: { 
    type: String,
    default: null
  },
  // --- End Blockchain Fields ---

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
  ],
  
  // --- NEW FIELD FOR ADOPTION ---
  adoptionRequests: [
    {
      requesterId: String,
      requesterName: String,
      message: String,
      status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
      requestedAt: { type: Date, default: Date.now }
    }
  ]
  // --- END NEW FIELD ---
});

// This line adds the geospatial index
petSchema.index({ location: '2dsphere' });

const Pet = mongoose.models.Pet || mongoose.model("Pet", petSchema);
export default Pet;
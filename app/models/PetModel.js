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
  damId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pet', default: null },
  sireId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pet', default: null },
  
  // --- Blockchain Fields ---
  nftTokenId: { type: Number, default: null, index: true },
  nftContractAddress: { type: String, default: null },

  certificateUrl: String,
  imageUrls: [String],
  ownerId: String,
  
  // --- NEW: Pregnancy Status ---
  isPregnant: { type: Boolean, default: false },

  // --- UPDATED: Verification Status ---
  verificationStatus: { 
    type: String, 
    enum: ['pending', 'verified', 'rejected', 'needs-review'], // 'needs-review' for AI uncertainty
    default: 'pending' 
  },
  
  // --- NEW: Auto-Verification Details ---
  // Stores the results from the automated process
  verificationAnalysis: {
    ocrText: { type: String, default: null },
    aiResponse: { type: String, default: null },
    // 'pending', 'auto-verified', 'auto-rejected', 'needs-review'
    aiStatus: { type: String, default: 'pending' }, 
  },
  
  isBanned: { type: Boolean, default: false },

  // --- UPDATED: Mating History ---
  matingHistory: [
    {
      requesterId: String,
      requesterName: String,
      requesterPetId: String,
      requesterPetName: String,
      // 'accepted' now means chat is open, 'mated' is the new goal
      status: { 
        type: String, 
        enum: ['pending', 'accepted', 'rejected', 'ownerConfirmedMating', 'requesterConfirmedMating', 'mated', 'completed'], 
        default: "pending" 
      }, 
      requestedAt: { type: Date, default: Date.now },
      // --- NEW: Fields for mutual 'mated' confirmation ---
      ownerMatedConfirmation: { type: Boolean, default: false },
      requesterMatedConfirmation: { type: Boolean, default: false }
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
  
  // --- UPDATED: Adoption Requests ---
  // Schema is unchanged, but API logic will be
  adoptionRequests: [
    {
      requesterId: String,
      requesterName: String,
      message: String,
      status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
      requestedAt: { type: Date, default: Date.now }
    }
  ]
});

// This line adds the geospatial index
petSchema.index({ location: '2dsphere' });

const Pet = mongoose.models.Pet || mongoose.model("Pet", petSchema);
export default Pet;
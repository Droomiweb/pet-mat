// app/models/PetModel.js
import mongoose from "mongoose";

// Define sub-schemas to ensure they get _id and timestamps
const MatingRequestSchema = new mongoose.Schema({
  requesterId: String,
  requesterName: String,
  requesterPetId: String,
  requesterPetName: String,
  status: { type: String, default: 'pending' },
  requestedAt: { type: Date, default: Date.now },
  // Confirmation flags
  ownerMatedConfirmation: { type: Boolean, default: false },
  requesterMatedConfirmation: { type: Boolean, default: false }
});

const MessageSchema = new mongoose.Schema({
  senderId: String,
  senderName: String,
  text: String,
  sentAt: { type: Date, default: Date.now }
});

const AdoptionRequestSchema = new mongoose.Schema({
  requesterId: String,
  requesterName: String,
  message: String,
  status: { type: String, default: 'pending' },
  requestedAt: { type: Date, default: Date.now }
});

const petSchema = new mongoose.Schema({
  name: String,
  type: String,
  age: Number,
  breed: String,
  gender: { type: String, enum: ['Male', 'Female'], required: true },
  
  temperament: { 
    type: String, 
    enum: ['Calm', 'Playful', 'Shy', 'Friendly', 'Energetic', 'Independent', 'Curious', 'Other'], 
    default: 'Friendly'
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
  
  damId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pet', default: null },
  sireId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pet', default: null },
  
  nftTokenId: { type: Number, default: null, index: true },
  nftContractAddress: { type: String, default: null },

  certificateUrl: String,
  imageUrls: [String],
  ownerId: String,
  
  isPregnant: { type: Boolean, default: false },

  verificationStatus: { 
    type: String, 
    enum: ['pending', 'verified', 'rejected', 'needs-review'],
    default: 'pending' 
  },
  
  verificationAnalysis: {
    ocrText: { type: String, default: null },
    aiResponse: { type: String, default: null },
    aiStatus: { type: String, default: 'pending' }, 
  },

  aiProfileString: { type: String, default: null, index: true },
  
  isBanned: { type: Boolean, default: false },

  // Use defined schemas
  matingHistory: [MatingRequestSchema],
  messages: [MessageSchema],
  adoptionRequests: [AdoptionRequestSchema]
});

petSchema.index({ location: '2dsphere' });

const Pet = mongoose.models.Pet || mongoose.model("Pet", petSchema);
export default Pet;
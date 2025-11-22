// app/models/PetModel.js
import mongoose from "mongoose";

// --- Vaccination Sub-schema ---
const VaccinationSchema = new mongoose.Schema({
  vaccineName: { type: String, required: true },
  vaccinationDate: { type: Date, required: true }, 
  expiryDate: { type: Date, required: true },     
  status: { type: String, enum: ['active', 'expired', 'upcoming', 'needs-review'], default: 'active' }, 
});

// --- Certificate Analysis Sub-schema ---
const CertificateAnalysisSchema = new mongoose.Schema({
  certificateUrl: String,
  extractedOwnerName: String,
  extractedPetName: String,
  aiOcrText: String, 
  ownerNameMatch: { type: Boolean, default: false },
  status: { 
    type: String, 
    enum: ['pending', 'verified', 'rejected', 'needs-review', 'ai-error'],
    default: 'pending' 
  },
  reason: String, 
});

// --- NEW: Pregnancy Day Plan Schema ---
const PregnancyDaySchema = new mongoose.Schema({
  day: Number,
  food: String,
  activity: String,
  careTips: String,
  warningSigns: String
});

const MatingRequestSchema = new mongoose.Schema({
  requesterId: String,
  requesterName: String,
  requesterPetId: String,
  requesterPetName: String,
  status: { type: String, default: 'pending' },
  requestedAt: { type: Date, default: Date.now },
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
  
  verificationStatus: { 
    type: String, 
    enum: ['pending', 'verified', 'rejected', 'needs-review'],
    default: 'pending' 
  },
  
  certificateAnalysis: { type: CertificateAnalysisSchema, default: {} },
  vaccinationHistory: [VaccinationSchema],

  imageUrls: [String],
  ownerId: String,
  
  // --- UPDATED PREGNANCY FIELDS ---
  isPregnant: { type: Boolean, default: false },
  pregnancyStartDate: { type: Date, default: null }, // When user clicked "Confirm Pregnancy"
  pregnancyPlan: [PregnancyDaySchema], // Stores the AI generated daily plan
  // --------------------------------

  aiProfileString: { type: String, default: null, index: true },
  medicalHistoryLog: { type: String, default: "No medical history recorded yet." },
  
  isBanned: { type: Boolean, default: false },

  matingHistory: [MatingRequestSchema],
  messages: [MessageSchema],
  adoptionRequests: [AdoptionRequestSchema]
});

petSchema.index({ location: '2dsphere' });

const Pet = mongoose.models.Pet || mongoose.model("Pet", petSchema);
export default Pet;
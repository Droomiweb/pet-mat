// app/models/PetModel.js
import mongoose from "mongoose";

const VaccinationSchema = new mongoose.Schema({
  vaccineName: { type: String, required: true },
  vaccinationDate: { type: Date, required: true },
  expiryDate: { type: Date, required: true },
  status: { type: String, enum: ['active', 'expired', 'upcoming', 'needs-review'], default: 'active' },
});

const CertificateAnalysisSchema = new mongoose.Schema({
  certificateUrl: String,
  extractedOwnerName: String,
  extractedPetName: String,
  aiOcrText: String,
  ownerNameMatch: { type: Boolean, default: false },
  status: {
    type: String,
    enum: ['pending', 'verified', 'rejected', 'needs-review', 'ai-error', 'fallback-verified', 'fallback-check'],
    default: 'pending'
  },
  reason: String,
});

const AdoptionLogSchema = new mongoose.Schema({
  previousOwnerId: String,
  previousOwnerName: String,
  newOwnerId: String,
  newOwnerName: String,
  adoptionDate: { type: Date, default: Date.now },
  certificateId: String
});

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
  answers: [{
    question: String,
    answer: String
  }],
  status: { type: String, default: 'pending' },
  requestedAt: { type: Date, default: Date.now },
  ownerConfirmedHandover: { type: Boolean, default: false },
  requesterConfirmedHandover: { type: Boolean, default: false }
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
    enum: ['Mating', 'Adoption', 'None'],
    default: 'Mating',
    required: true
  },

  // --- LINEAGE FIELDS ---
  damId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pet', default: null },
  sireId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pet', default: null },
  damName: { type: String, default: null },
  sireName: { type: String, default: null },

  // --- NEW: LOST & FOUND FIELDS ---
  isLost: { type: Boolean, default: false },
  lastSeenDate: { type: Date, default: null },
  lastSeenLocation: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] } // [lng, lat]
  },
  // ---------------------------------

  nftTokenId: { type: Number, default: null, index: true },
  nftContractAddress: { type: String, default: null },

  certificateUrl: String,

  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected', 'needs-review', 'ai-error', 'fallback-verified', 'fallback-check'],
    default: 'pending'
  },

  certificateAnalysis: { type: CertificateAnalysisSchema, default: {} },
  vaccinationHistory: [VaccinationSchema],

  imageUrls: [String],
  ownerId: String,

  isPregnant: { type: Boolean, default: false },
  pregnancyStartDate: { type: Date, default: null },
  pregnancyPlan: [PregnancyDaySchema],

  aiProfileString: { type: String, default: null, index: true },
  medicalHistoryLog: { type: String, default: "No medical history recorded yet." },

  isBanned: { type: Boolean, default: false },

  matingHistory: [MatingRequestSchema],
  messages: [MessageSchema],
  adoptionRequests: [AdoptionRequestSchema],

  adoptionLog: AdoptionLogSchema,

  // --- NEW: CACHED MATCHES ---
  cachedMatches: {
    data: [{
      petId: String,
      compatibilityScore: Number,
      matchReason: String
    }],
    lastUpdated: { type: Date, default: null }
  },

  // --- PRETTY URL SLUG ---
  slug: { type: String, unique: true, sparse: true, index: true }
});

// === UPGRADE: Performance Indexes ===
// Adding indexes significantly speeds up common queries
petSchema.index({ ownerId: 1 });
petSchema.index({ type: 1 });
petSchema.index({ breed: 1 });
petSchema.index({ listingType: 1 });
petSchema.index({ verificationStatus: 1 });
petSchema.index({ isLost: 1 });
// Composite index for common filtering combo
petSchema.index({ type: 1, breed: 1, listingType: 1 });
// ------------------------------------

petSchema.index({ lastSeenLocation: '2dsphere' });

const Pet = mongoose.models.Pet || mongoose.model("Pet", petSchema);
export default Pet;
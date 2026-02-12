import mongoose from 'mongoose';

const AIInteractionSchema = new mongoose.Schema({
  model: {
    type: String,
    required: true,
    index: true 
  },
  endpoint: {
    type: String, // 'chat', 'generate', 'vision', etc.
    required: true
  },
  input: {
    type: String, // Truncated if necessary, or full prompt
    required: true
  },
  output: {
    type: String,
    required: false
  },
  status: {
    type: String,
    enum: ['Success', 'Failed'],
    default: 'Success',
    index: true
  },
  cost: {
    type: Number, // Estimated cost (optional)
    default: 0
  },
  tokens: {
    prompt: Number,
    completion: Number,
    total: Number
  },
  metadata: {
    userId: String, // If available
    latencyMs: Number,
    error: String,
    tags: [String] // e.g. ['pregnancy-tracker', 'pet-vision']
  }
}, { timestamps: true });

// Index for frequent queries
AIInteractionSchema.index({ createdAt: -1 });
AIInteractionSchema.index({ status: 1, createdAt: -1 });

export default mongoose.models.AIInteraction || mongoose.model('AIInteraction', AIInteractionSchema);

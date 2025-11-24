import mongoose from "mongoose";

const ForumPostSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  content: { type: String, required: true },
  authorId: { type: String, required: true },
  authorName: { type: String, required: true },
  
  // --- NEW: Media Fields ---
  mediaUrl: { type: String, default: null },
  mediaType: { type: String, enum: ['image', 'video', 'none'], default: 'none' },
  
  // --- NEW: Interaction Fields ---
  likes: [{ type: String }], // Array of User IDs who liked
  shares: { type: Number, default: 0 },
  
  replies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ForumReply'
  }]
}, { timestamps: true });

const ForumPost = mongoose.models.ForumPost || mongoose.model("ForumPost", ForumPostSchema);
export default ForumPost;
// app/models/ForumReply.js
import mongoose from "mongoose";

const ForumReplySchema = new mongoose.Schema({
  postId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'ForumPost', 
    required: true 
  },
  content: { type: String, required: true },
  authorId: { type: String, required: true },
  authorName: { type: String, required: true },
}, { timestamps: true });

const ForumReply = mongoose.models.ForumReply || mongoose.model("ForumReply", ForumReplySchema);
export default ForumReply;
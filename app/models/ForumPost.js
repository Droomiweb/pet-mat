// app/models/ForumPost.js
import mongoose from "mongoose";

const ForumPostSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  content: { type: String, required: true },
  authorId: { type: String, required: true },
  authorName: { type: String, required: true },
  replies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ForumReply'
  }]
}, { timestamps: true });

const ForumPost = mongoose.models.ForumPost || mongoose.model("ForumPost", ForumPostSchema);
export default ForumPost;
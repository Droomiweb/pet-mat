// app/api/community/replies/route.js
import connectDB from "../../../lib/mongodb";
import ForumPost from "../../../models/ForumPost";
import ForumReply from "../../../models/ForumReply";

// POST a new reply to a post
export async function POST(req) {
  try {
    await connectDB();
    const { postId, content, authorId, authorName } = await req.json();

    if (!postId || !content || !authorId || !authorName) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
    }

    // 1. Find the parent post
    const post = await ForumPost.findById(postId);
    if (!post) {
      return new Response(JSON.stringify({ error: "Post not found" }), { status: 404 });
    }

    // 2. Create the new reply
    const newReply = new ForumReply({
      postId,
      content,
      authorId,
      authorName
    });
    await newReply.save();

    // 3. Add the reply's ID to the parent post's `replies` array
    post.replies.push(newReply._id);
    await post.save();

    return new Response(JSON.stringify({ message: "Reply added!", reply: newReply }), { status: 201 });
  } catch (err) {
    console.error("Error adding reply:", err);
    return new Response(JSON.stringify({ error: "Failed to add reply" }), { status: 500 });
  }
}
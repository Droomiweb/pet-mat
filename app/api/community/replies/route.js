// app/api/community/reply/route.js

// Standard imports
import connectDB from "../../../lib/mongodb";
import ForumPost from "../../../models/ForumPost";
import ForumReply from "../../../models/ForumReply"; 

// POST request handler
export async function POST(req) {
  try {
    await connectDB();
    
    // Parse request body
    const { postId, content, authorId, authorName } = await req.json();

    // Validate required fields
    if (!postId || !content || !authorId || !authorName) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
    }

    // Verify parent post
    const post = await ForumPost.findById(postId);
    if (!post) {
      return new Response(JSON.stringify({ error: "Post not found" }), { status: 404 });
    }

    // Create reply document
    const newReply = new ForumReply({
      postId,
      content,
      authorId,
      authorName
    });
    
    await newReply.save();

    // Link to post
    post.replies.push(newReply._id);
    await post.save();

    // Return success response
    return new Response(JSON.stringify({ message: "Reply added!", reply: newReply }), { status: 201 });

  } catch (err) {
    console.error("Error adding reply:", err);
    return new Response(JSON.stringify({ error: "Failed to add reply" }), { status: 500 });
  }
}
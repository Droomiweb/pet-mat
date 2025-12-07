// app/api/community/reply/route.js

// 1. IMPORTS
import connectDB from "../../../lib/mongodb";
import ForumPost from "../../../models/ForumPost";
import ForumReply from "../../../models/ForumReply"; 

// 2. POST HANDLER (Create New Reply)
export async function POST(req) {
  try {
    await connectDB();
    
    // Parse the request body
    // We need the ID of the post being replied to, the text content, and the author's details.
    const { postId, content, authorId, authorName } = await req.json();

    // 3. VALIDATION
    // Fail fast if any critical data is missing.
    if (!postId || !content || !authorId || !authorName) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
    }

    // 4. VERIFY PARENT POST
    // Ensure the post we are replying to actually exists.
    const post = await ForumPost.findById(postId);
    if (!post) {
      return new Response(JSON.stringify({ error: "Post not found" }), { status: 404 });
    }

    // 5. CREATE REPLY DOCUMENT
    // This saves the comment into its own collection ('forumreplies').
    const newReply = new ForumReply({
      postId,
      content,
      authorId,
      authorName
      // 'createdAt' is handled automatically by timestamps: true in the Schema
    });
    
    await newReply.save();

    // 6. LINK TO PARENT POST
    // We update the parent post's 'replies' array to include this new ID.
    // This creates the relationship needed for the UI to display "3 comments".
    post.replies.push(newReply._id);
    await post.save();

    // 7. SUCCESS RESPONSE
    return new Response(JSON.stringify({ message: "Reply added!", reply: newReply }), { status: 201 });

  } catch (err) {
    console.error("Error adding reply:", err);
    return new Response(JSON.stringify({ error: "Failed to add reply" }), { status: 500 });
  }
}
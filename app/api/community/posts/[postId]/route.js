// app/api/community/[postId]/route.js

// 1. IMPORTS
import connectDB from "../../../../lib/mongodb";
import ForumPost from "../../../../models/ForumPost";
// We need the Reply model to populate comments and handle deletions
import ForumReply from "../../../../models/ForumReply"; 

// 2. GET HANDLER (Fetch Single Post + Comments)
export async function GET(req, context) {
  try {
    await connectDB();
    
    // Extract the dynamic 'postId' from the URL
    const { postId } = context.params;

    // 3. POPULATION LOGIC
    // Find the post and "join" it with the Replies collection.
    // This turns an array of IDs ["123", "456"] into an array of objects [{text: "Hi", ...}, {text: "Cool", ...}]
    const post = await ForumPost.findById(postId)
      .populate({
        path: 'replies',
        model: ForumReply,
        options: { sort: { 'createdAt': 1 } } // Sort replies: Oldest first (Chronological)
      }).lean();

    if (!post) {
        return new Response(JSON.stringify({ error: "Post not found" }), { status: 404 });
    }

    // Defensive coding: Ensure 'likes' is always an array to prevent frontend crashes
    const safePost = {
        ...post,
        likes: post.likes || []
    };

    return new Response(JSON.stringify(safePost), { status: 200 });
  } catch (err) {
    console.error("Fetch Post Error:", err);
    return new Response(JSON.stringify({ error: "Failed to fetch post" }), { status: 500 });
  }
}

// 4. PATCH HANDLER (Likes & Shares)
export async function PATCH(req, context) {
    try {
        await connectDB();
        const { postId } = context.params;
        // We need 'action' to know what to do, and 'userId' to know who is doing it
        const { action, userId } = await req.json(); 

        const post = await ForumPost.findById(postId);
        if (!post) return new Response(JSON.stringify({ error: "Post not found" }), { status: 404 });

        // --- ACTION: LIKE ---
        if (action === 'like') {
            // Check if user has already liked the post
            if (post.likes.includes(userId)) {
                // UNLIKE: Remove user ID from array
                post.likes = post.likes.filter(id => id !== userId); 
            } else {
                // LIKE: Add user ID to array
                post.likes.push(userId); 
            }
        
        // --- ACTION: SHARE ---
        } else if (action === 'share') {
            // Simple counter increment
            post.shares += 1;
        }

        // Save the updated document
        await post.save();

        // Return the new counts so the UI updates instantly without refreshing
        return new Response(JSON.stringify({ 
            message: "Updated", 
            likes: post.likes, 
            shares: post.shares 
        }), { status: 200 });

    } catch (err) {
        console.error("Update Error:", err);
        return new Response(JSON.stringify({ error: "Update failed" }), { status: 500 });
    }
}

// 5. DELETE HANDLER (Delete Post)
export async function DELETE(req, context) {
  try {
    await connectDB();
    const { postId } = context.params;
    
    // Security: The body must contain the ID of the person trying to delete.
    // In a real production app, you'd get this from a secure HTTP-Only cookie or header token.
    const { userId } = await req.json(); 

    const post = await ForumPost.findById(postId);
    if (!post) return new Response(JSON.stringify({ error: "Post not found" }), { status: 404 });

    // 6. OWNERSHIP CHECK
    // Prevent random users from deleting other people's posts via Postman/API calls.
    if (post.authorId !== userId) {
        return new Response(JSON.stringify({ error: "Unauthorized: You do not own this post" }), { status: 403 });
    }

    // 7. CASCADING DELETE
    // Before deleting the post, delete all comments (replies) linked to it.
    // This keeps the database clean.
    await ForumReply.deleteMany({ _id: { $in: post.replies } });

    // Finally, delete the post itself.
    await ForumPost.findByIdAndDelete(postId);

    return new Response(JSON.stringify({ message: "Post deleted successfully" }), { status: 200 });

  } catch (err) {
    console.error("Delete Error:", err);
    return new Response(JSON.stringify({ error: "Failed to delete post" }), { status: 500 });
  }
}
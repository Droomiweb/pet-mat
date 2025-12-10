// app/api/community/[postId]/route.js

// Standard imports
import connectDB from "../../../../lib/mongodb";
import ForumPost from "../../../../models/ForumPost";
// Import Reply model
import ForumReply from "../../../../models/ForumReply"; 

// GET request handler
export async function GET(req, context) {
  try {
    await connectDB();
    
    // Extract postId
    const { postId } = context.params;

    // Fetch and populate
    const post = await ForumPost.findById(postId)
      .populate({
        path: 'replies',
        model: ForumReply,
        options: { sort: { 'createdAt': 1 } } // Sort replies chronologically
      }).lean();

    if (!post) {
        return new Response(JSON.stringify({ error: "Post not found" }), { status: 404 });
    }

    // Sanitize likes array
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

// PATCH request handler
export async function PATCH(req, context) {
    try {
        await connectDB();
        const { postId } = context.params;
        // Parse request action
        const { action, userId } = await req.json(); 

        const post = await ForumPost.findById(postId);
        if (!post) return new Response(JSON.stringify({ error: "Post not found" }), { status: 404 });

        // Handle likes
        if (action === 'like') {
            // Toggle like status
            if (post.likes.includes(userId)) {
                // Remove like
                post.likes = post.likes.filter(id => id !== userId); 
            } else {
                // Add like
                post.likes.push(userId); 
            }
        
        // Handle shares
        } else if (action === 'share') {
            // Increment share count
            post.shares += 1;
        }

        // Save changes
        await post.save();

        // Return updated counts
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

// DELETE request handler
export async function DELETE(req, context) {
  try {
    await connectDB();
    const { postId } = context.params;
    
    // Get user ID
    const { userId } = await req.json(); 

    const post = await ForumPost.findById(postId);
    if (!post) return new Response(JSON.stringify({ error: "Post not found" }), { status: 404 });

    // Verify ownership
    if (post.authorId !== userId) {
        return new Response(JSON.stringify({ error: "Unauthorized: You do not own this post" }), { status: 403 });
    }

    // Delete related replies
    await ForumReply.deleteMany({ _id: { $in: post.replies } });

    // Delete post document
    await ForumPost.findByIdAndDelete(postId);

    return new Response(JSON.stringify({ message: "Post deleted successfully" }), { status: 200 });

  } catch (err) {
    console.error("Delete Error:", err);
    return new Response(JSON.stringify({ error: "Failed to delete post" }), { status: 500 });
  }
}
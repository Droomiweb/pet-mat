import connectDB from "../../../../lib/mongodb";
import ForumPost from "../../../../models/ForumPost";
import ForumReply from "../../../../models/ForumReply";

// GET single post
export async function GET(req, context) {
  try {
    await connectDB();
    const { postId } = context.params;
    const post = await ForumPost.findById(postId)
      .populate({
        path: 'replies',
        model: ForumReply,
        options: { sort: { 'createdAt': 1 } } 
      }).lean();

    if (!post) return new Response(JSON.stringify({ error: "Post not found" }), { status: 404 });

    // Ensure likes is an array
    const safePost = {
        ...post,
        likes: post.likes || []
    };

    return new Response(JSON.stringify(safePost), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Failed to fetch post" }), { status: 500 });
  }
}

// PATCH: Handle Likes and Shares
export async function PATCH(req, context) {
    try {
        await connectDB();
        const { postId } = context.params;
        const { action, userId } = await req.json(); 

        const post = await ForumPost.findById(postId);
        if (!post) return new Response(JSON.stringify({ error: "Post not found" }), { status: 404 });

        if (action === 'like') {
            // Toggle Like
            if (post.likes.includes(userId)) {
                post.likes = post.likes.filter(id => id !== userId); 
            } else {
                post.likes.push(userId); 
            }
        } else if (action === 'share') {
            post.shares += 1;
        }

        await post.save();
        return new Response(JSON.stringify({ 
            message: "Updated", 
            likes: post.likes, 
            shares: post.shares 
        }), { status: 200 });

    } catch (err) {
        return new Response(JSON.stringify({ error: "Update failed" }), { status: 500 });
    }
}

// --- NEW: DELETE Post ---
export async function DELETE(req, context) {
  try {
    await connectDB();
    const { postId } = context.params;
    const { userId } = await req.json(); // We need userId to verify ownership

    const post = await ForumPost.findById(postId);
    if (!post) return new Response(JSON.stringify({ error: "Post not found" }), { status: 404 });

    // Verify Ownership
    if (post.authorId !== userId) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 403 });
    }

    // Delete all replies associated with this post
    await ForumReply.deleteMany({ _id: { $in: post.replies } });

    // Delete the post itself
    await ForumPost.findByIdAndDelete(postId);

    return new Response(JSON.stringify({ message: "Post deleted successfully" }), { status: 200 });

  } catch (err) {
    console.error("Delete Error:", err);
    return new Response(JSON.stringify({ error: "Failed to delete post" }), { status: 500 });
  }
}
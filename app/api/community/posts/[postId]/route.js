// app/api/community/posts/[postId]/route.js
import connectDB from "../../../../lib/mongodb";
import ForumPost from "../../../../models/ForumPost";
import ForumReply from "../../../../models/ForumReply";

// GET a single post and its replies
export async function GET(req, context) {
  try {
    await connectDB();
    const { postId } = context.params;

    if (!postId) {
      return new Response(JSON.stringify({ error: "Post ID required" }), { status: 400 });
    }

    // Find the post and populate its replies
    const post = await ForumPost.findById(postId)
      .populate({
        path: 'replies',
        model: ForumReply,
        options: { sort: { 'createdAt': 1 } } // Show oldest replies first (chronological)
      })
      .lean();

    if (!post) {
      return new Response(JSON.stringify({ error: "Post not found" }), { status: 404 });
    }

    return new Response(JSON.stringify(post), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error fetching single post:", err);
    return new Response(JSON.stringify({ error: "Failed to fetch post" }), { status: 500 });
  }
}
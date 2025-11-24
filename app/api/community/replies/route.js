import connectDB from "../../../../lib/mongodb";
import ForumPost from "../../../../models/ForumPost";
import ForumReply from "../../../../models/ForumReply";

export async function DELETE(req, context) {
  try {
    await connectDB();
    const { replyId } = context.params;
    const { userId } = await req.json(); // Security check

    const reply = await ForumReply.findById(replyId);
    if (!reply) return new Response(JSON.stringify({ error: "Reply not found" }), { status: 404 });

    // Verify Ownership
    if (reply.authorId !== userId) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 403 });
    }

    // 1. Remove reference from Parent Post
    await ForumPost.findByIdAndUpdate(reply.postId, {
        $pull: { replies: replyId }
    });

    // 2. Delete the Reply document
    await ForumReply.findByIdAndDelete(replyId);

    return new Response(JSON.stringify({ message: "Reply deleted" }), { status: 200 });

  } catch (err) {
    console.error("Delete Reply Error:", err);
    return new Response(JSON.stringify({ error: "Failed to delete reply" }), { status: 500 });
  }
}
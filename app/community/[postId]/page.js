// app/community/[postId]/page.js
"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter} from "next/navigation";
import { useAuth } from "../../auth-provider";
import Link from "next/link";

export default function SinglePostPage() {
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [replyContent, setReplyContent] = useState("");
  const [replyLoading, setReplyLoading] = useState(false);
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();

  const fetchPost = async () => {
    try {
      const res = await fetch(`/api/community/posts/${params.postId}`);
      if (!res.ok) {
        return router.push("/community");
      }
      const data = await res.json();
      setPost(data);
    } catch (err) {
      console.error("Error fetching post:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (params.postId) {
      fetchPost();
    }
  }, [params.postId]);

  const handleReplySubmit = async (e) => {
    e.preventDefault();
    if (!user) return router.push("/Login");
    if (!replyContent.trim()) return;

    setReplyLoading(true);
    try {
      const res = await fetch("/api/community/replies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: params.postId,
          content: replyContent,
          authorId: user.uid,
          authorName: user.email.split("@")[0]
        }),
      });

      if (res.ok) {
        setReplyContent("");
        fetchPost(); // Refresh post and replies
      } else {
        alert("Failed to post reply.");
      }
    } catch (err) {
      console.error("Error posting reply:", err);
    } finally {
      setReplyLoading(false);
    }
  };

  if (loading) {
    return <p className="text-[#333333] text-center mt-20 text-xl">Loading discussion...</p>;
  }

  if (!post) {
    return <p className="text-[#333333] text-center mt-20 text-xl">Post not found.</p>;
  }

  return (
    <div className="min-h-screen bg-[#F4F7F9] p-4 md:p-10">
      <div className="max-w-4xl mx-auto">
        <div className="mb-4">
          <Link href="/community" className="text-[#4A90E2] font-semibold hover:underline">
            &larr; Back to All Discussions
          </Link>
        </div>

        {/* Original Post */}
        <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-10 mb-8 border-t-4 border-[#4A90E2]">
          <h1 className="text-3xl font-extrabold text-[#333333] mb-3">{post.title}</h1>
          <div className="text-sm text-gray-500 mb-4 border-b pb-3">
            Posted by <span className="font-semibold">{post.authorName}</span> on {new Date(post.createdAt).toLocaleString()}
          </div>
          <p className="text-primary leading-relaxed whitespace-pre-wrap">{post.content}</p>
        </div>

        {/* Replies */}
        <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-10 mb-8">
          <h2 className="text-2xl font-bold text-[#333333] mb-6">
            Replies ({post.replies.length})
          </h2>
          <div className="space-y-5">
            {post.replies.map(reply => (
              <div key={reply._id} className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-primary mb-2">{reply.content}</p>
                <div className="text-xs text-gray-500 flex justify-between">
                  <span className="font-semibold">{reply.authorName}</span>
                  <span>{new Date(reply.createdAt).toLocaleString()}</span>
                </div>
              </div>
            ))}
            {post.replies.length === 0 && (
              <p className="text-gray-500 text-center py-4">Be the first to reply!</p>
            )}
          </div>
        </div>

        {/* Add Reply Form */}
        <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-10">
          <form onSubmit={handleReplySubmit}>
            <h2 className="text-2xl font-bold text-[#4A90E2] mb-4">Add Your Reply</h2>
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Write your reply here..."
              className="input-style w-full min-h-[120px] mb-4"
              rows="4"
              disabled={!user}
            />
            <button
              type="submit"
              disabled={replyLoading || !user}
              className="btn-primary"
            >
              {replyLoading ? "Posting..." : "Post Reply"}
            </button>
            {!user && (
              <p className="text-red-500 text-sm mt-2">You must be <Link href="/Login" className="underline">logged in</Link> to reply.</p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
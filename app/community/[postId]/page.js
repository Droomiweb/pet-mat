// app/community/[postId]/page.js
"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
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
      if (!res.ok) return router.push("/community");
      const data = await res.json();
      setPost(data);
    } catch (err) {
      console.error("Error fetching post:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (params.postId) fetchPost();
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
        fetchPost(); 
      }
    } catch (err) { console.error(err); } 
    finally { setReplyLoading(false); }
  };

  if (loading) return <div className="flex justify-center pt-20"><div className="loader"></div></div>;
  if (!post) return <p className="text-center mt-20">Post not found.</p>;

  return (
    <div className="min-h-screen bg-[#F4F7F9] p-4 md:p-10">
      <div className="max-w-4xl mx-auto">
        
        {/* Back Button */}
        <Link href="/community" className="inline-flex items-center text-gray-500 hover:text-[#4A90E2] font-bold mb-6 transition-colors">
          &larr; Back to Discussions
        </Link>

        {/* --- Main Post --- */}
        <div className="bg-white rounded-3xl shadow-lg p-8 mb-8 border-t-8 border-[#4A90E2]">
          <div className="flex items-center gap-3 mb-4 text-sm text-gray-500">
            <div className="w-10 h-10 bg-[#4A90E2] text-white rounded-full flex items-center justify-center text-lg font-bold uppercase">
              {post.authorName[0]}
            </div>
            <div>
              <span className="block font-bold text-gray-800">{post.authorName}</span>
              <span className="text-xs">{new Date(post.createdAt).toLocaleString()}</span>
            </div>
          </div>

          <h1 className="text-3xl font-extrabold text-[#333333] mb-6 leading-tight">{post.title}</h1>
          <div className="text-gray-700 leading-relaxed whitespace-pre-wrap text-lg border-t border-gray-100 pt-6">
            {post.content}
          </div>
        </div>

        {/* --- Replies Section --- */}
        <div className="mb-10">
          <h3 className="text-xl font-bold text-[#333333] mb-4 flex items-center gap-2">
            Replies <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full text-sm">{post.replies.length}</span>
          </h3>

          <div className="space-y-4">
            {post.replies.length === 0 ? (
              <div className="bg-white/50 p-8 rounded-2xl text-center text-gray-500 border-2 border-dashed border-gray-200">
                No replies yet. Be the first to help!
              </div>
            ) : (
              post.replies.map((reply) => (
                <div key={reply._id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-[#4A90E2]">{reply.authorName}</span>
                    <span className="text-xs text-gray-400">{new Date(reply.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-gray-700 leading-relaxed">{reply.content}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* --- Reply Box --- */}
        <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8 sticky bottom-6 border border-gray-100">
          {user ? (
            <form onSubmit={handleReplySubmit}>
              <label className="block font-bold text-gray-700 mb-2">Add your reply</label>
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Type your helpful response here..."
                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#50E3C2] focus:ring-2 focus:ring-teal-50 outline-none transition-all min-h-[100px] mb-4"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={replyLoading || !replyContent.trim()}
                  className="bg-[#50E3C2] hover:bg-[#3FCCB4] text-[#333333] font-bold py-3 px-8 rounded-xl shadow-md transition-transform transform active:scale-95 disabled:opacity-50 disabled:scale-100"
                >
                  {replyLoading ? "Posting..." : "Post Reply"}
                </button>
              </div>
            </form>
          ) : (
            <div className="flex items-center justify-between bg-blue-50 p-4 rounded-xl border border-blue-100">
              <p className="text-blue-800 font-medium">Log in to join the conversation.</p>
              <Link href="/Login" className="bg-[#4A90E2] text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-[#3A75B9]">
                Login
              </Link>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
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
      if (!res.ok) {
        if (res.status === 404) return router.push("/community");
        throw new Error("Failed to fetch");
      }
      const data = await res.json();
      data.likes = data.likes || [];
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

  const handleLike = async () => {
    if (!user) return router.push("/Login");
    if (!post) return;

    const isLiked = post.likes.includes(user.uid);
    const newLikes = isLiked 
      ? post.likes.filter(id => id !== user.uid) 
      : [...post.likes, user.uid];
    
    setPost(prev => ({
      ...prev,
      likes: newLikes,
      likeCount: isLiked ? prev.likeCount - 1 : prev.likeCount + 1
    }));

    try {
      await fetch(`/api/community/posts/${params.postId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'like', userId: user.uid })
      });
    } catch (err) {
      console.error("Like failed", err);
      fetchPost();
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Check out this post by ${post.authorName}`,
          text: post.title,
          url: window.location.href
        });
        await fetch(`/api/community/posts/${params.postId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'share' })
        });
      } catch (err) {
        console.log('Share cancelled or failed', err);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("Link copied to clipboard!");
    }
  };

  // --- NEW: Delete Post ---
  const handleDeletePost = async () => {
    if (!confirm("Are you sure you want to delete this post?")) return;
    try {
      const res = await fetch(`/api/community/posts/${params.postId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid })
      });
      if (res.ok) {
        alert("Post deleted.");
        router.push("/community");
      } else {
        alert("Failed to delete post.");
      }
    } catch (err) { console.error(err); }
  };

  // --- NEW: Delete Reply ---
  const handleDeleteReply = async (replyId) => {
    if (!confirm("Delete this comment?")) return;
    try {
      const res = await fetch(`/api/community/replies/${replyId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid })
      });
      if (res.ok) {
        // Remove from UI
        setPost(prev => ({
            ...prev,
            replies: prev.replies.filter(r => r._id !== replyId)
        }));
      } else {
        alert("Failed to delete comment.");
      }
    } catch (err) { console.error(err); }
  };

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
    } catch (err) { 
      console.error(err); 
    } finally { 
      setReplyLoading(false); 
    }
  };

  if (loading) return <div className="flex justify-center pt-20"><div className="loader"></div></div>;
  if (!post) return <p className="text-center mt-20">Post not found.</p>;

  const isLiked = user && post.likes && post.likes.includes(user.uid);
  const isMyPost = user && user.uid === post.authorId;

  return (
    <div className="min-h-screen bg-[#F4F7F9] p-4 md:p-10">
      <div className="max-w-4xl mx-auto">
        
        <Link href="/community" className="inline-flex items-center text-gray-500 hover:text-[#4A90E2] font-bold mb-6 transition-colors">
          &larr; Back to Feed
        </Link>

        <div className="bg-white rounded-3xl shadow-lg overflow-hidden mb-8 border border-gray-100">
          <div className="p-6 border-b border-gray-50 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-[#4A90E2] to-[#50E3C2] text-white rounded-full flex items-center justify-center text-xl font-bold uppercase shadow-md">
                {post.authorName[0]}
              </div>
              <div>
                <span className="block font-bold text-gray-800 text-lg">{post.authorName}</span>
                <span className="text-sm text-gray-400">{new Date(post.createdAt).toLocaleString()}</span>
              </div>
            </div>

            {/* Delete Post Button */}
            {isMyPost && (
                <button 
                    onClick={handleDeletePost}
                    className="text-gray-400 hover:text-red-500 transition-colors p-2 flex items-center gap-1 text-sm font-semibold"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                </button>
            )}
          </div>

          <div className="p-6">
            <h1 className="text-3xl font-extrabold text-[#333333] mb-4 leading-tight">{post.title}</h1>
            <p className="text-gray-700 leading-relaxed text-lg whitespace-pre-wrap mb-6">
              {post.content}
            </p>

            {post.mediaUrl && post.mediaType === 'image' && (
                <div className="w-full rounded-2xl overflow-hidden shadow-sm border border-gray-100 mb-4">
                    <img src={post.mediaUrl} alt="Post attachment" className="w-full h-auto object-cover max-h-[600px]" />
                </div>
            )}
            {post.mediaUrl && post.mediaType === 'video' && (
                <div className="w-full rounded-2xl overflow-hidden shadow-sm border border-gray-100 mb-4 bg-black">
                    <video controls className="w-full max-h-[600px] mx-auto">
                        <source src={post.mediaUrl} type="video/mp4" />
                        Your browser does not support the video tag.
                    </video>
                </div>
            )}
          </div>

          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center gap-6">
             <button 
                onClick={handleLike}
                className={`flex items-center gap-2 transition-all transform active:scale-95 ${isLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'}`}
            >
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-7 w-7 ${isLiked ? 'fill-current' : 'fill-none'}`} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                <span className="font-bold text-lg">{post.likeCount || 0}</span>
            </button>

            <div className="flex items-center gap-2 text-[#4A90E2]">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span className="font-bold text-lg">{post.replies ? post.replies.length : 0}</span>
            </div>

            <button onClick={handleShare} className="flex items-center gap-2 text-gray-500 hover:text-green-600 transition-colors ml-auto">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                <span className="text-sm font-semibold">Share</span>
            </button>
          </div>
        </div>

        {/* --- Replies Section --- */}
        <div className="mb-10">
          <h3 className="text-xl font-bold text-[#333333] mb-4 flex items-center gap-2">
            Discussion <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full text-sm">{post.replies ? post.replies.length : 0}</span>
          </h3>

          <div className="space-y-4">
            {(!post.replies || post.replies.length === 0) ? (
              <div className="bg-white/50 p-8 rounded-2xl text-center text-gray-500 border-2 border-dashed border-gray-200">
                No replies yet. Be the first to join the conversation!
              </div>
            ) : (
              post.replies.map((reply) => {
                const isMyReply = user && user.uid === reply.authorId;
                return (
                    <div key={reply._id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative group">
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-600">
                                {reply.authorName[0]}
                            </div>
                            <span className="font-bold text-[#4A90E2]">{reply.authorName}</span>
                        </div>
                        <span className="text-xs text-gray-400">{new Date(reply.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-gray-700 leading-relaxed pl-10">{reply.content}</p>
                    
                    {/* Delete Reply Button */}
                    {isMyReply && (
                        <button 
                            onClick={() => handleDeleteReply(reply._id)}
                            className="absolute top-4 right-4 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                            title="Delete Comment"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    )}
                    </div>
                );
              })
            )}
          </div>
        </div>

        {/* --- Reply Box --- */}
        <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8 sticky bottom-6 border border-gray-100 z-10">
          {user ? (
            <form onSubmit={handleReplySubmit}>
              <label className="block font-bold text-gray-700 mb-2">Add your reply</label>
              <div className="relative">
                <textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="Type your helpful response here..."
                    className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#50E3C2] focus:ring-2 focus:ring-teal-50 outline-none transition-all min-h-[100px] mb-4 resize-none"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={replyLoading || !replyContent.trim()}
                  className="bg-[#50E3C2] hover:bg-[#3FCCB4] text-[#333333] font-bold py-3 px-8 rounded-xl shadow-md transition-transform transform active:scale-95 disabled:opacity-50 disabled:scale-100 flex items-center gap-2"
                >
                  {replyLoading && <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin"></div>}
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
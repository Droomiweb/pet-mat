// app/community/[postId]/page.js
"use client";
import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "../../auth-provider";
import Link from "next/link";
import Image from "next/image";

// --- ICONS ---
const ArrowLeftIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
);
const HeartIcon = ({ filled }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill={filled ? "currentColor" : "none"} viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-7 h-7 transition-colors duration-300 ${filled ? 'text-red-500' : 'text-gray-400 group-hover:text-red-500'}`}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
  </svg>
);
const ShareIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-gray-400 group-hover:text-green-500 transition-colors"><path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" /></svg>
);
const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
);
const SendIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>
);

// --- SKELETON LOADER ---
const PostSkeleton = () => (
  <div className="bg-white/80 backdrop-blur-md rounded-[2.5rem] p-8 shadow-sm border border-white animate-pulse">
    <div className="flex items-center gap-4 mb-6">
      <div className="w-14 h-14 bg-gray-200 rounded-full"></div>
      <div className="flex-1">
        <div className="h-5 bg-gray-200 rounded w-1/3 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-1/4"></div>
      </div>
    </div>
    <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
    <div className="space-y-2 mb-6">
      <div className="h-4 bg-gray-200 rounded w-full"></div>
      <div className="h-4 bg-gray-200 rounded w-full"></div>
      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
    </div>
    <div className="h-64 bg-gray-200 rounded-2xl"></div>
  </div>
);

export default function SinglePostPage() {
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [replyContent, setReplyContent] = useState("");
  const [replyLoading, setReplyLoading] = useState(false);
  
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const replyInputRef = useRef(null);

  const fetchPost = async () => {
    try {
      const res = await fetch(`/api/community/posts/${params.postId}`, { cache: 'no-store' });
      if (!res.ok) {
        if (res.status === 404) return router.push("/community");
        throw new Error("Failed to fetch");
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
    if (params.postId) fetchPost();
  }, [params.postId]);

  // --- HANDLERS ---
  const handleLike = async () => {
    if (!user) return router.push("/Login");
    if (!post) return;

    const isLiked = (post.likes || []).includes(user.uid);
    const newLikes = isLiked 
      ? post.likes.filter(id => id !== user.uid) 
      : [...(post.likes || []), user.uid];
    
    setPost(prev => ({
      ...prev,
      likes: newLikes,
      likeCount: isLiked ? (prev.likeCount || 0) - 1 : (prev.likeCount || 0) + 1
    }));

    try {
      await fetch(`/api/community/posts/${params.postId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'like', userId: user.uid })
      });
    } catch (err) {
      console.error("Like failed", err);
      fetchPost(); // Revert on fail
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Post by ${post.authorName}`,
          text: post.title,
          url: window.location.href
        });
      } catch (err) {}
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("Link copied to clipboard!");
    }
  };

  const handleDeletePost = async () => {
    if (!confirm("Delete this post? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/community/posts/${params.postId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid })
      });
      if (res.ok) router.push("/community");
    } catch (err) { console.error(err); }
  };

  const handleDeleteReply = async (replyId) => {
    if (!confirm("Delete this comment?")) return;
    try {
      const res = await fetch(`/api/community/replies/${replyId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid })
      });
      if (res.ok) {
        setPost(prev => ({
            ...prev,
            replies: prev.replies.filter(r => r._id !== replyId)
        }));
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
        const data = await res.json();
        // Optimistically add reply to list
        const newReply = data.reply;
        // Ensure reply has needed fields for display if API doesn't return them all
        newReply.createdAt = new Date().toISOString(); 
        
        setPost(prev => ({
            ...prev,
            replies: [...(prev.replies || []), newReply]
        }));
        setReplyContent("");
        // Scroll to bottom nicely
        setTimeout(() => {
            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        }, 100);
      }
    } catch (err) { 
      console.error(err); 
    } finally { 
      setReplyLoading(false); 
    }
  };

  // --- RENDER ---
  if (loading) {
    return (
      <div className="min-h-screen bg-[#E2F4EF] p-4 md:p-10 flex justify-center">
        <div className="max-w-3xl w-full mt-20">
            <PostSkeleton />
        </div>
      </div>
    );
  }

  if (!post) return <div className="min-h-screen flex items-center justify-center text-gray-500">Post not found.</div>;

  const isLiked = user && (post.likes || []).includes(user.uid);
  const isMyPost = user && user.uid === post.authorId;

  return (
    <div className="min-h-screen bg-[#E2F4EF] relative pb-32">
      
      {/* Background Animation */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-30">
         {[...Array(6)].map((_, i) => (
            <div key={i} className="absolute text-4xl animate-pulse" style={{ 
                top: `${Math.random() * 100}%`, 
                left: `${Math.random() * 100}%`,
                animationDelay: `${i}s` 
            }}>🐾</div>
         ))}
      </div>

      <div className="max-w-3xl mx-auto px-4 md:px-8 py-12 md:py-20 relative z-10">
        
        {/* Nav Back */}
        <Link href="/community" className="inline-flex items-center gap-2 text-gray-500 hover:text-[#4A90E2] font-bold mb-6 transition-all hover:-translate-x-1">
          <div className="bg-white p-2 rounded-full shadow-sm"><ArrowLeftIcon /></div>
          <span>Back to Feed</span>
        </Link>

        {/* --- MAIN POST CARD --- */}
        <div className="bg-white/90 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white overflow-hidden mb-10">
          
          {/* Header */}
          <div className="p-6 md:p-8 border-b border-gray-100 flex justify-between items-start">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-[#4A90E2] to-[#50E3C2] text-white rounded-full flex items-center justify-center text-2xl font-bold shadow-md">
                {post.authorName[0].toUpperCase()}
              </div>
              <div>
                <h2 className="font-extrabold text-gray-800 text-lg leading-tight">{post.authorName}</h2>
                <p className="text-sm text-gray-400 font-medium">{new Date(post.createdAt).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
            </div>

            {isMyPost && (
                <button 
                    onClick={handleDeletePost}
                    className="text-gray-300 hover:text-red-500 transition-colors p-2 bg-gray-50 rounded-full hover:bg-red-50"
                    title="Delete Post"
                >
                    <TrashIcon />
                </button>
            )}
          </div>

          {/* Body */}
          <div className="p-6 md:p-8">
            <h1 className="text-3xl md:text-4xl font-extrabold text-[#333333] mb-6 leading-tight">
                {post.title}
            </h1>
            <p className="text-gray-600 leading-relaxed text-lg whitespace-pre-wrap mb-8 font-medium">
              {post.content}
            </p>

            {/* Media Display */}
            {post.mediaUrl && (
                <div className="rounded-3xl overflow-hidden shadow-md border border-gray-100 bg-gray-50 mb-2">
                    {post.mediaType === 'video' ? (
                        <video controls className="w-full max-h-[600px] object-contain bg-black">
                            <source src={post.mediaUrl} type="video/mp4" />
                        </video>
                    ) : (
                        <img src={post.mediaUrl} alt="Post attachment" className="w-full h-auto object-cover" />
                    )}
                </div>
            )}
          </div>

          {/* Interaction Bar */}
          <div className="px-8 py-6 bg-gray-50/80 border-t border-gray-100 flex items-center gap-8">
             <button 
                onClick={handleLike}
                className="group flex items-center gap-2 transition-all active:scale-95"
            >
                <HeartIcon filled={isLiked} />
                <span className={`font-bold text-lg ${isLiked ? 'text-red-500' : 'text-gray-500'}`}>{post.likeCount || 0}</span>
            </button>

            <div className="flex items-center gap-2 text-[#4A90E2]">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-7 h-7"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" /></svg>
                <span className="font-bold text-lg text-gray-500 group-hover:text-[#4A90E2] transition-colors">{post.replies ? post.replies.length : 0}</span>
            </div>

            <button onClick={handleShare} className="ml-auto text-gray-400 hover:text-green-600 transition-colors p-2 rounded-full hover:bg-green-50">
                <ShareIcon />
            </button>
          </div>
        </div>

        {/* --- COMMENTS SECTION --- */}
        <div className="mb-8">
          <h3 className="text-xl font-extrabold text-[#333333] mb-6 pl-2 border-l-4 border-[#4A90E2]">
            Discussion
          </h3>

          <div className="space-y-4">
            {(!post.replies || post.replies.length === 0) ? (
              <div className="text-center py-10 opacity-50">
                <p>No comments yet. Be the first to reply!</p>
              </div>
            ) : (
              post.replies.map((reply) => (
                <div key={reply._id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 relative group hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold text-gray-500">
                                {reply.authorName[0].toUpperCase()}
                            </div>
                            <span className="font-bold text-[#333333] text-sm">{reply.authorName}</span>
                            <span className="text-xs text-gray-400">• {new Date(reply.createdAt).toLocaleDateString()}</span>
                        </div>
                        
                        {user && user.uid === reply.authorId && (
                            <button 
                                onClick={() => handleDeleteReply(reply._id)}
                                className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                            >
                                <TrashIcon />
                            </button>
                        )}
                    </div>
                    <p className="text-gray-600 text-sm leading-relaxed pl-10">{reply.content}</p>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* --- STICKY REPLY INPUT (Mobile Optimized) --- */}
      <div className="fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-xl border-t border-gray-200 p-3 md:p-4 z-40 shadow-[0_-5px_15px_rgba(0,0,0,0.05)]">
        <div className="max-w-3xl mx-auto">
            {user ? (
                <form onSubmit={handleReplySubmit} className="flex items-end gap-2 md:gap-4">
                    <div className="flex-1 bg-gray-100 rounded-3xl px-4 py-2 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#4A90E2] transition-all border border-transparent focus-within:border-[#4A90E2]">
                        <textarea
                            ref={replyInputRef}
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            placeholder="Write a helpful reply..."
                            className="w-full bg-transparent border-none focus:ring-0 text-gray-800 resize-none max-h-32 py-2"
                            rows={1}
                            style={{ minHeight: '44px' }}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={replyLoading || !replyContent.trim()}
                        className="w-12 h-12 bg-[#4A90E2] hover:bg-[#3A75B9] text-white rounded-full flex items-center justify-center shadow-lg disabled:opacity-50 disabled:shadow-none transition-all active:scale-95 shrink-0"
                    >
                        {replyLoading ? (
                            <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <SendIcon />
                        )}
                    </button>
                </form>
            ) : (
                <div className="flex items-center justify-between px-4">
                    <p className="text-gray-500 text-sm font-medium">Log in to join the conversation.</p>
                    <Link href="/Login" className="text-[#4A90E2] font-bold text-sm px-4 py-2 bg-blue-50 rounded-full">
                        Login
                    </Link>
                </div>
            )}
        </div>
      </div>

    </div>
  );
}
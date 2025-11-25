// app/community/page.js
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../auth-provider";
import Link from "next/link";
import Image from "next/image";

// --- ICONS ---
const HeartIcon = ({ filled }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill={filled ? "currentColor" : "none"} viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-6 h-6 transition-colors ${filled ? 'text-red-500' : 'text-gray-400 group-hover:text-red-500'}`}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
  </svg>
);
const ChatIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-gray-400 group-hover:text-[#4A90E2] transition-colors">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.159 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
  </svg>
);
const ShareIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-gray-400 group-hover:text-green-500 transition-colors">
    <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
  </svg>
);
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>;

// --- SKELETON LOADER ---
const SkeletonCard = () => (
  <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 animate-pulse">
    <div className="flex items-center gap-3 mb-4">
      <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
      <div className="flex-1">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-1/4"></div>
      </div>
    </div>
    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
    <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
    <div className="h-64 bg-gray-200 rounded-2xl mb-4"></div>
    <div className="flex gap-4">
      <div className="h-8 w-16 bg-gray-200 rounded-lg"></div>
      <div className="h-8 w-16 bg-gray-200 rounded-lg"></div>
    </div>
  </div>
);

export default function CommunityPage() {
  const [posts, setPosts] = useState([]);
  const [filteredPosts, setFilteredPosts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("feed"); // 'feed' or 'myposts'
  const [loading, setLoading] = useState(true);
  
  // Modal & Upload States
  const [showModal, setShowModal] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState("");
  const [newPostContent, setNewPostContent] = useState("");
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  
  const { user } = useAuth();
  const router = useRouter();

  // --- FETCH DATA ---
  const fetchPosts = async () => {
    try {
      const res = await fetch("/api/community/posts", { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setPosts(data);
        setFilteredPosts(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  // --- FILTER LOGIC ---
  useEffect(() => {
    let result = posts;

    // 1. Tab Filter
    if (activeTab === "myposts" && user) {
      result = result.filter(p => p.authorId === user.uid);
    }

    // 2. Search Filter
    if (searchQuery.trim()) {
      const lowerQ = searchQuery.toLowerCase();
      result = result.filter(
        p => p.title.toLowerCase().includes(lowerQ) || p.authorName.toLowerCase().includes(lowerQ)
      );
    }

    setFilteredPosts(result);
  }, [searchQuery, posts, activeTab, user]);

  // --- HANDLERS ---
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
        setMediaFile(file);
        setMediaPreview(URL.createObjectURL(file));
    }
  };

  const fileToBase64 = (file) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
  });

  const handlePostSubmit = async (e) => {
    e.preventDefault();
    if (!user) return router.push("/Login");
    
    setFormLoading(true);
    try {
      let mediaBase64 = null;
      let mediaType = null;

      if (mediaFile) {
          mediaBase64 = await fileToBase64(mediaFile);
          mediaType = mediaFile.type.startsWith("video") ? "video" : "image";
      }

      const res = await fetch("/api/community/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newPostTitle,
          content: newPostContent,
          authorId: user.uid,
          authorName: user.email.split("@")[0],
          mediaBase64,
          mediaType
        }),
      });

      if (res.ok) {
        setNewPostTitle("");
        setNewPostContent("");
        setMediaFile(null);
        setMediaPreview(null);
        setShowModal(false);
        fetchPosts();
      } else {
        alert("Failed to create post.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFormLoading(false);
    }
  };

  const handleLike = async (postId) => {
      if (!user) return router.push("/Login");
      
      const updatedPosts = posts.map(p => {
          if (p._id === postId) {
              const currentLikes = p.likes || [];
              const isLiked = currentLikes.includes(user.uid);
              return {
                  ...p,
                  likes: isLiked ? currentLikes.filter(id => id !== user.uid) : [...currentLikes, user.uid],
                  likeCount: isLiked ? (p.likeCount || 0) - 1 : (p.likeCount || 0) + 1
              };
          }
          return p;
      });
      setPosts(updatedPosts);

      await fetch(`/api/community/posts/${postId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'like', userId: user.uid })
      });
  };

  const handleDeletePost = async (postId) => {
    if (!confirm("Are you sure you want to delete this post?")) return;
    try {
      const res = await fetch(`/api/community/posts/${postId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid })
      });
      if (res.ok) {
        const remaining = posts.filter(p => p._id !== postId);
        setPosts(remaining);
      }
    } catch (err) { console.error(err); }
  };

  const handleShare = (post) => {
      if (navigator.share) {
          navigator.share({
              title: post.title,
              url: `${window.location.origin}/community/${post._id}`
          }).catch(console.error);
      } else {
          navigator.clipboard.writeText(`${window.location.origin}/community/${post._id}`);
          alert("Link copied!");
      }
  };

  return (
    <div className="min-h-screen bg-[#F4F7F9] relative">
      
      {/* Background Decoration */}
      <div className="fixed top-0 left-0 w-full h-96 bg-gradient-to-b from-[#E2F4EF] to-transparent -z-10"></div>

      <div className="max-w-3xl mx-auto px-4 md:px-8 py-24">
        
        {/* --- HEADER --- */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-extrabold text-[#333333] mb-2">Social Feed</h1>
            <p className="text-gray-500">Connect with pet lovers, share stories.</p>
          </div>
          
          {/* Desktop Create Button */}
          <button 
            onClick={() => user ? setShowModal(true) : router.push("/Login")}
            className="hidden md:flex items-center gap-2 bg-[#4A90E2] hover:bg-[#3A75B9] text-white font-bold py-3 px-6 rounded-full shadow-lg transition-all hover:scale-105 active:scale-95"
          >
            <PlusIcon /> Create Post
          </button>
        </div>

        {/* --- CONTROLS (Search & Tabs) --- */}
        <div className="sticky top-20 z-30 bg-white/80 backdrop-blur-xl p-3 rounded-[2rem] shadow-lg border border-white/50 mb-8 transition-all">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search */}
            <div className="flex-1 relative">
              <svg className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input 
                type="text"
                placeholder="Search discussions..."
                className="w-full pl-11 pr-4 py-3 rounded-full bg-gray-100 border-transparent focus:bg-white focus:border-[#4A90E2] focus:ring-2 focus:ring-blue-100 outline-none transition-all font-medium text-gray-700"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Tabs */}
            <div className="flex bg-gray-100 rounded-full p-1 shrink-0">
                <button 
                    onClick={() => setActiveTab("feed")}
                    className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all ${activeTab === "feed" ? "bg-white text-[#4A90E2] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                >
                    All Posts
                </button>
                <button 
                    onClick={() => setActiveTab("myposts")}
                    className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all ${activeTab === "myposts" ? "bg-white text-[#4A90E2] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                >
                    My Posts
                </button>
            </div>
          </div>
        </div>

        {/* --- FEED --- */}
        {loading ? (
          <div className="space-y-6">
            {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="text-center py-20 bg-white/50 rounded-[2rem] border-2 border-dashed border-gray-200">
            <p className="text-gray-400 font-bold text-lg">No posts found.</p>
            <p className="text-gray-400 text-sm">Be the first to share something!</p>
          </div>
        ) : (
          <div className="space-y-6 pb-24">
            {filteredPosts.map(post => {
              const isLiked = user && (post.likes || []).includes(user.uid);
              const isMyPost = user && user.uid === post.authorId;
              
              return (
                <div key={post._id} className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                  
                  {/* Header */}
                  <div className="p-5 flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 text-white rounded-full flex items-center justify-center font-bold text-lg shadow-sm">
                        {post.authorName[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-gray-800 text-sm">{post.authorName}</p>
                        <p className="text-xs text-gray-400">{new Date(post.createdAt).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}</p>
                      </div>
                    </div>
                    
                    {isMyPost && (
                        <button onClick={() => handleDeletePost(post._id)} className="text-gray-300 hover:text-red-500 transition-colors p-2">
                            <TrashIcon />
                        </button>
                    )}
                  </div>

                  {/* Content */}
                  <Link href={`/community/${post._id}`} className="block px-5 pb-2 group cursor-pointer">
                    <h3 className="text-xl font-extrabold text-gray-800 mb-2 group-hover:text-[#4A90E2] transition-colors leading-tight">{post.title}</h3>
                    <p className="text-gray-600 text-sm leading-relaxed line-clamp-3">{post.content}</p>
                  </Link>

                  {/* Media */}
                  {post.mediaUrl && (
                    <div className="mt-3 px-2">
                        <div className="rounded-2xl overflow-hidden max-h-[500px] bg-gray-100 flex justify-center items-center">
                            {post.mediaType === 'video' ? (
                                <video src={post.mediaUrl} controls className="w-full h-full object-contain" />
                            ) : (
                                <img src={post.mediaUrl} alt="Post media" className="w-full h-auto object-cover" />
                            )}
                        </div>
                    </div>
                  )}

                  {/* Actions Footer */}
                  <div className="px-6 py-4 flex items-center gap-8 mt-2">
                    <button 
                        onClick={() => handleLike(post._id)} 
                        className="group flex items-center gap-2 transition-all active:scale-95"
                    >
                        <HeartIcon filled={isLiked} />
                        <span className={`font-bold text-sm ${isLiked ? 'text-red-500' : 'text-gray-500'}`}>{post.likeCount || 0}</span>
                    </button>

                    <Link href={`/community/${post._id}`} className="group flex items-center gap-2 transition-all active:scale-95">
                        <ChatIcon />
                        <span className="font-bold text-sm text-gray-500 group-hover:text-[#4A90E2]">{post.replyCount || 0}</span>
                    </Link>

                    <button onClick={() => handleShare(post)} className="group ml-auto transition-all active:scale-95">
                        <ShareIcon />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* --- MOBILE FAB (Floating Action Button) --- */}
        <button
            onClick={() => user ? setShowModal(true) : router.push("/Login")}
            className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-[#4A90E2] text-white rounded-full shadow-2xl flex items-center justify-center z-40 active:scale-90 transition-transform border-4 border-white"
        >
            <PlusIcon />
        </button>

        {/* --- CREATE POST MODAL --- */}
        {showModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-end md:items-center justify-center p-0 md:p-4">
            <div className="bg-white w-full md:max-w-2xl md:rounded-[2rem] rounded-t-[2rem] shadow-2xl flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-10 duration-300">
              
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">Create Post</h2>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-800 p-2 text-2xl">×</button>
              </div>
              
              {/* Modal Body */}
              <form onSubmit={handlePostSubmit} className="p-6 overflow-y-auto">
                <input
                  value={newPostTitle}
                  onChange={(e) => setNewPostTitle(e.target.value)}
                  placeholder="Give it a catchy title..."
                  className="w-full text-xl font-bold text-gray-800 placeholder-gray-300 border-none focus:ring-0 p-0 mb-4"
                  required
                />
                
                <textarea
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  placeholder="What's happening with your pet today?"
                  className="w-full h-32 resize-none text-gray-600 placeholder-gray-400 border-none focus:ring-0 p-0 text-base leading-relaxed"
                  required
                />

                {/* Media Preview */}
                {mediaPreview && (
                    <div className="relative w-full h-48 bg-gray-100 rounded-xl overflow-hidden mt-4 group">
                        <img src={mediaPreview} alt="Preview" className="w-full h-full object-cover" />
                        <button type="button" onClick={() => { setMediaFile(null); setMediaPreview(null); }} className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full hover:bg-red-500 transition">×</button>
                    </div>
                )}

                {/* Actions Bar */}
                <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4">
                    <label className="flex items-center gap-2 text-[#4A90E2] font-bold cursor-pointer hover:bg-blue-50 px-4 py-2 rounded-full transition">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
                        <span className="text-sm">Photo/Video</span>
                        <input type="file" accept="image/*,video/*" onChange={handleFileChange} className="hidden" />
                    </label>

                    <button
                        type="submit"
                        disabled={formLoading || !newPostTitle.trim()}
                        className="bg-[#4A90E2] hover:bg-[#3A75B9] text-white font-bold py-2.5 px-8 rounded-full shadow-lg transition-all disabled:opacity-50 disabled:scale-100 active:scale-95 flex items-center gap-2"
                    >
                        {formLoading && <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>}
                        Post
                    </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
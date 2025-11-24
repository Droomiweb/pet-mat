"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../auth-provider";
import Link from "next/link";

export default function CommunityPage() {
  const [posts, setPosts] = useState([]);
  const [filteredPosts, setFilteredPosts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
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

  // --- Data Fetching ---
  const fetchPosts = async () => {
    try {
      const res = await fetch("/api/community/posts");
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

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredPosts(posts);
    } else {
      const lowerQ = searchQuery.toLowerCase();
      const filtered = posts.filter(
        p => p.title.toLowerCase().includes(lowerQ) || p.authorName.toLowerCase().includes(lowerQ)
      );
      setFilteredPosts(filtered);
    }
  }, [searchQuery, posts]);

  // --- Handlers ---

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
      setFilteredPosts(updatedPosts);

      await fetch(`/api/community/posts/${postId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'like', userId: user.uid })
      });
  };

  const handleShare = async (post) => {
      if (navigator.share) {
          try {
              await navigator.share({
                  title: `Check out this post by ${post.authorName}`,
                  text: post.title,
                  url: `${window.location.origin}/community/${post._id}`
              });
              await fetch(`/api/community/posts/${post._id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'share' })
            });
          } catch (err) {
              console.log('Error sharing', err);
          }
      } else {
          navigator.clipboard.writeText(`${window.location.origin}/community/${post._id}`);
          alert("Link copied to clipboard!");
      }
  };

  // --- NEW: Delete Handler ---
  const handleDeletePost = async (postId) => {
    if (!confirm("Are you sure you want to delete this post?")) return;

    try {
      const res = await fetch(`/api/community/posts/${postId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid }) // Send ID for verification
      });

      if (res.ok) {
        alert("Post deleted.");
        // Remove from UI instantly
        const remaining = posts.filter(p => p._id !== postId);
        setPosts(remaining);
        setFilteredPosts(remaining);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting post");
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F7F9] p-4 md:p-10">
      <div className="max-w-4xl mx-auto">
        
        <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
          <div>
            <h1 className="text-4xl font-extrabold text-[#333333]">Social Feed</h1>
            <p className="text-gray-500 mt-2">Share moments, videos, and stories of your pets.</p>
          </div>
          <div className="flex gap-4">
             <button 
              onClick={() => user ? setShowModal(true) : router.push("/Login")}
              className="bg-[#4A90E2] hover:bg-[#3A75B9] text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all transform hover:scale-105 flex items-center gap-2"
            >
              <span>📸</span> Create Post
            </button>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 mb-8 flex items-center gap-3">
          <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input 
            type="text"
            placeholder="Search discussions or authors..."
            className="flex-1 outline-none text-gray-700 bg-transparent"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="text-center py-20"><div className="loader mx-auto"></div></div>
        ) : filteredPosts.length === 0 ? (
          <p className="text-center text-gray-500">No posts found.</p>
        ) : (
          <div className="space-y-8">
            {filteredPosts.map(post => {
              const likes = post.likes || [];
              const isLiked = user && likes.includes(user.uid);
              const isMyPost = user && user.uid === post.authorId;
              
              return (
                <div key={post._id} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow relative">
                  
                  {/* Post Header */}
                  <div className="p-5 flex justify-between items-center border-b border-gray-50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 text-white rounded-full flex items-center justify-center font-bold text-lg">
                        {post.authorName[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-gray-800">{post.authorName}</p>
                        <p className="text-xs text-gray-400">{new Date(post.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>

                    {/* DELETE BUTTON (Only if owner) */}
                    {isMyPost && (
                        <button 
                            onClick={() => handleDeletePost(post._id)}
                            className="text-gray-400 hover:text-red-500 transition-colors p-2"
                            title="Delete Post"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    )}
                  </div>

                  <div className="p-0">
                    <div className="px-5 pt-2 pb-4">
                        <Link href={`/community/${post._id}`}>
                            <h3 className="text-xl font-bold text-[#333333] mb-2 hover:text-[#4A90E2] cursor-pointer">{post.title}</h3>
                        </Link>
                        <p className="text-gray-600 leading-relaxed">{post.content}</p>
                    </div>

                    {post.mediaUrl && post.mediaType === 'image' && (
                        <div className="w-full h-96 relative bg-gray-100">
                            <img src={post.mediaUrl} alt="Post media" className="w-full h-full object-cover" />
                        </div>
                    )}
                    {post.mediaUrl && post.mediaType === 'video' && (
                        <div className="w-full bg-black">
                            <video controls className="w-full max-h-96">
                                <source src={post.mediaUrl} type="video/mp4" />
                                Your browser does not support the video tag.
                            </video>
                        </div>
                    )}
                  </div>

                  <div className="px-5 py-4 flex items-center gap-6 border-t border-gray-100">
                    <button 
                        onClick={() => handleLike(post._id)}
                        className={`flex items-center gap-2 transition-colors ${isLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'}`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${isLiked ? 'fill-current' : 'fill-none'}`} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                        <span className="font-bold text-sm">{post.likeCount || 0}</span>
                    </button>

                    <Link href={`/community/${post._id}`} className="flex items-center gap-2 text-gray-500 hover:text-[#4A90E2] transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <span className="font-bold text-sm">{post.replyCount || 0}</span>
                    </Link>

                    <button onClick={() => handleShare(post)} className="flex items-center gap-2 text-gray-500 hover:text-green-600 transition-colors ml-auto">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                        </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Create Post Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-2xl p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6 border-b pb-4">
                <h2 className="text-2xl font-bold text-[#333333]">Create New Post</h2>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-800 text-2xl">&times;</button>
              </div>
              
              <form onSubmit={handlePostSubmit}>
                <input
                  type="text"
                  value={newPostTitle}
                  onChange={(e) => setNewPostTitle(e.target.value)}
                  placeholder="Headline..."
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl mb-4 font-bold text-lg outline-none focus:ring-2 focus:ring-blue-100"
                  required
                />
                
                <textarea
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  placeholder="What's on your pet's mind?"
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl mb-4 min-h-[120px] outline-none focus:ring-2 focus:ring-blue-100"
                  required
                />

                {/* Media Upload */}
                <div className="mb-6">
                    <label className="block font-bold text-gray-700 mb-2">Add Photo or Video</label>
                    <div className="flex items-center gap-4">
                        <label className="cursor-pointer bg-blue-50 text-[#4A90E2] border border-blue-200 px-4 py-2 rounded-lg hover:bg-blue-100 transition font-semibold flex items-center gap-2">
                            <span>📁</span> Choose File
                            <input type="file" accept="image/*,video/*" onChange={handleFileChange} className="hidden" />
                        </label>
                        {mediaFile && <span className="text-sm text-gray-500 truncate max-w-[200px]">{mediaFile.name}</span>}
                    </div>
                    
                    {mediaPreview && (
                        <div className="mt-4 relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden">
                            {mediaFile?.type.startsWith('video') ? (
                                <video src={mediaPreview} className="w-full h-full object-cover" controls />
                            ) : (
                                <img src={mediaPreview} alt="Preview" className="w-full h-full object-contain" />
                            )}
                            <button 
                                type="button"
                                onClick={() => { setMediaFile(null); setMediaPreview(null); }}
                                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => setShowModal(false)} className="px-6 py-3 rounded-xl font-bold text-gray-600 hover:bg-gray-100">Cancel</button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="px-8 py-3 rounded-xl font-bold text-white bg-[#4A90E2] hover:bg-[#3A75B9] shadow-lg disabled:opacity-70 flex items-center gap-2"
                  >
                    {formLoading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                    {formLoading ? "Uploading..." : "Post"}
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
// app/community/page.js
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
  
  const [showModal, setShowModal] = useState(false); // Modal state
  const [newPostTitle, setNewPostTitle] = useState("");
  const [newPostContent, setNewPostContent] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  
  const { user } = useAuth();
  const router = useRouter();

  // Fetch all posts
  const fetchPosts = async () => {
    try {
      const res = await fetch("/api/community/posts");
      if (res.ok) {
        const data = await res.json();
        setPosts(data);
        setFilteredPosts(data);
      }
    } catch (err) {
      console.error("Error fetching posts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  // Filter posts when search query changes
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

  // Handle new post submission
  const handlePostSubmit = async (e) => {
    e.preventDefault();
    if (!user) return router.push("/Login");
    
    setFormLoading(true);
    try {
      const res = await fetch("/api/community/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newPostTitle,
          content: newPostContent,
          authorId: user.uid,
          authorName: user.email.split("@")[0] // Or user.displayName
        }),
      });

      if (res.ok) {
        setNewPostTitle("");
        setNewPostContent("");
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

  return (
    <div className="min-h-screen bg-[#F4F7F9] p-4 md:p-10">
      <div className="max-w-6xl mx-auto">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
          <div>
            <h1 className="text-4xl font-extrabold text-[#333333]">Community Hub</h1>
            <p className="text-gray-500 mt-2">Connect, share, and learn from other pet owners.</p>
          </div>
          
          <div className="flex gap-4 w-full md:w-auto">
            <Link href="/AiDoc" className="flex-1 md:flex-none bg-white border-2 border-[#50E3C2] text-[#333333] font-bold py-3 px-6 rounded-xl shadow-sm hover:bg-[#50E3C2] transition-colors flex items-center justify-center gap-2">
              <span>🩺</span> Ask Dr. Paws
            </Link>
            <button 
              onClick={() => user ? setShowModal(true) : router.push("/Login")}
              className="flex-1 md:flex-none bg-[#4A90E2] hover:bg-[#3A75B9] text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all transform hover:scale-105"
            >
              + New Discussion
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 mb-8 flex items-center gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input 
            type="text"
            placeholder="Search topics, questions, or authors..."
            className="flex-1 outline-none text-gray-700 bg-transparent placeholder-gray-400"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Posts Grid */}
        {loading ? (
          <div className="text-center py-20">
             <div className="loader mx-auto mb-4"></div>
             <p className="text-gray-500">Loading community discussions...</p>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-200">
            <p className="text-gray-500 text-lg">No posts found matching your search.</p>
            <button onClick={() => setSearchQuery("")} className="text-[#4A90E2] font-bold mt-2 hover:underline">Clear Search</button>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredPosts.map(post => (
              <Link key={post._id} href={`/community/${post._id}`} className="block group">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:border-[#4A90E2] hover:shadow-md transition-all duration-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-bold text-[#333333] group-hover:text-[#4A90E2] transition-colors mb-2">
                        {post.title}
                      </h3>
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-md">
                          👤 {post.authorName}
                        </span>
                        <span>•</span>
                        <span>{new Date(post.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-center justify-center bg-blue-50 text-[#4A90E2] px-4 py-2 rounded-xl min-w-[80px]">
                      <span className="text-2xl font-bold">{post.replyCount || 0}</span>
                      <span className="text-xs font-bold uppercase tracking-wide">Replies</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Create Post Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-2xl p-8 shadow-2xl animate-in fade-in zoom-in duration-200">
              <div className="flex justify-between items-center mb-6 border-b pb-4">
                <h2 className="text-2xl font-bold text-[#333333]">Start a Discussion</h2>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-800 text-2xl">&times;</button>
              </div>
              
              <form onSubmit={handlePostSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Topic Title</label>
                  <input
                    type="text"
                    value={newPostTitle}
                    onChange={(e) => setNewPostTitle(e.target.value)}
                    placeholder="e.g., Best diet for a senior Pug?"
                    className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#4A90E2] focus:ring-2 focus:ring-blue-100 outline-none transition-all font-semibold"
                    required
                  />
                </div>
                
                <div className="mb-6">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Details</label>
                  <textarea
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                    placeholder="Share your story or ask your question here..."
                    className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#4A90E2] focus:ring-2 focus:ring-blue-100 outline-none transition-all min-h-[150px]"
                    required
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-6 py-3 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="px-8 py-3 rounded-xl font-bold text-white bg-[#4A90E2] hover:bg-[#3A75B9] shadow-lg transition-all disabled:opacity-70"
                  >
                    {formLoading ? "Posting..." : "Post Discussion"}
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
// app/community/page.js
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../auth-provider";
import Link from "next/link";

export default function CommunityPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
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

  // Handle new post submission
  const handlePostSubmit = async (e) => {
    e.preventDefault();
    if (!user) return router.push("/Login");
    if (!newPostTitle.trim() || !newPostContent.trim()) {
      alert("Please fill in both title and content.");
      return;
    }
    setFormLoading(true);

    try {
      const res = await fetch("/api/community/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newPostTitle,
          content: newPostContent,
          authorId: user.uid,
          authorName: user.email.split("@")[0]
        }),
      });

      if (res.ok) {
        setNewPostTitle("");
        setNewPostContent("");
        setShowForm(false);
        fetchPosts(); // Refresh the post list
      } else {
        alert("Failed to create post. Please try again.");
      }
    } catch (err) {
      console.error("Error creating post:", err);
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F7F9] p-4 md:p-10">
      <div className="max-w-5xl mx-auto">
        
        {/* Header and CTA buttons */}
        <div className="flex flex-col md:flex-row justify-between md:items-center mb-8 gap-4">
          <h1 className="text-4xl font-extrabold text-[#333333]">
            Community Hub
          </h1>
          <div className="flex gap-4">
            <Link href="/AiDoc" className="btn-secondary py-3 px-6 text-center">
              Ask Dr. Paws (AI Vet)
            </Link>
            <button 
              onClick={() => setShowForm(!showForm)}
              className="btn-primary py-3 px-6"
            >
              {showForm ? "Cancel" : "+ Create New Post"}
            </button>
          </div>
        </div>

        {/* New Post Form (Conditional) */}
        {showForm && (
          <div className="mb-8 p-6 bg-white rounded-2xl shadow-lg border">
            <form onSubmit={handlePostSubmit}>
              <h2 className="text-2xl font-bold text-[#4A90E2] mb-4">Start a New Discussion</h2>
              <input
                type="text"
                value={newPostTitle}
                onChange={(e) => setNewPostTitle(e.target.value)}
                placeholder="Post Title"
                className="input-style w-full mb-4"
              />
              <textarea
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder="What's on your mind? Share your experiences, ask questions..."
                className="input-style w-full min-h-[150px] mb-4"
                rows="5"
              />
              <button
                type="submit"
                disabled={formLoading}
                className="btn-primary"
              >
                {formLoading ? "Posting..." : "Submit Post"}
              </button>
            </form>
          </div>
        )}

        {/* Posts List */}
        <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-10">
          <h2 className="text-3xl font-bold text-[#333333] mb-6 border-l-4 border-[#50E3C2] pl-3">
            Active Discussions
          </h2>
          {loading ? (
            <p className="text-primary text-center">Loading posts...</p>
          ) : posts.length === 0 ? (
            <p className="text-primary text-center">No discussions started yet. Be the first!</p>
          ) : (
            <div className="space-y-4">
              {posts.map(post => (
                <Link key={post._id} href={`/community/${post._id}`} className="block">
                  <div className="p-5 bg-gray-50 rounded-xl shadow-md hover:shadow-lg transition-all border border-gray-200 hover:border-[#4A90E2]">
                    <h3 className="text-xl font-bold text-[#4A90E2]">{post.title}</h3>
                    <div className="flex justify-between items-center text-sm text-gray-500 mt-2">
                      <span>by {post.authorName}</span>
                      <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                      <span>{post.replyCount} {post.replyCount === 1 ? 'Reply' : 'Replies'}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
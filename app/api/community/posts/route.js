// app/api/community/route.js

// Standard imports
import connectDB from "../../../lib/mongodb";
import ForumPost from "../../../models/ForumPost";
import cloudinary from "../../../lib/cloudinary";

// Disable caching
export const dynamic = 'force-dynamic'; 

// GET request handler
export async function GET(req) {
  try {
    await connectDB();

    // Fetch sorted posts
    const posts = await ForumPost.find({})
      .sort({ createdAt: -1 }) 
      .lean();
    
    // Normalize data structure
    const postsWithStats = posts.map(post => ({
      ...post,
      // Default empty likes
      likes: post.likes || [], 
      // Default media type
      mediaType: post.mediaType || 'none', 
      // Calculate count stats
      replyCount: post.replies ? post.replies.length : 0,
      likeCount: post.likes ? post.likes.length : 0
    }));

    return new Response(JSON.stringify(postsWithStats), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Error fetching posts:", err);
    return new Response(JSON.stringify({ error: "Failed to fetch posts" }), { status: 500 });
  }
}

// POST request handler
export async function POST(req) {
  try {
    await connectDB();
    const { title, content, authorId, authorName, mediaBase64, mediaType } = await req.json();

    // Validate required fields
    if (!title || !content || !authorId) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
    }

    let mediaUrl = null;
    let finalMediaType = 'none';

    // Upload media files
    if (mediaBase64 && mediaType) {
        try {
            const uploadRes = await cloudinary.uploader.upload(mediaBase64, {
                folder: "community_posts", // Folder for posts
                resource_type: "auto" // Auto-detect type
            });
            mediaUrl = uploadRes.secure_url;
            finalMediaType = uploadRes.resource_type; // 'image' or 'video'
        } catch (uploadErr) {
            console.error("Cloudinary Error:", uploadErr);
            return new Response(JSON.stringify({ error: "Image/Video upload failed" }), { status: 500 });
        }
    }

    // Create new post
    const newPost = new ForumPost({
      title,
      content,
      authorId,
      authorName,
      mediaUrl,
      mediaType: finalMediaType,
      // Initialize interaction fields
      likes: [],
      shares: 0,
      replies: [] 
    });

    await newPost.save();

    return new Response(JSON.stringify({ message: "Post created!", post: newPost }), { status: 201 });

  } catch (err) {
    console.error("Error creating post:", err);
    return new Response(JSON.stringify({ error: "Failed to create post" }), { status: 500 });
  }
}
// app/api/community/route.js

// 1. IMPORTS
import connectDB from "../../../lib/mongodb";
import ForumPost from "../../../models/ForumPost";
import cloudinary from "../../../lib/cloudinary";

// 2. CACHE CONTROL
// Next.js App Router caches GET requests by default. 
// We disable this to ensure users always see the latest posts when they refresh the feed.
export const dynamic = 'force-dynamic'; 

// 3. GET HANDLER (Fetch Feed)
export async function GET(req) {
  try {
    await connectDB();

    // Fetch all posts, sorted by newest first (-1)
    // .lean() converts Mongoose documents to plain JavaScript objects. 
    // This is significantly faster for read-only operations.
    const posts = await ForumPost.find({})
      .sort({ createdAt: -1 }) 
      .lean();
    
    // 4. DATA NORMALIZATION (Crash Prevention)
    // We process the data to ensure frontend stability.
    const postsWithStats = posts.map(post => ({
      ...post,
      // FIX: If 'likes' array is missing (legacy data), default to empty array.
      likes: post.likes || [], 
      // Default media type if missing
      mediaType: post.mediaType || 'none', 
      // Calculate specific counts for UI badges
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

// 5. POST HANDLER (Create New Post)
export async function POST(req) {
  try {
    await connectDB();
    const { title, content, authorId, authorName, mediaBase64, mediaType } = await req.json();

    // Basic Validation
    if (!title || !content || !authorId) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
    }

    let mediaUrl = null;
    let finalMediaType = 'none';

    // 6. MEDIA UPLOAD LOGIC
    // If the user attached a photo/video, upload to Cloudinary.
    if (mediaBase64 && mediaType) {
        try {
            const uploadRes = await cloudinary.uploader.upload(mediaBase64, {
                folder: "community_posts", // Keep forum uploads separate from profile pics
                resource_type: "auto" // Auto-detects if it's an image or video
            });
            mediaUrl = uploadRes.secure_url;
            finalMediaType = uploadRes.resource_type; // returns 'image' or 'video'
        } catch (uploadErr) {
            console.error("Cloudinary Error:", uploadErr);
            return new Response(JSON.stringify({ error: "Image/Video upload failed" }), { status: 500 });
        }
    }

    // 7. CREATE DOCUMENT
    const newPost = new ForumPost({
      title,
      content,
      authorId,
      authorName,
      mediaUrl,
      mediaType: finalMediaType,
      // Initialize interaction fields to avoid null errors later
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
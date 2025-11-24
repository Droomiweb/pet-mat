import connectDB from "../../../lib/mongodb";
import ForumPost from "../../../models/ForumPost";
import cloudinary from "../../../lib/cloudinary";

export const dynamic = 'force-dynamic'; // Ensure not cached

// GET all forum posts
export async function GET(req) {
  try {
    await connectDB();
    const posts = await ForumPost.find({})
      .sort({ createdAt: -1 }) 
      .lean();
    
    // Add calculated fields & default values for old posts
    const postsWithStats = posts.map(post => ({
      ...post,
      likes: post.likes || [], // <--- FIX: Default to empty array if missing
      mediaType: post.mediaType || 'none', // Default media type
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

// POST a new forum post
export async function POST(req) {
  try {
    await connectDB();
    const { title, content, authorId, authorName, mediaBase64, mediaType } = await req.json();

    if (!title || !content || !authorId) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
    }

    let mediaUrl = null;
    let finalMediaType = 'none';

    // Handle Cloudinary Upload
    if (mediaBase64 && mediaType) {
        try {
            const uploadRes = await cloudinary.uploader.upload(mediaBase64, {
                folder: "community_posts",
                resource_type: "auto"
            });
            mediaUrl = uploadRes.secure_url;
            finalMediaType = uploadRes.resource_type; 
        } catch (uploadErr) {
            console.error("Cloudinary Error:", uploadErr);
            return new Response(JSON.stringify({ error: "Image/Video upload failed" }), { status: 500 });
        }
    }

    const newPost = new ForumPost({
      title,
      content,
      authorId,
      authorName,
      mediaUrl,
      mediaType: finalMediaType,
      likes: [],
      shares: 0
    });

    await newPost.save();

    return new Response(JSON.stringify({ message: "Post created!", post: newPost }), { status: 201 });
  } catch (err) {
    console.error("Error creating post:", err);
    return new Response(JSON.stringify({ error: "Failed to create post" }), { status: 500 });
  }
}
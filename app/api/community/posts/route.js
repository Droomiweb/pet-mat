// app/api/community/posts/route.js
import connectDB from "../../../lib/mongodb";
import ForumPost from "../../../models/ForumPost";

// GET all forum posts
export async function GET(req) {
  try {
    await connectDB();
    const posts = await ForumPost.find({})
      .sort({ createdAt: -1 }) // Show newest posts first
      .select('title authorName createdAt replies') // Only select necessary fields for list view
      .lean();
    
    // Get reply count
    const postsWithReplyCount = posts.map(post => ({
      ...post,
      replyCount: post.replies.length
    }));

    return new Response(JSON.stringify(postsWithReplyCount), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error fetching forum posts:", err);
    return new Response(JSON.stringify({ error: "Failed to fetch posts" }), { status: 500 });
  }
}

// POST a new forum post
export async function POST(req) {
  try {
    await connectDB();
    const { title, content, authorId, authorName } = await req.json();

    if (!title || !content || !authorId || !authorName) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
    }

    const newPost = new ForumPost({
      title,
      content,
      authorId,
      authorName
    });

    await newPost.save();

    return new Response(JSON.stringify({ message: "Post created successfully!", post: newPost }), { status: 201 });
  } catch (err) {
    console.error("Error creating post:", err);
    return new Response(JSON.stringify({ error: "Failed to create post" }), { status: 500 });
  }
}
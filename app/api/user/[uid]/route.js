// app/api/user/[uid]/route.js

// 1. IMPORTS
import connectDB from "./../../../lib/mongodb";
import User from "./../../../models/User";

// 2. GET HANDLER (Fetch User Profile)
export async function GET(req, context) {
  try {
    await connectDB();
    
    // Extract the Firebase UID from the URL parameters
    const { uid } = await context.params;
    
    // Find the user using the external Firebase ID
    const user = await User.findOne({ firebaseUid: uid }).lean();

    if (!user) {
      return new Response(JSON.stringify({ error: "User not found" }), { status: 404 });
    }

    // 3. DATA CLEANUP
    // Remove Mongoose-specific fields that the frontend doesn't need.
    const { _id, __v, ...rest } = user;
    
    // Explicitly handle isAdmin default (false if undefined)
    return new Response(JSON.stringify({ 
        _id: _id.toString(), 
        ...rest, 
        isAdmin: user.isAdmin || false 
    }), { status: 200 });

  } catch (err) {
    console.error("Error in GET /api/user/[uid]:", err);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }
}

// 4. PATCH HANDLER (Update Avatar)
export async function PATCH(req, context) {
  try {
    await connectDB();
    const { uid } = await context.params;
    
    // We expect a JSON body with the new Cloudinary URL
    const { avatar } = await req.json();

    if (!avatar) {
        return new Response(JSON.stringify({ error: "Avatar URL is required" }), { status: 400 });
    }

    // 5. ATOMIC UPDATE
    // findOneAndUpdate is atomic. It finds the user and updates the field in one go.
    // { new: true } ensures we return the *updated* document, not the old one.
    const updatedUser = await User.findOneAndUpdate(
      { firebaseUid: uid },
      { $set: { avatar: avatar } },
      { new: true }
    ).lean();

    if (!updatedUser) {
      return new Response(JSON.stringify({ error: "User not found" }), { status: 404 });
    }

    return new Response(JSON.stringify({ message: "Avatar updated", user: updatedUser }), { status: 200 });

  } catch (err) {
    console.error("Error updating avatar:", err);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }
}
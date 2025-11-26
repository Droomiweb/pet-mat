// app/api/user/[uid]/route.js
import connectDB from "./../../../lib/mongodb";
import User from "./../../../models/User";

export async function GET(req, context) {
  try {
    await connectDB();
    const { uid } = await context.params;
    const user = await User.findOne({ firebaseUid: uid }).lean();

    if (!user) {
      return new Response(JSON.stringify({ error: "User not found" }), { status: 404 });
    }

    const { _id, __v, ...rest } = user;
    return new Response(JSON.stringify({ _id: _id.toString(), ...rest, isAdmin: user.isAdmin || false }), { status: 200 });
  } catch (err) {
    console.error("Error in GET /api/user/[uid]:", err);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }
}

// --- NEW: PATCH Method to update Avatar ---
export async function PATCH(req, context) {
  try {
    await connectDB();
    const { uid } = await context.params;
    const { avatar } = await req.json();

    if (!avatar) {
        return new Response(JSON.stringify({ error: "Avatar URL is required" }), { status: 400 });
    }

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
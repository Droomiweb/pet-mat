import connectDB from "./../../../lib/mongodb";
import User from "./../../../models/User";

export async function GET(req, context) {
  try {
    await connectDB();

    // ✅ Same rule applies here
    const { uid } = await context.params;

    const user = await User.findOne({ firebaseUid: uid }).lean();

    if (!user) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { _id, __v, ...rest } = user;
    return new Response(JSON.stringify({ _id: _id.toString(), ...rest }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error in GET /api/user/[uid]:", err);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

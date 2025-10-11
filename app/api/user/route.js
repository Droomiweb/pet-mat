import connectDB from "./../../lib/mongodb";
import User from "./../../models/User";

export async function POST(req) {
  try {
    await connectDB();
    const { name, username, phone, location, firebaseUid } = await req.json();

    if (!name || !username || !phone || !firebaseUid) {
      return new Response(JSON.stringify({ error: "All fields are required" }), { status: 400 });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return new Response(JSON.stringify({ error: "Username already exists" }), { status: 400 });
    }

    const newUser = new User({ name, username, phone, location, firebaseUid });
    await newUser.save();

    return new Response(JSON.stringify({ message: "User created successfully" }), { status: 201 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

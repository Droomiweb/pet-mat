// app/api/user/route.js
import connectDB from "./../../lib/mongodb";
import User from "./../../models/User";

// --- NEW: GET method to check for duplicates before signup ---
export async function GET(req) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const username = searchParams.get("username");
    const phone = searchParams.get("phone");

    const query = [];
    if (username) query.push({ username });
    if (phone) query.push({ phone });

    if (query.length === 0) {
      return new Response(JSON.stringify({ error: "No params provided" }), { status: 400 });
    }

    // Check if any user matches either field
    const existingUser = await User.findOne({ $or: query });

    if (existingUser) {
        if (existingUser.phone === phone) {
            return new Response(JSON.stringify({ exists: true, field: "phone" }), { status: 200 });
        }
        if (existingUser.username === username) {
            return new Response(JSON.stringify({ exists: true, field: "username" }), { status: 200 });
        }
    }

    return new Response(JSON.stringify({ exists: false }), { status: 200 });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

// --- EXISTING: POST method to create user ---
export async function POST(req) {
  try {
    await connectDB();
    const { name, username, phone, location, firebaseUid } = await req.json();

    if (!name || !username || !phone || !firebaseUid) {
      return new Response(JSON.stringify({ error: "All fields are required" }), { status: 400 });
    }

    // Double-check existence (Safety net)
    const existingUser = await User.findOne({ 
        $or: [{ username }, { phone }] 
    });
    
    if (existingUser) {
        const msg = existingUser.phone === phone ? "Phone number already in use." : "Username already taken.";
        return new Response(JSON.stringify({ error: msg }), { status: 400 });
    }

    // Format location for MongoDB GeoJSON
    let formattedLocation = { type: "Point", coordinates: [0, 0], city: "" };

    if (location && location.lat && location.lng) {
      formattedLocation = {
        type: "Point",
        coordinates: [parseFloat(location.lng), parseFloat(location.lat)], // [Lng, Lat]
        city: location.city || "Unknown"
      };
    }

    const newUser = new User({ name, username, phone, location: formattedLocation, firebaseUid });
    await newUser.save();

    return new Response(JSON.stringify({ message: "User created successfully" }), { status: 201 });
  } catch (err) {
    console.error(err);
    // Handle MongoDB duplicate key errors gracefully
    if (err.code === 11000) {
        return new Response(JSON.stringify({ error: "User data already exists." }), { status: 400 });
    }
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
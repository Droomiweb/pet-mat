// app/api/user/route.js

// 1. IMPORTS
import connectDB from "./../../lib/mongodb";
import User from "./../../models/User";

// 2. GET HANDLER (Pre-Signup Check)
// This allows the frontend to validate fields in real-time (as the user types).
export async function GET(req) {
  try {
    await connectDB();
    
    // Parse query parameters (e.g., ?username=john&phone=1234567890)
    const { searchParams } = new URL(req.url);
    const username = searchParams.get("username");
    const phone = searchParams.get("phone");

    // Build a dynamic query
    const query = [];
    if (username) query.push({ username });
    if (phone) query.push({ phone });

    if (query.length === 0) {
      return new Response(JSON.stringify({ error: "No params provided" }), { status: 400 });
    }

    // Check if any user matches EITHER the username OR the phone number
    const existingUser = await User.findOne({ $or: query });

    if (existingUser) {
        // Return specific feedback so the UI knows which field to highlight in red
        if (existingUser.phone === phone) {
            return new Response(JSON.stringify({ exists: true, field: "phone" }), { status: 200 });
        }
        if (existingUser.username === username) {
            return new Response(JSON.stringify({ exists: true, field: "username" }), { status: 200 });
        }
    }

    // If no match found, the data is available for use
    return new Response(JSON.stringify({ exists: false }), { status: 200 });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

// 3. POST HANDLER (Create User)
export async function POST(req) {
  try {
    await connectDB();
    const { name, username, phone, location, firebaseUid } = await req.json();

    // Basic Validation
    if (!name || !username || !phone || !firebaseUid) {
      return new Response(JSON.stringify({ error: "All fields are required" }), { status: 400 });
    }

    // Double-check existence (Safety net against direct API calls)
    const existingUser = await User.findOne({ 
        $or: [{ username }, { phone }] 
    });
    
    if (existingUser) {
        const msg = existingUser.phone === phone ? "Phone number already in use." : "Username already taken.";
        return new Response(JSON.stringify({ error: msg }), { status: 400 });
    }

    // 4. GEOJSON FORMATTING
    // MongoDB requires [Longitude, Latitude] order for geospatial queries.
    // Standard maps usually provide { lat, lng }. We must convert carefully.
    let formattedLocation = { type: "Point", coordinates: [0, 0], city: "" };

    if (location && location.lat && location.lng) {
      formattedLocation = {
        type: "Point",
        // CAUTION: MongoDB uses [Lng, Lat], NOT [Lat, Lng]
        coordinates: [parseFloat(location.lng), parseFloat(location.lat)], 
        city: location.city || "Unknown"
      };
    }

    // 5. CREATE DOCUMENT
    const newUser = new User({ 
        name, 
        username, 
        phone, 
        location: formattedLocation, 
        firebaseUid 
    });
    
    await newUser.save();

    return new Response(JSON.stringify({ message: "User created successfully" }), { status: 201 });
  } catch (err) {
    console.error(err);
    
    // 6. DUPLICATE KEY ERROR HANDLING
    // If a race condition occurs and MongoDB rejects the save due to a unique index violation:
    if (err.code === 11000) {
        return new Response(JSON.stringify({ error: "User data already exists." }), { status: 400 });
    }
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
// app/api/user/route.js
import connectDB from "./../../lib/mongodb";
import User from "./../../models/User";

export async function POST(req) {
  try {
    await connectDB();
    const { name, username, phone, location, firebaseUid } = await req.json();

    if (!name || !username || !phone || !firebaseUid) {
      return new Response(JSON.stringify({ error: "All fields are required" }), { status: 400 });
    }

    // FIX: Format location for MongoDB GeoJSON
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
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
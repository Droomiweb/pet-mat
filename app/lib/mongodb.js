import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("❌ MONGODB_URI is not defined in .env.local");
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections from growing exponentially
 * during API Route usage.
 */
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) {
    // Return the cached connection if it exists
    return cached.conn;
  }

  if (!cached.promise) {
    // If no connection promise exists, create one
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      console.log("✅ New MongoDB connected");
      return mongoose;
    });
  }
  
  try {
    // Wait for the connection promise to resolve
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null; // Reset promise on error
    console.error("MongoDB connection error:", err);
    throw err;
  }
  
  return cached.conn;
}

export default connectDB;
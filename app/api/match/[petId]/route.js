// app/api/match/[petId]/route.js

// Standard imports
import connectDB from "../../../lib/mongodb";
import { findMatches } from "../../../lib/matchLogic";

// GET request handler
export async function GET(req, context) {
  try {
    await connectDB();

    // Extract pet ID
    const { petId } = await context.params;

    if (!petId) {
      return new Response(JSON.stringify({ error: "Pet ID is required" }), { status: 400 });
    }

    try {
      const finalMatches = await findMatches(petId);
      // Return sorted matches
      return new Response(JSON.stringify(finalMatches), { status: 200 });
    } catch (e) {
      if (e.message === "User pet not found") {
        return new Response(JSON.stringify({ error: "User pet not found" }), { status: 404 });
      }
      throw e;
    }

  } catch (err) {
    console.error("Error in AI matchmaking route:", err);
    return new Response(JSON.stringify({ error: "Failed to get matches" }), { status: 500 });
  }
}
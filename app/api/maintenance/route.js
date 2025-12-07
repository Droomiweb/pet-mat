// app/api/maintenance/route.js

// 1. IMPORTS
import connectDB from "../../lib/mongodb";
import SystemSettings from "../../models/SystemSettings";

// 2. CONSTANTS
// We use a specific, hardcoded string for the ID.
// This ensures we always modify the same "Global Settings" document 
// rather than creating new ones every time we save.
const SYSTEM_SETTINGS_ID = 'website_settings';

// 3. GET HANDLER
// Checks the current status (Used by Middleware and Admin Dashboard)
export async function GET() {
  try {
    await connectDB();
    
    // Attempt to find the singleton document
    const settings = await SystemSettings.findById(SYSTEM_SETTINGS_ID);

    // Return the status.
    // If settings is null (first run), default to false (Site is Live).
    return new Response(JSON.stringify({ 
      isMaintenanceMode: settings?.isMaintenanceMode || false 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Error fetching maintenance status:", err);
    return new Response(JSON.stringify({ error: "Failed to fetch status" }), { status: 500 });
  }
}

// 4. PATCH HANDLER
// Toggles the status (Used by Admin Dashboard)
export async function PATCH(req) {
  try {
    await connectDB();
    const { isMaintenanceMode } = await req.json();

    // 5. UPSERT LOGIC
    // findByIdAndUpdate is powerful here:
    // - Arg 1: The ID to look for.
    // - Arg 2: The data to update.
    // - Arg 3: Options -> { new: true } returns the updated doc, { upsert: true } creates it if missing.
    const updatedSettings = await SystemSettings.findByIdAndUpdate(
      SYSTEM_SETTINGS_ID,
      { 
        _id: SYSTEM_SETTINGS_ID, // Explicitly set ID for the creation case
        isMaintenanceMode 
      },
      { new: true, upsert: true } 
    );

    return new Response(JSON.stringify({ 
      message: "Maintenance status updated", 
      settings: updatedSettings 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Error updating maintenance status:", err);
    return new Response(JSON.stringify({ error: "Failed to update status" }), { status: 500 });
  }
}
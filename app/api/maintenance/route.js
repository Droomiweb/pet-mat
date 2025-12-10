// app/api/maintenance/route.js

// Standard imports
import connectDB from "../../lib/mongodb";
import SystemSettings from "../../models/SystemSettings";

// Define settings ID
const SYSTEM_SETTINGS_ID = 'website_settings';

// GET request handler
export async function GET() {
  try {
    await connectDB();
    
    // Find settings document
    const settings = await SystemSettings.findById(SYSTEM_SETTINGS_ID);

    // Return status
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

// PATCH request handler
export async function PATCH(req) {
  try {
    await connectDB();
    const { isMaintenanceMode } = await req.json();

    // Update or create
    const updatedSettings = await SystemSettings.findByIdAndUpdate(
      SYSTEM_SETTINGS_ID,
      { 
        _id: SYSTEM_SETTINGS_ID, // Set explicit ID
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
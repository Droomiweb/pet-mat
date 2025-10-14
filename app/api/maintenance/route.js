// app/api/maintenance/route.js
import connectDB from "../../lib/mongodb";
import SystemSettings from "../../models/SystemSettings";

// A single document to hold global website settings
const SYSTEM_SETTINGS_ID = 'website_settings';

// GET the current maintenance status
export async function GET() {
  try {
    await connectDB();
    const settings = await SystemSettings.findById(SYSTEM_SETTINGS_ID);
    return new Response(JSON.stringify({ isMaintenanceMode: settings?.isMaintenanceMode || false }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error fetching maintenance status:", err);
    return new Response(JSON.stringify({ error: "Failed to fetch status" }), { status: 500 });
  }
}

// PATCH to toggle the maintenance status
export async function PATCH(req) {
  try {
    await connectDB();
    const { isMaintenanceMode } = await req.json();

    // Find and update the settings document. Create it if it doesn't exist.
    const updatedSettings = await SystemSettings.findByIdAndUpdate(
      SYSTEM_SETTINGS_ID,
      { isMaintenanceMode },
      { new: true, upsert: true }
    );

    return new Response(JSON.stringify({ message: "Maintenance status updated", settings: updatedSettings }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error updating maintenance status:", err);
    return new Response(JSON.stringify({ error: "Failed to update status" }), { status: 500 });
  }
}
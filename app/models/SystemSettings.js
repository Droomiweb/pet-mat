// app/models/SystemSettings.js
import mongoose from "mongoose";

const systemSettingsSchema = new mongoose.Schema({
  _id: String, // We'll use a fixed ID like 'website_settings'
  isMaintenanceMode: { type: Boolean, default: false },
});

const SystemSettings = mongoose.models.SystemSettings || mongoose.model("SystemSettings", systemSettingsSchema);
export default SystemSettings;
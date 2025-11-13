// app/models/User.js
import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  firebaseUid: { type: String, required: true, unique: true },
  
  // UPDATED: Add a 'type' field and a '2dsphere' index
  // The 'type' must be "Point" for geospatial queries.
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude] format
      default: [0, 0]
    },
    city: { // We can keep the city name for display
      type: String,
      default: ""
    }
  },
  // --- END UPDATE ---

  isAdmin: { type: Boolean, default: false },
  isBanned: { type: Boolean, default: false }
}, { timestamps: true });

// --- ADD THIS INDEX ---
// This tells MongoDB to create a 2dsphere index on the 'location'
// field, which is necessary for $geoNear queries.
UserSchema.index({ location: '2dsphere' });
// --- END ADD ---

const User = mongoose.models.User || mongoose.model("User", UserSchema);
export default User;
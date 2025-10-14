// app/models/User.js
import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  firebaseUid: { type: String, required: true, unique: true },
  location: {
    lat: Number,
    lng: Number,
  },
  // New field to check if the user is an admin
  isAdmin: { type: Boolean, default: false },
  // NEW FIELD for user banning
  isBanned: { type: Boolean, default: false }
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model("User", UserSchema);
export default User;
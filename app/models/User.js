import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  firebaseUid: { type: String, required: true, unique: true }, // Firebase UID
  location: {
    lat: Number,
    lng: Number,
  },
}, { timestamps: true }); // optional: tracks createdAt and updatedAt

const User = mongoose.models.User || mongoose.model("User", UserSchema);
export default User;

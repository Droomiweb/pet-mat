// app/api/auth/reset-password/route.js

// Standard imports
import connectDB from "../../../lib/mongodb";
import User from "../../../models/User";
// Import Firebase Admin
import admin from "../../../lib/firebaseAdmin";
import jwt from 'jsonwebtoken';

export async function POST(req) {
  try {
    await connectDB();

    // Parse request data
    const { username, newPassword, resetToken } = await req.json();

    if (!username || !newPassword || !resetToken) {
      return new Response(JSON.stringify({ error: "Username, new password, and reset token are required." }), { status: 400 });
    }

    // Verify Token
    try {
      const secret = process.env.JWT_SECRET || 'temporary-dev-secret-change-in-prod';
      const decoded = jwt.verify(resetToken, secret);

      if (decoded.username !== username || decoded.type !== 'password-reset') {
        return new Response(JSON.stringify({ error: "Invalid reset token." }), { status: 403 });
      }
    } catch (tokenErr) {
      console.error("Token verification failed:", tokenErr.message);
      return new Response(JSON.stringify({ error: "Invalid or expired reset token. Please verify OTP again." }), { status: 403 });
    }

    // Find user record
    const user = await User.findOne({ username: username });

    if (!user) {
      return new Response(JSON.stringify({ error: "User not found." }), { status: 404 });
    }

    // Update Firebase password
    try {
      await admin.auth().updateUser(user.firebaseUid, {
        password: newPassword,
      });

      console.log(`Password reset for user: ${user.username} (UID: ${user.firebaseUid})`);

    } catch (firebaseErr) {
      console.error("Firebase update failed:", firebaseErr);
      // Handle weak password
      if (firebaseErr.code === 'auth/weak-password') {
        return new Response(JSON.stringify({ error: "Password is too weak. Must be at least 6 characters." }), { status: 400 });
      }
      return new Response(JSON.stringify({ error: "Failed to update security credentials." }), { status: 500 });
    }

    // Return success message
    return new Response(JSON.stringify({ message: "Password reset successfully. You may now log in." }), { status: 200 });

  } catch (err) {
    // Handle server errors
    console.error("Error resetting password:", err);
    return new Response(JSON.stringify({ error: "Server error during password reset." }), { status: 500 });
  }
}
// app/api/auth/reset-password/route.js

// 1. IMPORTS
import connectDB from "../../../lib/mongodb";
import User from "../../../models/User";
// We import the initialized Admin SDK helper we created earlier
import admin from "../../../lib/firebaseAdmin"; 

export async function POST(req) {
  try {
    await connectDB();
    
    // 2. PARSE REQUEST
    // We expect the username (to find the user) and the new password they want.
    const { username, newPassword } = await req.json();

    if (!username || !newPassword) {
      return new Response(JSON.stringify({ error: "Username and new password are required." }), { status: 400 });
    }

    // 3. FIND USER IN MONGODB
    // We need the 'firebaseUid' to tell Firebase which user to update.
    const user = await User.findOne({ username: username });

    if (!user) {
        return new Response(JSON.stringify({ error: "User not found." }), { status: 404 });
    }
    
    // 4. RESET PASSWORD IN FIREBASE (Server-Side)
    // This is the "God Mode" action. Because we are using the Admin SDK, 
    // we don't need the old password to set a new one.
    try {
        await admin.auth().updateUser(user.firebaseUid, {
            password: newPassword,
        });
        
        console.log(`Password reset for user: ${user.username} (UID: ${user.firebaseUid})`);

    } catch (firebaseErr) {
        console.error("Firebase update failed:", firebaseErr);
        // Common error: Password must be at least 6 chars
        if (firebaseErr.code === 'auth/weak-password') {
             return new Response(JSON.stringify({ error: "Password is too weak. Must be at least 6 characters." }), { status: 400 });
        }
        return new Response(JSON.stringify({ error: "Failed to update security credentials." }), { status: 500 });
    }
    
    // 5. SUCCESS RESPONSE
    return new Response(JSON.stringify({ message: "Password reset successfully. You may now log in." }), { status: 200 });

  } catch (err) {
    console.error("Error resetting password:", err);
    return new Response(JSON.stringify({ error: "Server error during password reset." }), { status: 500 });
  }
}
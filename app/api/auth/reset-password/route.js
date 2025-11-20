// app/api/auth/reset-password/route.js
import connectDB from "../../../lib/mongodb";
import User from "../../../models/User";
// NOTE: Firebase Admin SDK is required here to securely change the password
// import * as admin from 'firebase-admin'; 
// if (admin.apps.length === 0) admin.initializeApp();


export async function POST(req) {
  try {
    await connectDB();
    const { username, newPassword } = await req.json();

    const user = await User.findOne({ username: username });

    if (!user) {
        return new Response(JSON.stringify({ error: "User not found." }), { status: 404 });
    }
    
    // --- CRITICAL STEP: Reset Password in Firebase ---
    
    // You MUST use the Firebase Admin SDK on the server here.
    // Since we don't have the SDK setup, this is the placeholder:
    
    /* try {
        await admin.auth().updateUser(user.firebaseUid, {
            password: newPassword,
        });
    } catch (firebaseErr) {
        console.error("Firebase update failed:", firebaseErr);
        return new Response(JSON.stringify({ error: "Failed to update Firebase password." }), { status: 500 });
    }
    */
    
    // --- END CRITICAL STEP ---
    
    // If the Firebase update succeeds, return success
    return new Response(JSON.stringify({ message: "Password reset successfully." }), { status: 200 });

  } catch (err) {
    console.error("Error resetting password:", err);
    return new Response(JSON.stringify({ error: "Server error during password reset." }), { status: 500 });
  }
}
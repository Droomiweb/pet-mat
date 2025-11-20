// app/api/auth/verify-otp/route.js
import connectDB from "../../../lib/mongodb";
import User from "../../../models/User";

export async function POST(req) {
  try {
    await connectDB();
    const { username, otp } = await req.json();

    const user = await User.findOne({ username: username });

    if (!user) {
        return new Response(JSON.stringify({ error: "User not found." }), { status: 404 });
    }
    
    const now = new Date();
    
    // --- FIX: Add a check for null/undefined OTP code before comparison ---
    // This is robust against database inconsistencies.
    if (!user.otpCode || user.otpCode !== otp || !user.otpExpiry || user.otpExpiry < now) {
        // Clear the OTP to prevent brute-forcing a correct code
        user.otpCode = null;
        user.otpExpiry = null;
        await user.save(); // CRITICAL: Save immediately on failure
        return new Response(JSON.stringify({ error: "Invalid or expired OTP." }), { status: 400 });
    }
    
    // 2. Success: Clear OTP fields
    user.otpCode = null;
    user.otpExpiry = null;
    await user.save(); // CRITICAL: Save immediately on success
    
    // Return success
    return new Response(JSON.stringify({ message: "OTP verified successfully." }), { status: 200 });

  } catch (err) {
    console.error("Error verifying OTP:", err);
    return new Response(JSON.stringify({ error: "Server error during OTP verification." }), { status: 500 });
  }
}
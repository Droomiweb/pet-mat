// app/api/auth/verify-otp/route.js

// 1. IMPORTS
import connectDB from "../../../lib/mongodb";
import User from "../../../models/User";

export async function POST(req) {
  try {
    // Ensure DB connection
    await connectDB();
    
    // 2. PARSE REQUEST
    // We expect the username (to identify the user) and the 6-digit OTP code they typed.
    const { username, otp } = await req.json();

    if (!username || !otp) {
        return new Response(JSON.stringify({ error: "Username and OTP are required." }), { status: 400 });
    }

    // 3. FIND USER
    const user = await User.findOne({ username: username });

    if (!user) {
        return new Response(JSON.stringify({ error: "User not found." }), { status: 404 });
    }
    
    // Capture current time for expiry comparison
    const now = new Date();
    
    // 4. VERIFICATION LOGIC (The "Four Gates")
    // Gate 1: !user.otpCode -> Did we even send one?
    // Gate 2: user.otpCode !== otp -> Did they type it wrong?
    // Gate 3: !user.otpExpiry -> Is data corrupted?
    // Gate 4: user.otpExpiry < now -> Has time run out?
    if (!user.otpCode || user.otpCode !== otp || !user.otpExpiry || user.otpExpiry < now) {
        
        // --- SECURITY MEASURE ---
        // If they fail, we wipe the OTP immediately. 
        // This prevents hackers from spamming guesses (Brute Force). 
        // The user must request a new code.
        user.otpCode = null;
        user.otpExpiry = null;
        await user.save(); 

        return new Response(JSON.stringify({ error: "Invalid or expired OTP. Please request a new one." }), { status: 400 });
    }
    
    // 5. SUCCESS & CLEANUP
    // The OTP was correct. Now we remove it so it can't be used a second time.
    user.otpCode = null;
    user.otpExpiry = null;
    await user.save(); 
    
    // Return success. The frontend should now redirect the user to the "Enter New Password" screen.
    return new Response(JSON.stringify({ message: "OTP verified successfully." }), { status: 200 });

  } catch (err) {
    console.error("Error verifying OTP:", err);
    return new Response(JSON.stringify({ error: "Server error during OTP verification." }), { status: 500 });
  }
}
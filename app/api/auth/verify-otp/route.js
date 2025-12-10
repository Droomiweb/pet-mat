// app/api/auth/verify-otp/route.js

// Standard imports
import connectDB from "../../../lib/mongodb";
import User from "../../../models/User";

export async function POST(req) {
  try {
    // Connect to database
    await connectDB();
    
    // Parse request data
    const { username, otp } = await req.json();

    // Validate required fields
    if (!username || !otp) {
        return new Response(JSON.stringify({ error: "Username and OTP are required." }), { status: 400 });
    }

    // Find user record
    const user = await User.findOne({ username: username });

    // Handle missing user
    if (!user) {
        return new Response(JSON.stringify({ error: "User not found." }), { status: 404 });
    }
    
    // Get current time
    const now = new Date();
    
    // Verify OTP validity
    if (!user.otpCode || user.otpCode !== otp || !user.otpExpiry || user.otpExpiry < now) {
        
        // Clear invalid OTP
        user.otpCode = null;
        user.otpExpiry = null;
        await user.save(); 

        return new Response(JSON.stringify({ error: "Invalid or expired OTP. Please request a new one." }), { status: 400 });
    }
    
    // Clear used OTP
    user.otpCode = null;
    user.otpExpiry = null;
    await user.save(); 
    
    // Return success response
    return new Response(JSON.stringify({ message: "OTP verified successfully." }), { status: 200 });

  } catch (err) {
    // Handle server errors
    console.error("Error verifying OTP:", err);
    return new Response(JSON.stringify({ error: "Server error during OTP verification." }), { status: 500 });
  }
}
// app/api/auth/send-otp/route.js
import connectDB from "../../../lib/mongodb";
import User from "../../../models/User";
import { sendWhatsAppText } from "../../../lib/greenApi"; 

// Helper to generate a 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

export async function POST(req) {
  try {
    await connectDB();
    const { username } = await req.json();

    const user = await User.findOne({ username: username });

    if (!user) {
        return new Response(JSON.stringify({ error: "User not found." }), { status: 404 });
    }
    
    // 1. Generate OTP and Expiry (5 minutes)
    const otpCode = generateOTP();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now

    // 2. Save to User Model
    user.otpCode = otpCode;
    user.otpExpiry = otpExpiry;
    await user.save();
    
    // 3. Send OTP via WhatsApp
    const whatsappMessage = `Your PetLink Password Reset OTP is: ${otpCode}. It expires in 5 minutes. Do not share this code.`;
    
    // Assuming 'phone' is a 10-digit number and prepending '91' for India
    const fullPhoneNumber = `91${user.phone}`;
    
    await sendWhatsAppText(fullPhoneNumber, whatsappMessage);

    return new Response(JSON.stringify({ message: "OTP sent successfully." }), { status: 200 });

  } catch (err) {
    console.error("Error sending OTP:", err);
    // Return a generic error status (500) if sending fails, but log the specific error
    return new Response(JSON.stringify({ error: "Failed to send OTP. Please check your username and registered phone number." }), { status: 500 });
  }
}
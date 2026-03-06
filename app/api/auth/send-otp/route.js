// app/api/auth/send-otp/route.js

// Standard imports
import connectDB from "../../../lib/mongodb";
import User from "../../../models/User";
// Import WhatsApp helper
import { sendWhatsAppText } from "../../../lib/greenApi"; 

// Generate random OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

export async function POST(req) {
  try {
    await connectDB();
    
    // Parse request data
    const { username } = await req.json();

    if (!username) {
        return new Response(JSON.stringify({ error: "Username is required." }), { status: 400 });
    }

    // Find user record
    const user = await User.findOne({ username: username });

    if (!user) {
        // Handle missing user
        return new Response(JSON.stringify({ error: "User not found." }), { status: 404 });
    }
    
    if (!user.phone) {
        return new Response(JSON.stringify({ error: "No phone number linked to this account." }), { status: 400 });
    }

    // Create OTP data
    const otpCode = generateOTP();
    // Set 5-minute expiry
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); 

    // Save OTP details
    user.otpCode = otpCode;
    user.otpExpiry = otpExpiry;
    await user.save();
    
    // Format WhatsApp message
    const whatsappMessage = `Your PetLink Password Reset OTP is: *${otpCode}*. It expires in 5 minutes. Do not share this code.`;
    
    // Format phone number
    const cleanPhone = String(user.phone).replace(/\D/g, "");
    const fullPhoneNumber = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
    
    // Send WhatsApp message
    try {
        await sendWhatsAppText(fullPhoneNumber, whatsappMessage);
    } catch (apiError) {
        console.error("Green API Failed:", apiError);
        return new Response(JSON.stringify({ error: "Failed to send message via WhatsApp provider." }), { status: 502 });
    }

    // Return success message
    return new Response(JSON.stringify({ message: "OTP sent successfully via WhatsApp." }), { status: 200 });

  } catch (err) {
    // Handle server errors
    console.error("Error sending OTP:", err);
    return new Response(JSON.stringify({ error: "Server error sending OTP." }), { status: 500 });
  }
}
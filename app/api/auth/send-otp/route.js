// app/api/auth/send-otp/route.js

// 1. IMPORTS
import connectDB from "../../../lib/mongodb";
import User from "../../../models/User";
// Import the helper function we created for Green API
import { sendWhatsAppText } from "../../../lib/greenApi"; 

// 2. HELPER FUNCTION
// Generates a random 6-digit string (e.g., "123456")
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

export async function POST(req) {
  try {
    await connectDB();
    
    // 3. PARSE REQUEST
    // We only need the username to find the user's phone number.
    const { username } = await req.json();

    if (!username) {
        return new Response(JSON.stringify({ error: "Username is required." }), { status: 400 });
    }

    // 4. FIND USER
    const user = await User.findOne({ username: username });

    if (!user) {
        // Security Note: In high-security apps, you might return "OTP sent" even if user not found
        // to prevent username enumeration, but for this app, 404 is user-friendly.
        return new Response(JSON.stringify({ error: "User not found." }), { status: 404 });
    }
    
    if (!user.phone) {
        return new Response(JSON.stringify({ error: "No phone number linked to this account." }), { status: 400 });
    }

    // 5. GENERATE OTP DATA
    const otpCode = generateOTP();
    // Set expiry for 5 minutes from now (5 * 60 seconds * 1000 milliseconds)
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); 

    // 6. SAVE TO DB
    // We update the user document with the code and the expiry time.
    user.otpCode = otpCode;
    user.otpExpiry = otpExpiry;
    await user.save();
    
    // 7. SEND WHATSAPP MESSAGE
    const whatsappMessage = `Your PetLink Password Reset OTP is: *${otpCode}*. It expires in 5 minutes. Do not share this code.`;
    
    // Formatting: Ensure number has country code (Assuming India '91')
    // A robust app would store the country code separately or validate it on signup.
    const fullPhoneNumber = `91${user.phone}`;
    
    // Call our external API helper
    // Note: We await this to ensure we return an error if the API fails
    try {
        await sendWhatsAppText(fullPhoneNumber, whatsappMessage);
    } catch (apiError) {
        console.error("Green API Failed:", apiError);
        return new Response(JSON.stringify({ error: "Failed to send message via WhatsApp provider." }), { status: 502 });
    }

    // 8. SUCCESS RESPONSE
    return new Response(JSON.stringify({ message: "OTP sent successfully via WhatsApp." }), { status: 200 });

  } catch (err) {
    console.error("Error sending OTP:", err);
    return new Response(JSON.stringify({ error: "Server error sending OTP." }), { status: 500 });
  }
}
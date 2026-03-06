import { sendWhatsAppText } from "../../lib/greenApi";

export async function POST(req) {
  try {
    const { phone, message } = await req.json();
    
    if (!phone || !message) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Missing phone number or message content." 
      }), { status: 400 });
    }

    const result = await sendWhatsAppText(phone, message);
    
    if (!result) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Green API credentials (INSTANCE_ID or TOKEN) are missing in .env.local" 
      }), { status: 500 });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      data: result 
    }), { status: 200 });

  } catch (error) {
    console.error("Test WhatsApp API Route Error:", error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), { status: 500 });
  }
}
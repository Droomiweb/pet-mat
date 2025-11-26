// app/lib/whatsapp.js
const META_PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID;
const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;

export async function sendWhatsAppText(phoneNumber, text) {
  // 1. Check Credentials
  if (!META_PHONE_NUMBER_ID || !META_ACCESS_TOKEN) {
    console.error("Meta WhatsApp API credentials missing in .env.local");
    return null;
  }

  const url = `https://graph.facebook.com/v21.0/${META_PHONE_NUMBER_ID}/messages`;

  // 2. Format Phone Number (Remove special chars, ensure only digits)
  // Meta requires country code without '+' (e.g., 918590814463)
  const cleanPhone = String(phoneNumber).replace(/\D/g, "");

  const body = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: cleanPhone,
    type: "text",
    text: { body: text },
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${META_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      // Detailed logging for debugging Meta errors
      console.error("Meta WhatsApp API Error:", JSON.stringify(data, null, 2));
      throw new Error(data.error?.message || "Failed to send WhatsApp message.");
    }

    return data;
  } catch (error) {
    console.error("WhatsApp Send Error:", error.message);
    // We re-throw the error so the calling API knows it failed
    throw error; 
  }
}
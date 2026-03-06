// lib/greenApi.js

/**
 * Sends a WhatsApp text message using Green API.
 * @param {string} phoneNumber - Full number with country code (e.g., "919876543210")
 * @param {string} message - The text content to send
 */
export async function sendWhatsAppText(phoneNumber, message) {
  const idInstance = process.env.GREEN_API_INSTANCE_ID;
  const apiToken = process.env.GREEN_API_TOKEN;

  if (!idInstance || !apiToken) {
    console.error("Green API Credentials missing in .env.local: GREEN_API_INSTANCE_ID or GREEN_API_TOKEN is empty.");
    return { error: "CREDENTIALS_MISSING", details: "ID Instance or Token not found in environment." };
  }

  const url = `https://api.green-api.com/waInstance${idInstance}/sendMessage/${apiToken}`;

  const payload = {
    chatId: `${phoneNumber}@c.us`,
    message: message
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      let errorInfo;
      try {
        errorInfo = await response.json();
      } catch (e) {
        errorInfo = await response.text();
      }
      throw new Error(`Green API Error (${response.status}): ${typeof errorInfo === 'object' ? JSON.stringify(errorInfo) : errorInfo}`);
    }

    try {
      return await response.json();
    } catch (e) {
      const text = await response.text();
      return { success: true, message: "Message sent, but response was not JSON", raw: text };
    }
  } catch (error) {
    console.error("Failed to send WhatsApp message:", error.message);
    throw error; 
  }
}

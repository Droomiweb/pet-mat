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
    console.error("Green API Credentials missing in .env");
    return null;
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
      const errorData = await response.json();
      throw new Error(`Green API Error: ${JSON.stringify(errorData)}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to send WhatsApp message:", error.message);
    throw error; 
  }
}

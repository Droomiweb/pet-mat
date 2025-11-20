// lib/greenApi.js
import whatsAppClient from "@green-api/whatsapp-api-client";

const idInstance = process.env.GREEN_API_INSTANCE_ID;
const apiTokenInstance = process.env.GREEN_API_TOKEN;

const restAPI = whatsAppClient.restAPI({
  idInstance,
  apiTokenInstance,
});

export async function sendWhatsAppText(phoneNumber, text) {
  // phoneNumber like "919876543210"
  const chatId = `${phoneNumber}@c.us`;
  return restAPI.message.sendMessage(chatId, null, text);
}

// lib/greenApi.js
import whatsAppClient from "@green-api/whatsapp-api-client";

let restAPI = null;

function getRestAPI() {
  if (restAPI) return restAPI;

  const idInstance = process.env.GREEN_API_INSTANCE_ID;
  const apiTokenInstance = process.env.GREEN_API_TOKEN;

  if (!idInstance || !apiTokenInstance) {
    throw new Error("GreenAPI credentials missing");
  }

  restAPI = whatsAppClient.restAPI({
    idInstance,
    apiTokenInstance,
  });
  return restAPI;
}

export async function sendWhatsAppText(phoneNumber, text) {
  // phoneNumber like "919876543210"
  const chatId = `${phoneNumber}@c.us`;
  // Initialize lazily
  const api = getRestAPI();
  return api.message.sendMessage(chatId, null, text);
}

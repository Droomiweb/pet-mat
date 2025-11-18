// app/api/ai-chat/route.js
import { textModel } from "../../lib/gemini";

export async function POST(req) {
  try {
    const { history, message } = await req.json();

    // 1. Start the chat session with the history provided by the client
    // API routes are stateless, so we restart the chat with context every time.
    const chat = textModel.startChat({
      history: history,
    });

    // 2. Send the user's new message
    const result = await chat.sendMessage(message);
    const response = await result.response;
    const text = response.text();

    // 3. Return the AI's response
    return new Response(JSON.stringify({ text }), { 
      status: 200,
      headers: { "Content-Type": "application/json" } 
    });

  } catch (error) {
    console.error("AI Chat Error:", error);
    return new Response(JSON.stringify({ error: "Failed to generate response" }), { status: 500 });
  }
}
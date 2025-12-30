// app/lib/gemini.js
import { GoogleGenerativeAI } from "@google/generative-ai";

// 1. CONFIGURATION
const geminiKeys = (process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || "")
  .split(",").map(k => k.replace(/["']/g, "").trim()).filter(k => k);

const groqKey = process.env.GROQ_API_KEY;

if (geminiKeys.length === 0) console.warn("⚠️ No Gemini Keys found in env vars.");
else console.log(`✅ Loaded ${geminiKeys.length} Gemini API Keys.`);
if (!groqKey) console.warn("⚠️ No Groq API Key found. Free backup will not work.");

// 2. GROQ (FREE BACKUP) HANDLER
async function callGroqAPI(messages, isVision = false) {
  if (!groqKey) throw new Error("Groq API Key is missing.");

  console.log("🛡️ ACTIVATING SHIELD: Switching to Groq (Llama 3) Backup...");

  // Use Llama 3.3 for text (Vision deprecated)
  // const model = isVision ? "llama-3.2-90b-vision-preview" : "llama-3.3-70b-versatile";
  const model = "llama-3.3-70b-versatile"; // Force stable text model

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${groqKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: 0.7,
        max_tokens: 1024
      })
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Groq API Error: ${response.status} - ${err}`);
    }

    const data = await response.json();
    const text = data.choices[0]?.message?.content || "";

    // Mock Gemini Response Structure
    return { response: { text: () => text } };
  } catch (error) {
    console.error("❌ Groq Backup Failed:", error);
    throw error;
  }
}

// Helper: Convert Gemini Format -> OpenAI/Groq Format
function convertToGroqFormat(history, newMessage, inlineImages = []) {
  const messages = [];

  // Convert History
  if (history && Array.isArray(history)) {
    history.forEach(item => {
      const role = item.role === "model" ? "assistant" : "user";
      const text = item.parts?.[0]?.text || "";
      if (text) messages.push({ role, content: text });
    });
  }

  // Add New Message
  if (inlineImages.length > 0) {
    const content = [{ type: "text", text: newMessage }];
    inlineImages.forEach(img => {
      content.push({
        type: "image_url",
        image_url: { url: `data:${img.inlineData.mimeType};base64,${img.inlineData.data}` }
      });
    });
    messages.push({ role: "user", content });
  } else {
    messages.push({ role: "user", content: newMessage });
  }

  return messages;
}

// 3. MAIN ENGINE (Gemini -> Failover -> Groq)
async function executeHybridRequest(type, params) {
  let lastError = null;

  // --- PHASE A: TRY GEMINI KEYS ---
  const shuffledKeys = [...geminiKeys].sort(() => 0.5 - Math.random());

  for (const key of shuffledKeys) {
    try {
      const genAI = new GoogleGenerativeAI(key);
      // Use stable 1.5 Flash model
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      if (type === "chat") {
        const chat = model.startChat({ history: params.history || [] });
        return await chat.sendMessage(params.message);
      } else {
        // Handle Generate (Text or Vision)
        return await model.generateContent(params.inputParts);
      }
    } catch (error) {
      lastError = error;
      const msg = error.message?.toLowerCase() || "";

      // Explicitly log the key (masked) to track rotation
      const maskedKey = `...${key.slice(-4)}`;
      console.warn(`⚠️ Gemini Key ${maskedKey} Failed. Error: ${msg.slice(0, 100)}...`);

      // 429 = Quota, 400 = Invalid Key/Request (Failover to next key)
      // Actually we should try the next key for ANY error except maybe fatal ones?
      // For now, we continue for all errors to give other keys a chance.
      continue;
    }
  }

  // --- PHASE B: FALLBACK TO GROQ (FREE) ---
  console.warn("⚠️ All Gemini Keys failed. Switching to Groq (Free Tier)...");

  try {
    if (type === "chat") {
      const messages = convertToGroqFormat(params.history, params.message);
      return await callGroqAPI(messages, false);
    } else {
      // Handle "generate" (Text or Vision)
      // STABILITY FIX: Groq Vision models are unstable/decommissioned. 
      // We will fallback to TEXT-ONLY mode for reliability.

      let textPrompt = "";

      const parts = Array.isArray(params.inputParts) ? params.inputParts : [params.inputParts];
      parts.forEach(part => {
        if (typeof part === 'string') textPrompt += part;
        else if (part.text) textPrompt += part.text;
      });

      console.log("ℹ️ Groq Fallback: Stripping images, using text-only prompt.");

      const messages = convertToGroqFormat([], textPrompt, []);
      return await callGroqAPI(messages, false); // force isVision=false
    }
  } catch (groqError) {
    console.error("❌ CRITICAL: Both Gemini and Groq failed.");
    throw lastError || groqError;
  }
}

// 4. EXPORTS
export const textModel = {
  startChat: (config) => ({
    sendMessage: (message) => executeHybridRequest("chat", { history: config.history, message })
  }),
  // ADDED THIS MISSING FUNCTION:
  generateContent: (input) => executeHybridRequest("generate", { inputParts: input })
};

export const visionModel = {
  generateContent: (inputParts) => executeHybridRequest("generate", { inputParts })
};
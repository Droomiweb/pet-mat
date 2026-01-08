// app/lib/gemini.js
import { GoogleGenerativeAI } from "@google/generative-ai";
import connectDB from "./mongodb";
import GeminiKey from "../models/GeminiKey";

// 1. CONFIGURATION
const groqKey = process.env.GROQ_API_KEY;

// User provided key + Env keys
const INITIAL_SEED_KEYS = [
  ...(process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || "")
    .split(",").map(k => k.replace(/["']/g, "").trim()).filter(k => k)
];

// Global Cache
let globalKeyCache = [];
let lastCacheUpdate = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 Minutes

if (!groqKey) console.warn("⚠️ No Groq API Key found. Free backup will not work.");

// 2. DATABASE MANAGEMENT
async function fetchActiveKeys() {
  const now = Date.now();
  
  // Return cache if fresh
  if (globalKeyCache.length > 0 && (now - lastCacheUpdate < CACHE_TTL)) {
    return globalKeyCache;
  }

  try {
    await connectDB();
    
    // Auto-Seed if DB is empty (First Run)
    const count = await GeminiKey.countDocuments();
    if (count === 0 && INITIAL_SEED_KEYS.length > 0) {
      console.log("🌱 Seeding Database with Initial Keys...");
      for (const key of INITIAL_SEED_KEYS) {
        // Upsert to be safe
        await GeminiKey.findOneAndUpdate(
          { key: key }, 
          { key: key, isActive: true }, 
          { upsert: true, new: true }
        );
      }
    }

    // Fetch Active Keys
    const keys = await GeminiKey.find({ isActive: true }).select("key failureCount");
    
    if (keys.length > 0) {
      globalKeyCache = keys.map(k => k.key);
      lastCacheUpdate = now;
      console.log(`✅ Refreshed Cache: ${keys.length} Active Keys from DB.`);
    } else {
      console.warn("⚠️ No active keys in DB. Falling back to static seed list.");
      globalKeyCache = INITIAL_SEED_KEYS;
    }

  } catch (err) {
    console.error("❌ DB Key Fetch Failed (Using Cache/Fallback):", err);
    if (globalKeyCache.length === 0) globalKeyCache = INITIAL_SEED_KEYS;
  }

  return globalKeyCache;
}

async function reportKeyFailure(key) {
  try {
    await connectDB();
    await GeminiKey.updateOne(
        { key: key }, 
        { $inc: { failureCount: 1 }, $set: { lastUsed: new Date() } }
    );
     // If failure count > 50, maybe auto-disable? (Optional future logic)
  } catch (e) {
    console.error("Failed to report key failure:", e);
  }
}

// 3. GROQ (FREE BACKUP) HANDLER
async function callGroqAPI(messages, isVision = false) {
  if (!groqKey) throw new Error("Groq API Key is missing.");

  // NOTE: Groq vision models (Llama 3.2 Vision) are currently decommissioned.
  // We use the powerful 70b model for text-only fallback.
  const model = "llama-3.3-70b-versatile";
  console.log(`🛡️ ACTIVATING SHIELD: Switching to Groq Backup (${model})...`);

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

  // Prepare New Message Content
  let content = [];
  
  // 1. Add Text
  if (newMessage) {
      content.push({ type: "text", text: newMessage });
  }

  // 2. Add Images (ONLY if we find a working vision model, currently stripped for stability)
  if (inlineImages.length > 0) {
      console.warn("⚠️ Groq Fallback: Stripping images as current Groq models (llama-3.3) do not support Vision.");
      // images are omitted from 'content' to prevent 400 Bad Request
  }

  // 3. Fallback if empty
  if (content.length === 0) {
      content.push({ type: "text", text: "Analyze this." });
  }

  // 4. Construct Message
  if (content.length === 1 && content[0].type === "text") {
       messages.push({ role: "user", content: content[0].text });
  } else {
       messages.push({ role: "user", content: content });
  }

  return messages;
}

// 4. MAIN ENGINE (Gemini -> Failover -> Groq)
async function executeHybridRequest(type, params) {
  let lastError = null;

  // --- PHASE A: FETCH & ROTATE KEYS ---
  const activeKeys = await fetchActiveKeys();
  const shuffledKeys = [...activeKeys].sort(() => 0.5 - Math.random());

  for (const key of shuffledKeys) {
    try {
      const genAI = new GoogleGenerativeAI(key);
      const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

      if (type === "chat") {
        const chat = model.startChat({ history: params.history || [] });
        return await chat.sendMessage(params.message);
      } else {
        return await model.generateContent(params.inputParts);
      }
    } catch (error) {
      lastError = error;
      const maskedKey = `...${key.slice(-4)}`;
      console.warn(`⚠️ Gemini Key ${maskedKey} Failed. Detail: ${error.message}`);
      
      // Async failure reporting
      reportKeyFailure(key).catch(e => {});

      continue;
    }
  }

  // --- PHASE B: FALLBACK TO GROQ (FREE) ---
  console.warn("⚠️ All Gemini Keys failed. Switching to Groq (Free Tier)...");

  try {
    if (type === "chat") {
      const messages = convertToGroqFormat(params.history, params.message);
      const result = await callGroqAPI(messages, false);
      console.log("✅ Groq Fallback Success (Chat)");
      return result;
    } else {
      // HANDLE GENERATE (Possible Vision)
      let textPrompt = "";
      let inlineImages = [];

      const parts = Array.isArray(params.inputParts) ? params.inputParts : [params.inputParts];
      parts.forEach(part => {
        if (typeof part === 'string') textPrompt += part;
        else if (part.text) textPrompt += part.text;
        else if (part.inlineData) inlineImages.push(part);
      });

      if (inlineImages.length > 0) {
          console.log(`ℹ️ Groq Fallback: Sending ${inlineImages.length} images to Llama Vision.`);
          const messages = convertToGroqFormat([], textPrompt, inlineImages);
          const result = await callGroqAPI(messages, true); // isVision = true
          console.log("✅ Groq Fallback Success (Vision)");
          return result;
      } else {
          console.log("ℹ️ Groq Fallback: Text-only prompt.");
          const messages = convertToGroqFormat([], textPrompt, []);
          const result = await callGroqAPI(messages, false);
          console.log("✅ Groq Fallback Success (Text)");
          return result;
      }
    }
  } catch (groqError) {
    console.error("❌ CRITICAL: Both Gemini and Groq failed.");
    console.error("Gemini Error:", lastError?.message);
    console.error("Groq Error:", groqError?.message);
    throw lastError || groqError;
  }
}

// 5. EXPORTS
export const textModel = {
  startChat: (config) => ({
    sendMessage: (message) => executeHybridRequest("chat", { history: config.history, message })
  }),
  generateContent: (input) => executeHybridRequest("generate", { inputParts: input })
};

export const visionModel = {
  generateContent: (inputParts) => executeHybridRequest("generate", { inputParts })
};
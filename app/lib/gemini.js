import { GoogleGenerativeAI } from "@google/generative-ai";
import connectDB from "./mongodb";
import AIInteraction from "../models/AIInteraction";

// 1. CONFIGURATION
const groqKey = process.env.GROQ_API_KEY;

// User provided key + Env keys
const INITIAL_SEED_KEYS = [
  ...(process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || "")
    .split(",").map(k => k.replace(/["']/g, "").trim()).filter(k => k)
];

// ... (Cache logic remains same)

// Helper: Log Interaction (Fire & Forget)
async function logInteraction(data) {
  try {
    await connectDB();
    await AIInteraction.create({
      model: data.model,
      endpoint: data.endpoint,
      input: typeof data.input === 'string' ? data.input.substring(0, 5000) : JSON.stringify(data.input).substring(0, 5000),
      output: typeof data.output === 'string' ? data.output.substring(0, 5000) : JSON.stringify(data.output).substring(0, 5000),
      status: data.status,
      metadata: data.metadata || {}
    });
  } catch (e) {
    console.error("Failed to log AI interaction:", e);
  }
}


// Global Cache
let globalKeyCache = [];
let lastCacheUpdate = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 Minutes

if (!groqKey) console.warn("⚠️ No Groq API Key found. Free backup will not work.");

// 2. DATABASE MANAGEMENT
// 2. KEY MANAGEMENT (Env Vars Only)
async function fetchActiveKeys() {
  if (INITIAL_SEED_KEYS.length === 0) {
    console.warn("⚠️ No Gemini API Keys found in environment variables!");
  }
  return INITIAL_SEED_KEYS;
}

async function reportKeyFailure(key) {
  // DB reporting disabled. Just logging for now.
  console.warn(`[Key Failure] ${key.slice(-4)} failed.`);
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
  const startTime = Date.now();
  let interactionLog = {
    model: "Gemini",
    endpoint: type,
    input: params.message || params.inputParts,
    status: "Failed",
    metadata: {}
  };

  const tryGroq = async (fallback = false) => {
      try {
        if (type === "chat") {
          const messages = convertToGroqFormat(params.history, params.message);
          const result = await callGroqAPI(messages, false);
          console.log(`✅ Groq ${fallback? 'Fallback' : 'Preferred'} Success (Chat)`);
          
          logInteraction({
            ...interactionLog,
            model: "Groq (Llama 3.3)",
            output: result.response.text(),
            status: "Success",
            metadata: { latencyMs: Date.now() - startTime, fallback, preferred: !fallback }
          });

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
              console.log(`ℹ️ Groq ${fallback? 'Fallback' : 'Preferred'}: Sending ${inlineImages.length} images to Llama Vision.`);
              const messages = convertToGroqFormat([], textPrompt, inlineImages);
              const result = await callGroqAPI(messages, true); // isVision = true
              console.log(`✅ Groq ${fallback? 'Fallback' : 'Preferred'} Success (Vision)`);
              
              logInteraction({
                ...interactionLog,
                model: "Groq (Llama Vision)",
                output: result.response.text(),
                status: "Success",
                metadata: { latencyMs: Date.now() - startTime, fallback, preferred: !fallback }
              });

              return result;
          } else {
              console.log(`ℹ️ Groq ${fallback? 'Fallback' : 'Preferred'}: Text-only prompt.`);
              const messages = convertToGroqFormat([], textPrompt, []);
              const result = await callGroqAPI(messages, false);
              console.log(`✅ Groq ${fallback? 'Fallback' : 'Preferred'} Success (Text)`);
              
              logInteraction({
                ...interactionLog,
                model: "Groq (Llama 3.3)",
                output: result.response.text(),
                status: "Success",
                metadata: { latencyMs: Date.now() - startTime, fallback, preferred: !fallback }
              });

              return result;
          }
        }
      } catch (err) {
          console.warn(`⚠️ Groq ${fallback? 'Fallback' : 'Preferred'} Failed:`, err.message);
          throw err;
      }
  };

  // --- STRATEGY A: PREFER GROQ ---
  if (params.preferModel === 'groq') {
      try {
          return await tryGroq(false);
      } catch (e) {
          console.warn("⚠️ Preferred Groq failed. Falling back to Gemini...");
          // Fallthrough to Standard Flow
      }
  }

  // --- STRATEGY B: STANDARD (Gemini First) ---
  const activeKeys = await fetchActiveKeys();
  const shuffledKeys = [...activeKeys].sort(() => 0.5 - Math.random());

  for (const key of shuffledKeys) {
    try {
      const genAI = new GoogleGenerativeAI(key);
      const modelName = "gemini-flash-latest"; // or gemini-1.5-flash
      const model = genAI.getGenerativeModel({ model: modelName });

      let result;
      if (type === "chat") {
        const chat = model.startChat({ history: params.history || [] });
        result = await chat.sendMessage(params.message);
      } else {
        result = await model.generateContent(params.inputParts);
      }

      // Log Success
      const responseText = result.response.text();
      logInteraction({
        ...interactionLog,
        model: `Gemini (${modelName})`,
        output: responseText,
        status: "Success",
        metadata: { latencyMs: Date.now() - startTime, keyUsed: `...${key.slice(-4)}` }
      });

      return result;

    } catch (error) {
      lastError = error;
      const maskedKey = `...${key.slice(-4)}`;
      console.warn(`⚠️ Gemini Key ${maskedKey} Failed. Detail: ${error.message}`);
      
      // Async failure reporting
      reportKeyFailure(key).catch(e => {});

      continue;
    }
  }

  // --- STRATEGY C: FALLBACK TO GROQ (If Gemini failed) ---
  if (params.preferModel !== 'groq') { // Only try if we haven't already tried above
      console.warn("⚠️ All Gemini Keys failed. Switching to Groq (Free Tier)...");
      try {
          return await tryGroq(true);
      } catch (groqError) {
          lastError = groqError; // Update last error
      }
  }

  // --- FAILURE ---
  console.error("❌ CRITICAL: AI Request Failed.");
  logInteraction({
      ...interactionLog,
      output: `Final Failure: ${lastError?.message}`,
      status: "Failed",
      metadata: { latencyMs: Date.now() - startTime }
  });
  throw lastError;
}

// 5. EXPORTS
export const textModel = {
  startChat: (config) => ({
    sendMessage: (message) => executeHybridRequest("chat", { history: config.history, message })
  }),
  generateContent: (input, options = {}) => executeHybridRequest("generate", { inputParts: input, ...options })
};

export const visionModel = {
  generateContent: (inputParts, options = {}) => executeHybridRequest("generate", { inputParts, ...options })
};
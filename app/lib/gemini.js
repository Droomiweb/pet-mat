// app/lib/gemini.js
import { GoogleGenerativeAI } from "@google/generative-ai";

// 1. LOAD KEYS
// Support both a list of keys (GEMINI_API_KEYS) and the single legacy key (GEMINI_API_KEY)
const keysString = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || "";
const keys = keysString.split(",").map((k) => k.trim()).filter((k) => k);

if (keys.length === 0) {
  console.warn("⚠️ Warning: No Gemini API keys found in environment variables.");
}

// 2. ROTATION LOGIC
const createRotatedModel = (modelConfig) => {
  return {
    /**
     * Wrapper for generateContent that rotates keys on 429 (Rate Limit) or 403 (Permission) errors
     */
    generateContent: async (...args) => {
      const startIndex = Math.floor(Math.random() * keys.length);
      let lastError = null;

      for (let i = 0; i < keys.length; i++) {
        const keyIndex = (startIndex + i) % keys.length;
        const currentKey = keys[keyIndex];

        try {
          const genAI = new GoogleGenerativeAI(currentKey);
          const model = genAI.getGenerativeModel(modelConfig);
          return await model.generateContent(...args);
        } catch (error) {
          lastError = error;
          
          const shouldRotate = 
            error.message?.includes('429') || 
            error.status === 429 || 
            error.message?.includes('403') || 
            error.status === 403 ||
            error.message?.toLowerCase().includes('resource has been exhausted');

          if (!shouldRotate) throw error;

          console.warn(`[Gemini] Key ending in ...${currentKey.slice(-4)} failed (${error.status || 'Error'}). Rotating...`);
        }
      }
      console.error("All Gemini API keys failed.");
      throw lastError;
    },

    /**
     * Wrapper for startChat.
     * Picks a random key for the session.
     * Ideal for stateless API routes where the chat is re-initialized every request.
     */
    startChat: (chatConfig) => {
      const randomKey = keys[Math.floor(Math.random() * keys.length)];
      const genAI = new GoogleGenerativeAI(randomKey);
      const model = genAI.getGenerativeModel(modelConfig);
      return model.startChat(chatConfig);
    },

    /**
     * Helper to get the underlying model if needed
     */
    getGenerativeModel: (config) => {
        const randomKey = keys[Math.floor(Math.random() * keys.length)];
        return new GoogleGenerativeAI(randomKey).getGenerativeModel(config);
    }
  };
};

// 3. EXPORTS
const textModel = createRotatedModel({ model: "gemini-flash-latest" });
const visionModel = createRotatedModel({ model: "gemini-flash-latest" });

// Helper function to convert Buffer to Gemini-compatible format
const fileToGenerativePart = (buffer, mimeType) => {
  return {
    inlineData: {
      data: buffer.toString("base64"),
      mimeType
    },
  };
};

export { textModel, visionModel, fileToGenerativePart };
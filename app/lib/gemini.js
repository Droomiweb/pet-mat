// app/lib/gemini.js
import { GoogleGenerativeAI } from "@google/generative-ai";

// 1. LOAD KEYS
// Support both a list of keys (GEMINI_API_KEYS) and the single legacy key (GEMINI_API_KEY)
// Example in .env: GEMINI_API_KEYS="key1,key2,key3"
const keysString = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || "";
const keys = keysString.split(",").map((k) => k.trim()).filter((k) => k);

if (keys.length === 0) {
  console.warn("Warning: No Gemini API keys found in environment variables.");
}

// 2. ROTATION LOGIC
// This helper wraps the model to handle retries and key rotation automatically
const createRotatedModel = (modelConfig) => {
  return {
    /**
     * Wrapper for generateContent that rotates keys on 429 errors
     */
    generateContent: async (...args) => {
      // Start with a random key to balance load
      const startIndex = Math.floor(Math.random() * keys.length);
      let lastError = null;

      // Try up to the number of available keys
      for (let i = 0; i < keys.length; i++) {
        const keyIndex = (startIndex + i) % keys.length;
        const currentKey = keys[keyIndex];

        try {
          const genAI = new GoogleGenerativeAI(currentKey);
          const model = genAI.getGenerativeModel(modelConfig);
          
          return await model.generateContent(...args);
        } catch (error) {
          lastError = error;
          
          // Check if error is related to Rate Limiting (429) or Exhaustion
          const isRateLimit = 
            error.message?.includes('429') || 
            error.status === 429 || 
            error.message?.toLowerCase().includes('resource has been exhausted');

          // If it's NOT a rate limit error, or if we've tried all keys, stop retrying.
          if (!isRateLimit) {
            throw error;
          }

          console.warn(`[Gemini] Key ending in ...${currentKey.slice(-4)} hit rate limit. Rotating to next key...`);
          // Loop continues to the next key
        }
      }
      
      // If all keys failed
      throw lastError;
    },

    /**
     * Wrapper for startChat.
     * Note: We select a random key for the session initialization.
     * Mid-chat rotation is difficult because session state is tied to the client.
     */
    startChat: (chatConfig) => {
      const randomKey = keys[Math.floor(Math.random() * keys.length)];
      const genAI = new GoogleGenerativeAI(randomKey);
      const model = genAI.getGenerativeModel(modelConfig);
      return model.startChat(chatConfig);
    },
    
    // Expose underlying helper if needed elsewhere
    getGenerativeModel: (config) => {
        const randomKey = keys[Math.floor(Math.random() * keys.length)];
        return new GoogleGenerativeAI(randomKey).getGenerativeModel(config);
    }
  };
};

// 3. EXPORTS
// We keep the same export names so your other files don't break.
const textModel = createRotatedModel({ model: "gemini-flash-latest" });
const visionModel = createRotatedModel({ model: "gemini-flash-latest" });

// Helper function to convert Buffer to Gemini-compatible format
const fileToGenerativePart = (buffer, mimeType) => {
  return {
    inlineData: {
      data: buffer.toString("base64"),
      mimeType,
    },
  };
};

export { textModel, visionModel, fileToGenerativePart };
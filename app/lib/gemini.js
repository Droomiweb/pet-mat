// app/lib/gemini.js
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY);

// Model for text-only tasks (questionnaire, matching)
const textModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// Model for vision tasks (image analysis)
const visionModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

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
// app/lib/gemini.js
import { GoogleGenerativeAI } from "@google/generative-ai";

// Access your API key as an environment variable
const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY);

// Initialize the Gemini Pro model with the correct, official name
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

export default model;
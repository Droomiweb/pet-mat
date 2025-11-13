// app/lib/gemini.js
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY);

// Universal working model
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

export default model;

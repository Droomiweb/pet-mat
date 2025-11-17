// app/api/analyze-pet-image/route.js
import { visionModel } from "../../lib/gemini";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Helper to convert base64 string to a Gemini Part
const base64ToGenerativePart = (base64Data, mimeType) => {
  // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
  const data = base64Data.split(',')[1];
  return {
    inlineData: {
      data,
      mimeType
    },
  };
};

export async function POST(req) {
  try {
    const { imageB64, mimeType } = await req.json();

    if (!imageB64 || !mimeType) {
      return new Response(JSON.stringify({ error: "Image data and mimeType are required" }), { status: 400 });
    }
    
    const imagePart = base64ToGenerativePart(imageB64, mimeType);

    const prompt = `Analyze this image of a pet. Identify the pet's type (e.g., Dog, Cat, Rabbit, Bird, Other) and its specific breed. If the breed is unclear or mixed, list the most likely one or 'Mixed'. Respond *only* with a valid JSON object in the format: {"type": "...", "breed": "..."}`;

    const result = await visionModel.generateContent([prompt, imagePart]);
    const response = await result.response;
    let text = response.text();

    // Clean the response to ensure it's valid JSON
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();

    // Parse the JSON text from the AI
    const data = JSON.parse(text);

    if (!data.type || !data.breed) {
         throw new Error("AI failed to return valid type/breed JSON.");
    }
    
    return new Response(JSON.stringify(data), { status: 200 });

  } catch (err) {
    console.error("Error in AI image analysis:", err);
    // Send back a default "Other" if AI fails
    return new Response(JSON.stringify({ type: "Other", breed: "Other" }), { status: 500 });
  }
}
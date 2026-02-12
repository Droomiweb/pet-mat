// app/lib/huggingface.js
import { visionModel } from "./gemini";

/**
 * Classifies an image using Google Gemini Vision (replacing deprecated HF API).
 * @param {string} base64Data - The base64 encoded image data (without prefix).
 * @returns {Promise<Object>} - The formatted analysis result { isHuman, type, breed }.
 */
export async function classifyImage(base64Data) {
  try {
    const prompt = `
      Analyze this image and identify the subject.
      
      Return a JSON object with these exact keys:
      - "isHuman": boolean (true if the main subject is a person/selfie)
      - "animalType": string (e.g., "Dog", "Cat", "Bird", "Rabbit", "Other")
      - "breed": string (Best guess at the breed, or description if not a pet. If human, set to "Human")
      
      If the image is unclear or empty, return default values.
      Respond ONLY with valid JSON.
    `;

    // Construct the input for Gemini Vision
    // Note: visionModel.generateContent expects an array or object
    const inputParts = [
      { text: prompt },
      { 
        inlineData: { 
          mimeType: "image/jpeg", // Assuming JPEG, but Gemini is flexible
          data: base64Data 
        } 
      }
    ];

    const result = await visionModel.generateContent(inputParts);
    const response = await result.response;
    const text = response.text();

    // Clean and parse JSON
    const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const data = JSON.parse(cleanText);

    return {
      isHuman: data.isHuman || false,
      type: data.animalType || "Other",
      breed: data.breed || "Unknown"
    };

  } catch (error) {
    console.error("❌ Gemini Vision Classification Failed:", error);
    // Fallback on error
    return { isHuman: false, type: "Other", breed: "Unknown" };
  }
}


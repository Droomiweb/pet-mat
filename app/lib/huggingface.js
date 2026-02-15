// app/lib/huggingface.js
import { visionModel } from "./gemini";

/**
 * Classifies an image using Google Gemini Vision (replacing deprecated HF API).
 * @param {string} base64Data - The base64 encoded image data (without prefix).
 * @returns {Promise<Object>} - The formatted analysis result { isHuman, type, breed }.
 */
// Helper: Call Hugging Face API
// Helper: Call Hugging Face API
async function callHuggingFaceAPI(base64Data) {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  if (!apiKey) throw new Error("Hugging Face API Key missing");

  // model: google/vit-base-patch16-224 (good for general classification)
  // We need to send raw binary. Convert base64 to buffer.
  const buffer = Buffer.from(base64Data, "base64");

  const response = await fetch(
    "https://api-inference.huggingface.co/models/google/vit-base-patch16-224",
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/octet-stream",
      },
      method: "POST",
      body: buffer,
    }
  );

  if (!response.ok) {
    // If error is HTML (like 410 Gone), don't log the whole body
    const contentType = response.headers.get("content-type");
    let errorMsg = `Status: ${response.status}`;
    
    if (contentType && contentType.includes("application/json")) {
        const errorJson = await response.json();
        errorMsg += ` - ${errorJson.error || JSON.stringify(errorJson)}`;
    } else {
        errorMsg += " - (Non-JSON Error Response)";
    }
    
    throw new Error(`HF API Error: ${errorMsg}`);
  }

  const result = await response.json();
  // Result is array of { label: string, score: number }
  return result;
}

/**
 * Classifies an image using Hugging Face (Preferred) with Gemini Vision Fallback.
 * @param {string} base64Data - The base64 encoded image data (without prefix).
 * @returns {Promise<Object>} - The formatted analysis result { isHuman, type, breed }.
 */
export async function classifyImage(base64Data) {
  // --- STRATEGY 1: Hugging Face (Primary) ---
  try {
    console.log("🔍 Analyzing image with Hugging Face (ViT)...");
    const hfResults = await callHuggingFaceAPI(base64Data);
    
    // Check if Human/Person is detected with high confidence
    const topResult = hfResults[0]; // Highest score
    const topLabel = topResult?.label?.toLowerCase() || "";
    
    // Simple logic: if label contains "person", "man", "woman", "boy", "girl"
    const humanKeywords = ["groom", "person", "man", "woman", "boy", "girl", "human", "people"];
    const isHuman = humanKeywords.some(k => topLabel.includes(k));

    // For breed/type, we just use the top label
    // ViT returns specific classes (e.g. "golden retriever", "Egyptian cat")
    // Use simple heuristics for type
    let animalType = "Other";
    if (topLabel.includes("dog") || topLabel.includes("terrier") || topLabel.includes("retriever")) animalType = "Dog";
    else if (topLabel.includes("cat") || topLabel.includes("kitten") || topLabel.includes("tabby")) animalType = "Cat";
    
    // If it's human, override
    if (isHuman) {
        return { isHuman: true, type: "Human", breed: "Human" };
    }

    return {
       isHuman: false,
       type: animalType,
       breed: topResult?.label || "Unknown"
    };

  } catch (hfError) {
    console.warn("⚠️ Hugging Face Failed. Switching to Gemini Backup...", hfError.message);
  }

  // --- STRATEGY 2: Gemini Vision (Fallback) ---
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
    console.error("❌ Both AI Models Failed:", error);
    // Final Fallback
    return { isHuman: false, type: "Other", breed: "Unknown" };
  }
}


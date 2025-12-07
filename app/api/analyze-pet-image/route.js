// app/api/analyze-pet-image/route.js

// 1. IMPORTS
// We import the specific 'visionModel' (Gemini Pro Vision) which can "see" images.
import { visionModel } from "../../lib/gemini";

export async function POST(req) {
  try {
    // 2. PARSE REQUEST
    const { imageUrl, mimeType } = await req.json();
    
    // Fail fast if no image data is provided
    if (!imageUrl) {
        return new Response(JSON.stringify({ error: 'Image data required' }), { status: 400 });
    }

    // 3. PREPARE IMAGE FOR AI
    // The frontend sends a Data URI (e.g., "data:image/jpeg;base64,/9j/4AAQ...").
    // Gemini needs ONLY the raw Base64 string after the comma.
    const base64Data = imageUrl.split(",")[1]; 
    
    const imagePart = { 
        inlineData: { 
            data: base64Data, 
            mimeType: mimeType || "image/jpeg" 
        } 
    };

    // 4. CONSTRUCT THE PROMPT (The "Intelligence")
    // We give the AI two specific jobs:
    // Job A: Content Moderation (Is this a human?)
    // Job B: Data Extraction (What breed is this?)
    const prompt = `
      Analyze this image carefully.

      **STEP 1: SAFETY CHECK (CRITICAL)**
      - Does this image contain a human being (face, body, selfie, or person holding the pet)?
      - If YES, return ONLY: { "isHuman": true }
      
      **STEP 2: PET IDENTIFICATION**
      - If NO humans are present, identify the pet.
      - "type": Choose from ["Dog", "Cat", "Rabbit", "Bird", "Other"].
      - "breed": Identify the specific breed (e.g., "Pug", "Persian").

      **Response Format**:
      Return ONLY a valid JSON object. Do not use Markdown code blocks.
      
      Examples:
      - Human detected: { "isHuman": true }
      - Valid Pet: { "isHuman": false, "type": "Dog", "breed": "Golden Retriever" }
    `;

    // 5. CALL GEMINI API
    // We send both the text instructions and the image data.
    const result = await visionModel.generateContent([prompt, imagePart]);
    const response = await result.response;
    
    // 6. SANITIZE RESPONSE
    // AI often wraps JSON in markdown backticks (```json ... ```).
    // We remove these to ensure JSON.parse doesn't crash.
    let text = response.text()
        .replace(/```json/g, "") // Remove start tag
        .replace(/```/g, "")     // Remove end tag
        .trim();                 // Remove whitespace
        
    const data = JSON.parse(text);
    
    // 7. SUCCESS RESPONSE
    return new Response(JSON.stringify(data), { status: 200 });

  } catch (err) {
    // 8. ERROR HANDLING (Graceful Fallback)
    // If the API fails or the image is blurry/unreadable, we don't want the app to crash.
    // Instead, we return "Unknown" so the user can manually select the breed in the UI.
    console.error("Gemini Analysis Error:", err);
    return new Response(JSON.stringify({ type: "Other", breed: "Unknown" }), { status: 200 });
  }
}
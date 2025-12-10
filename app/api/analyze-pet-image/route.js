// app/api/analyze-pet-image/route.js

// Import vision model
import { visionModel } from "../../lib/gemini";

export async function POST(req) {
  try {
    // Parse request data
    const { imageUrl, mimeType } = await req.json();
    
    // Validate image data
    if (!imageUrl) {
        return new Response(JSON.stringify({ error: 'Image data required' }), { status: 400 });
    }

    // Format image data
    const base64Data = imageUrl.split(",")[1]; 
    
    const imagePart = { 
        inlineData: { 
            data: base64Data, 
            mimeType: mimeType || "image/jpeg" 
        } 
    };

    // Define analysis rules
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

    // Call AI API
    const result = await visionModel.generateContent([prompt, imagePart]);
    const response = await result.response;
    
    // Clean JSON response
    let text = response.text()
        .replace(/```json/g, "") // Remove start tag
        .replace(/```/g, "")     // Remove end tag
        .trim();                 // Remove whitespace
        
    const data = JSON.parse(text);
    
    // Return analysis result
    return new Response(JSON.stringify(data), { status: 200 });

  } catch (err) {
    // Handle analysis errors
    console.error("Gemini Analysis Error:", err);
    return new Response(JSON.stringify({ type: "Other", breed: "Unknown" }), { status: 200 });
  }
}
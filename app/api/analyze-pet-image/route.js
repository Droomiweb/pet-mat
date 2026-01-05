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

      **STEP 1: SAFETY CHECK**
      - **Focus on the main subject.**
      - If the image is primarily of a **Human Face/Selfie** (where the human is the clear subject), return: { "isHuman": true }
      - If the image contains a person **BUT** they are just holding/petting the animal and the **ANIMAL is the main focus**, consider this valid. Return: { "isHuman": false }
      
      **STEP 2: PET IDENTIFICATION**
      - If the main subject is an animal (even if held by a person), identify it.
      - "type": Choose from ["Dog", "Cat", "Rabbit", "Bird", "Other"].
      - "breed": Identify the specific breed (e.g., "Pug", "Persian").

      **Response Format**:
      Return ONLY a valid JSON object. Do not use Markdown code blocks.
      
      Examples:
      - Selfie / Human Portrait: { "isHuman": true }
      - Person holding a Cat (Cat is focus): { "isHuman": false, "type": "Cat", "breed": "Persian" }
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
        
    // DEBUG: Log raw AI response
    console.log("AI Raw Response:", text);

    let data;
    try {
        // Attempt 1: Direct Parse
        data = JSON.parse(text);
    } catch (parseError) {
        console.warn("JSON Parse Failed, attempting Regex extraction...");
        
        // Attempt 2: Extract JSON object using Regex
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                data = JSON.parse(jsonMatch[0]);
            } catch (e) {
                console.error("Regex JSON extraction failed.");
            }
        }
    }

    // Attempt 3: Fallback if data is still null (e.g. Groq text-only response "I can't see the image")
    if (!data) {
        console.warn("AI returned non-JSON text (likely fallback mode). Defaulting to Unknown.");
        // We assume valid pet if AI failed to flag human, but we can't identify breed.
        data = { isHuman: false, type: "Other", breed: "Unknown" }; 
    }
    
    // Return analysis result
    return new Response(JSON.stringify(data), { status: 200 });

  } catch (err) {
    // Handle analysis errors
    console.error("Gemini Analysis Error:", err);
    return new Response(JSON.stringify({ type: "Other", breed: "Unknown" }), { status: 200 });
  }
}
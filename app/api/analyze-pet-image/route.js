// app/api/analyze-pet-image/route.js

import { classifyImage } from "../../lib/huggingface";

export async function POST(req) {
  try {
    // Parse request data
    const { imageUrl } = await req.json();
    
    // Validate image data
    if (!imageUrl) {
        return new Response(JSON.stringify({ error: 'Image data required' }), { status: 400 });
    }

    // Format image data
    // imageUrl is expected to be "data:image/jpeg;base64,..."
    const base64Data = imageUrl.split(",")[1]; 

    // Call Hugging Face API
    const analysisResult = await classifyImage(base64Data);
    
    // REJECTION LOGIC: Block Humans
    if (analysisResult.isHuman) {
        return new Response(JSON.stringify({ 
            error: "We detected a person in this photo. Please upload a clear photo of your pet only!",
            isHuman: true 
        }), { status: 400 });
    }

    // Return analysis result
    return new Response(JSON.stringify(analysisResult), { status: 200 });

  } catch (err) {
    // Handle analysis errors
    console.error("Image Analysis Error:", err);
    return new Response(JSON.stringify({ type: "Other", breed: "Unknown" }), { status: 200 });
  }
}
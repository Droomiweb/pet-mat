// app/api/verify-certificate/route.js

// 1. IMPORTS
// We import the pre-configured Vision model to ensure consistency with the rest of the app.
import { visionModel } from "../../lib/gemini"; 

// 2. HELPER FUNCTION: PREPARE IMAGE
// Gemini Vision API requires the image data to be sent inline (Base64), not as a remote URL.
// This function downloads the image from Cloudinary/AWS and converts it.
async function fetchAndEncodeImage(url) {
  // Fetch the image from the provided URL
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`);
  }
  
  // Convert response to a binary buffer
  const buffer = await response.arrayBuffer();
  
  // Determine content type (default to jpeg if missing)
  const contentType = response.headers.get("Content-Type") || "image/jpeg";
  
  // Return the format expected by the Google Generative AI SDK
  return {
    inlineData: {
      data: Buffer.from(buffer).toString("base64"), // Convert binary to Base64 string
      mimeType: contentType,
    },
  };
}

// 3. POST HANDLER
export async function POST(req) {
  try {
    // Parse the request body
    const { certificateUrl, petName, petAge, petBreed, ocrText } = await req.json();

    // Basic Validation
    if (!certificateUrl || !petName || !petAge || !petBreed) {
      return new Response(JSON.stringify({ error: "Certificate URL, pet name, age, and breed are required" }), { status: 400 });
    }

    // Prepare the image for the AI model
    const imagePart = await fetchAndEncodeImage(certificateUrl);
    
    // 4. PROMPT ENGINEERING
    // We give the AI a dual role: Authenticator (Real vs Fake) and Data Verifier (Does it match?).
    // We strictly enforce JSON output to make the result programmatically usable.
    const prompt = `
    Analyze this pet certificate.
    User-provided data:
    - Name: ${petName}
    - Age: ${petAge}
    - Breed: ${petBreed}
    
    Extracted OCR Text (if any):
    "${ocrText || 'No OCR text provided'}"

    Your task is to:
    1.  Determine if the image is a legitimate-looking pet certificate or a clear fake (e.g., a random photo, a drawing, a blank page).
    2.  Compare the user-provided data (Name, Age, Breed) with any visible information on the certificate image.
    3.  If OCR text is provided, use it to help find matches.
    4.  Report your findings in a structured JSON format.

    Respond with ONLY the following JSON structure. Do not add any text or markdown before or after the JSON block.

    {
      "isCertificateValid": boolean,
      "validityReason": "Briefly explain your reasoning for the 'isCertificateValid' flag.",
      "nameMatch": boolean,
      "ageMatch": boolean,
      "breedMatch": boolean,
      "matchDiscrepancy": "If any match is false, explain the discrepancy. e.g., 'Certificate shows 'Fido' but user entered 'Buddy'.",
      "extractedName": "The name you found on the certificate, or null.",
      "extractedAge": "The age (or DOB) you found, or null.",
      "extractedBreed": "The breed you found, or null."
    }
    `;

    // 5. AI GENERATION
    // Send both the text prompt and the image data to Gemini
    const result = await visionModel.generateContent([prompt, imagePart]);
    const response = await result.response;
    let text = response.text();

    // 6. RESPONSE CLEANUP
    // Remove Markdown formatting (```json) if the AI added it.
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();

    // 7. PARSE AND RETURN
    let aiJson;
    try {
      aiJson = JSON.parse(text);
    } catch (e) {
      console.error("Failed to parse AI JSON response:", text);
      throw new Error("AI returned invalid JSON.");
    }

    // Return the clean JSON object to the frontend
    return new Response(JSON.stringify({ aiAnalysis: aiJson }), { 
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error with AI verification:", error);
    return new Response(JSON.stringify({ error: "AI verification failed", details: error.message }), { status: 500 });
  }
}
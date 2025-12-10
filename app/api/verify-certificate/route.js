// app/api/verify-certificate/route.js

// Standard imports
import { visionModel } from "../../lib/gemini"; 

// Prepare image data
async function fetchAndEncodeImage(url) {
  // Fetch image URL
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`);
  }
  
  // Convert to buffer
  const buffer = await response.arrayBuffer();
  
  // Get content type
  const contentType = response.headers.get("Content-Type") || "image/jpeg";
  
  // Return AI format
  return {
    inlineData: {
      data: Buffer.from(buffer).toString("base64"), // Base64 encode
      mimeType: contentType,
    },
  };
}

// POST request handler
export async function POST(req) {
  try {
    // Parse request data
    const { certificateUrl, petName, petAge, petBreed, ocrText } = await req.json();

    // Validate required fields
    if (!certificateUrl || !petName || !petAge || !petBreed) {
      return new Response(JSON.stringify({ error: "Certificate URL, pet name, age, and breed are required" }), { status: 400 });
    }

    // Encode image data
    const imagePart = await fetchAndEncodeImage(certificateUrl);
    
    // Define AI prompt
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

    // Generate AI analysis
    const result = await visionModel.generateContent([prompt, imagePart]);
    const response = await result.response;
    let text = response.text();

    // Clean JSON response
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();

    // Parse AI result
    let aiJson;
    try {
      aiJson = JSON.parse(text);
    } catch (e) {
      console.error("Failed to parse AI JSON response:", text);
      throw new Error("AI returned invalid JSON.");
    }

    // Return analysis data
    return new Response(JSON.stringify({ aiAnalysis: aiJson }), { 
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    // Handle verification errors
    console.error("Error with AI verification:", error);
    return new Response(JSON.stringify({ error: "AI verification failed", details: error.message }), { status: 500 });
  }
}
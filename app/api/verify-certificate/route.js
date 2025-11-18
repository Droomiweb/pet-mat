// app/api/verify-certificate/route.js
import { visionModel } from "../../lib/gemini"; // <-- FIX 1: Import the shared visionModel

// --- FIX 2: Removed the old "geminiProVision" model creation ---
// const geminiProVision = new GoogleGenerativeAI(...

// Function to convert a remote image URL to a format the Gemini model can read
async function fetchAndEncodeImage(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`);
  }
  const buffer = await response.arrayBuffer();
  const contentType = response.headers.get("Content-Type") || "image/jpeg";
  return {
    inlineData: {
      data: Buffer.from(buffer).toString("base64"),
      mimeType: contentType,
    },
  };
}

export async function POST(req) {
  try {
    const { certificateUrl, petName, petAge, petBreed, ocrText } = await req.json();

    if (!certificateUrl || !petName || !petAge || !petBreed) {
      return new Response(JSON.stringify({ error: "Certificate URL, pet name, age, and breed are required" }), { status: 400 });
    }

    const imagePart = await fetchAndEncodeImage(certificateUrl);
    
    // --- UPDATED PROMPT (This prompt is unchanged) ---
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
    // --- END UPDATED PROMPT ---

    // --- FIX 3: Use the imported 'visionModel' ---
    const result = await visionModel.generateContent([prompt, imagePart]);
    const response = await result.response;
    let text = response.text();

    // Clean the response to ensure it's valid JSON
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();

    // Try parsing the JSON
    let aiJson;
    try {
      aiJson = JSON.parse(text);
    } catch (e) {
      console.error("Failed to parse AI JSON response:", text);
      throw new Error("AI returned invalid JSON.");
    }

    return new Response(JSON.stringify({ aiAnalysis: aiJson }), { // Return the parsed JSON
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error with AI verification:", error);
    return new Response(JSON.stringify({ error: "AI verification failed", details: error.message }), { status: 500 });
  }
}
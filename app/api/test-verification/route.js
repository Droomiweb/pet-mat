// app/api/test-verification/route.js
import { GoogleGenerativeAI } from "@google/generative-ai";
import { v2 as cloudinary } from "cloudinary";

// 1. Config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

export async function POST(req) {
  try {
    const { imageBase64, petName, petBreed, petAge } = await req.json();

    if (!imageBase64 || !petName) {
      return new Response(JSON.stringify({ error: "Image and Data required" }), { status: 400 });
    }

    // 1. Upload to Cloudinary (We still need to store it)
    const uploadRes = await cloudinary.uploader.upload(imageBase64, {
      folder: "tests/verification",
    });

    // 2. Prepare Image for Gemini
    // Remove the "data:image/jpeg;base64," prefix if present
    const base64Data = imageBase64.split(",")[1] || imageBase64;
    
    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: "image/jpeg",
      },
    };

    // 3. Construct the Prompt
    // We ask Gemini to do the comparison logic FOR US. This solves case sensitivity.
    const prompt = `
      Act as a strict Pet Verification Officer. Analyze this health certificate image.
      
      Expected Data (from User):
      - Name: "${petName}"
      - Breed: "${petBreed}"
      - Age: "${petAge}"

      Tasks:
      1. Extract the Pet Name, Breed, Age, and Issuer Name visible on the document.
      2. Compare the extracted text with the Expected Data.
      3. Be flexible with Case Sensitivity (e.g., "pug" == "Pug") and slight spelling variations.
      4. Determine a status: "verified" (Matches), "rejected" (Clear mismatch or fake), or "needs-review" (Unclear).

      Respond ONLY with this JSON structure:
      {
        "extractedData": {
          "name": "...",
          "breed": "...",
          "age": "...",
          "issuer": "..."
        },
        "matchResults": {
          "nameMatch": boolean,
          "breedMatch": boolean,
          "issuerFound": boolean
        },
        "status": "verified" | "rejected" | "needs-review",
        "reason": "Short explanation"
      }
    `;

    // 4. Call Gemini (Fast!)
    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    let text = response.text().replace(/```json/g, "").replace(/```/g, "").trim();
    
    const aiResult = JSON.parse(text);

    // 5. Return Format compatible with your frontend
    return new Response(JSON.stringify({
      success: true,
      certificateUrl: uploadRes.secure_url,
      analysis: {
        petName: aiResult.extractedData.name,
        petBreed: aiResult.extractedData.breed,
        petAge: aiResult.extractedData.age,
        issuer: aiResult.extractedData.issuer,
      },
      decision: {
        status: aiResult.status,
        reason: aiResult.reason,
      },
      // We simulate the "logs" so your UI still looks good
      debugLogs: [
        `AI Check: Name "${petName}" vs "${aiResult.extractedData.name}" = ${aiResult.matchResults.nameMatch}`,
        `AI Check: Breed "${petBreed}" vs "${aiResult.extractedData.breed}" = ${aiResult.matchResults.breedMatch}`,
        `AI Verdict: ${aiResult.status.toUpperCase()}`
      ]
    }), { status: 200 });

  } catch (err) {
    console.error("Test Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
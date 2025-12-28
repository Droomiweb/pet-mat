import { v2 as cloudinary } from "cloudinary";
import { textModel } from "../../../lib/gemini";
import connectDB from "../../../lib/mongodb";
import Pet from "../../../models/PetModel";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req) {
  try {
    await connectDB();
    const { petId, imageBase64 } = await req.json();

    if (!petId || !imageBase64) {
      return new Response(JSON.stringify({ error: "Missing image or Pet ID" }), { status: 400 });
    }

    // 1. UPLOAD TO CLOUDINARY
    const uploadRes = await cloudinary.uploader.upload(imageBase64, {
      folder: "pet_medical_records",
      resource_type: "image",
    });
    const certificateUrl = uploadRes.secure_url;

    // 2. TESSERACT OCR (Dynamic Import to prevent build errors)
    let ocrText = "";
    try {
      const tesseract = await import("tesseract.js");
      const worker = await tesseract.createWorker();
      
      // Initialize language (English)
      await worker.loadLanguage("eng");
      await worker.initialize("eng");
      
      const { data: { text } } = await worker.recognize(certificateUrl);
      ocrText = text;
      
      await worker.terminate();
    } catch (ocrErr) {
      console.error("OCR Failed:", ocrErr);
      return new Response(JSON.stringify({ error: "Could not read document text." }), { status: 500 });
    }

    // 3. AI VERIFICATION & EXTRACTION (Gemini)
    const prompt = `
      You are a Veterinary Medical Record Assistant. 
      Analyze this OCR text extracted from a pet vaccination certificate:
      
      """
      ${ocrText}
      """

      Task:
      1. Identify the **Vaccine Name** (e.g., Rabies, DHPP, Bordetella).
      2. Identify the **Expiry/Next Due Date**.
      3. Determine if this looks like a valid medical document.

      RETURN JSON ONLY (No Markdown):
      {
        "isValid": boolean,
        "vaccineName": "string or null",
        "expiryDate": "YYYY-MM-DD or null",
        "reason": "Short explanation if invalid"
      }
    `;

    const result = await textModel.generateContent(prompt);
    const response = await result.response;
    let aiJson = response.text().replace(/```json|```/g, "").trim(); // Clean cleanup
    
    let aiData;
    try {
        aiData = JSON.parse(aiJson);
    } catch (e) {
        throw new Error("AI failed to parse document structure.");
    }

    if (!aiData.isValid || !aiData.vaccineName || !aiData.expiryDate) {
        return new Response(JSON.stringify({ 
            error: "Verification Failed", 
            details: aiData.reason || "Could not clearly identify vaccine name or date." 
        }), { status: 422 });
    }

    // 4. UPDATE DATABASE
    const newVaccineRecord = {
        vaccineName: aiData.vaccineName,
        vaccinationDate: new Date(), // Assuming uploaded today
        expiryDate: new Date(aiData.expiryDate),
        status: 'active'
    };

    const updatedPet = await Pet.findByIdAndUpdate(
        petId,
        { 
            $push: { vaccinationHistory: newVaccineRecord },
            // Optionally save the certificate URL if you have a field for it
            // $set: { lastCertificateUrl: certificateUrl } 
        },
        { new: true }
    );

    return new Response(JSON.stringify({ 
        success: true, 
        message: "Health record updated successfully!",
        record: newVaccineRecord 
    }), { status: 200 });

  } catch (error) {
    console.error("Upload Flow Error:", error);
    return new Response(JSON.stringify({ error: error.message || "Processing failed" }), { status: 500 });
  }
}
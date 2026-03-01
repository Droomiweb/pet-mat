
import { visionModel, textModel } from "./gemini"; 

// Helper: Format AI image
const fileToGenerativePart = (base64, mimeType) => {
  const base64Data = base64.split(",")[1] || base64;
  return {
    inlineData: {
      data: base64Data,
      mimeType: mimeType || "image/jpeg",
    },
  };
};

// Helper: Run OCR using Tesseract (Server-side compatible)
const runStartTesseractOCR = async (buffer) => {
    try {
        const tesseract = await import('tesseract.js');
        // createWorker logic varies by version, let's allow Tesseract to handle the buffer directly
        // Tesseract.recognize(image, langs, options) is the simplest static method in v2/v3
        // For v5, we need createWorker.
        // Let's rely on the factory pattern seen in the codebase.
        
        let worker;
        let text = "";
        
        if (typeof tesseract.createWorker === 'function') {
             worker = await tesseract.createWorker();
             if (typeof worker.load === 'function') await worker.load();
             if (typeof worker.loadLanguage === 'function') await worker.loadLanguage('eng');
             if (typeof worker.initialize === 'function') await worker.initialize('eng');
             
             const res = await worker.recognize(buffer);
             text = res?.data?.text || "";
             
             if (typeof worker.terminate === 'function') await worker.terminate();
        } else if (typeof tesseract.recognize === 'function') {
             const res = await tesseract.recognize(buffer, 'eng');
             text = res?.data?.text || "";
        }
        
        return text;
    } catch (e) {
        console.error("OCR Extraction Failed:", e);
        return "";
    }
}

export const runCertificateAnalysis = async (petData) => {
  const { name, breed, age, certificateBase64, certificateMimeType, ownerName } =
    petData;

  console.log(
    `[Analysis] Starting Gemini analysis for Pet ${name} (Owner: ${ownerName})...`
  );

  const imagePart = fileToGenerativePart(certificateBase64, certificateMimeType);
  let aiResult = null;
  let ownerNameMatch = false;
  const MAX_RETRIES = 3;

  // --- STRATEGY 1: GEMINI VISION (Best Quality) ---
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      const prompt = `
        You are a specialized Pet Certificate Verification AI. Analyze the uploaded document.
        
        User Data to Verify:
        - Pet Name: "${name}"
        - Pet Breed: "${breed}"
        - Owner Name: "${ownerName}" 
        
        Respond ONLY with a valid JSON object:
        {
          "extractedData": {
            "petName": "...",
            "ownerName": "...",
            "extractedDOB": "DD/MM/YYYY or N/A", 
            "extractedAge": "X years or N/A",
            "sireName": "Name or N/A",
            "damName": "Name or N/A",
            "aiOcrText": "Debug: Vision Analysis"
          },
          "vaccinationRecords": [],
          "status": "verified" | "rejected" | "needs-review",
          "reason": "..."
        }
      `;
      // Use visionModel
      const result = await visionModel.generateContent([prompt, imagePart]);
      const responseText = result.response.text();
      const cleanedText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
      aiResult = JSON.parse(cleanedText);
      break; 
    } catch (err) {
      console.warn(`Vision Attempt ${i + 1} failed:`, err.message);
      if (err.message.includes("403") || err.message.includes("decommissioned")) {
          // If key is dead or model dead, stop retrying Vision immediately
          break; 
      }
      if (i < MAX_RETRIES - 1) await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  // --- STRATEGY 2: OCR + TEXT MODEL (Fallback) ---
  if (!aiResult) {
      console.log("⚠️ Vision Logic Failed. Attempting OCR + Text Fallback...");
      
      // 1. Extract Text
      try {
          let ocrText = "";
          
          if (certificateMimeType === 'application/pdf') {
             console.log("📄 Processing PDF with pdf-parse...");
             try {
                 const pdfParse = (await import('pdf-parse')).default;
                 const buffer = Buffer.from(certificateBase64, 'base64');
                 const data = await pdfParse(buffer);
                 ocrText = data.text;
             } catch (pdfErr) {
                 console.error("PDF Parsing Failed:", pdfErr);
             }
          } else {
             // Convert to Buffer
             const buffer = Buffer.from(certificateBase64, 'base64');
             ocrText = await runStartTesseractOCR(buffer);
          }

          if (ocrText && ocrText.length > 20) {
              console.log("✅ OCR Success. Text Length:", ocrText.length);
              
               // 2. Send Text to Groq (Text Model)
               const prompt = `
                Analyze this OCR Text from a Pet Certificate and compare with User Data.
                
                OCR Text:
                """
                ${ocrText.slice(0, 3000)} 
                """

                User Data:
                - Pet: ${name} (${breed})
                - Owner: ${ownerName}

                Respond ONLY with JSON:
                {
                  "extractedData": {
                    "petName": "${name}", 
                    "ownerName": "Extracted Owner Name from text",
                    "extractedDOB": "N/A", 
                    "extractedAge": "N/A",
                    "sireName": "N/A",
                    "damName": "N/A",
                    "aiOcrText": "Source: OCR Fallback"
                  },
                  "vaccinationRecords": [],
                  "status": "verified" | "rejected" | "needs-review",
                  "reason": "Explain based on text comparison."
                }
               `;
               
              try {
                  const chat = textModel.startChat({ history: [] }); // Uses Groq text model fallback
                  const result = await chat.sendMessage(prompt);
                  const txt = result.response.text().replace(/```json/g, "").replace(/```/g, "").trim();
                  aiResult = JSON.parse(txt);
                  console.log("✅ Text AI Analysis Success");
              } catch (textErr) {
                  console.error("Text AI Failed:", textErr);
              }

          } else {
              console.warn("OCR produced too little text or failed.");
          }

      } catch (ocrErr) {
          console.error("OCR Pipeline Failed:", ocrErr);
      }
  }

  // Handle Complete Failure
  if (!aiResult) {
    return {
      aiResult: null,
      ownerNameMatch: false,
      error: "All Analysis Methods Failed (Vision & OCR).",
    };
  }

  // Logic to finalize verification (Match Check)
  // Re-verify both owner name AND pet name
  const extractedOwnerName = aiResult.extractedData?.ownerName?.toLowerCase() || "";
  const expectedOwnerName = ownerName.toLowerCase();
  const isOwnerSubstringMatch =
    extractedOwnerName.includes(expectedOwnerName) ||
    expectedOwnerName.includes(extractedOwnerName);
  const isOwnerSane = extractedOwnerName.length >= 3 || expectedOwnerName.length >= 3;
  ownerNameMatch = isOwnerSubstringMatch && isOwnerSane;

  const extractedPetName = aiResult.extractedData?.petName?.toLowerCase() || "";
  const expectedPetName = name.toLowerCase();
  const isPetSubstringMatch =
    extractedPetName.includes(expectedPetName) ||
    expectedPetName.includes(extractedPetName);
  const isPetSane = extractedPetName.length >= 2 || expectedPetName.length >= 2;
  const petNameMatch = isPetSubstringMatch && isPetSane;

  let finalStatus;
  let finalReason;

  if (ownerNameMatch && petNameMatch) {
    finalStatus = "verified";
    finalReason = "Verified via " + (aiResult.extractedData.aiOcrText?.includes("OCR") ? "OCR Text Analysis" : "Visual Analysis");
  } else if (!ownerNameMatch && !petNameMatch) {
    finalStatus = "rejected";
    finalReason = `Owner Mismatch & Pet Mismatch. Owner found: ${extractedOwnerName}, expected: ${expectedOwnerName}. Pet found: ${extractedPetName}, expected: ${expectedPetName}.`;
  } else if (!ownerNameMatch) {
    finalStatus = "rejected";
    finalReason = `Owner Mismatch (${aiResult.extractedData.aiOcrText?.includes("OCR") ? "OCR" : "Vision"}). found: ${extractedOwnerName}, expected: ${expectedOwnerName}`;
  } else if (!petNameMatch) {
    finalStatus = "rejected";  
    finalReason = `Pet Name Mismatch (${aiResult.extractedData.aiOcrText?.includes("OCR") ? "OCR" : "Vision"}). found: ${extractedPetName}, expected: ${expectedPetName}`;  
  }

  aiResult.finalStatus = finalStatus;
  aiResult.reason = finalReason;

  return { aiResult, ownerNameMatch, petNameMatch };
};

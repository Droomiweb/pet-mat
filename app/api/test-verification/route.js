// app/api/test-verification/route.js

// 1. IMPORTS
import { GoogleGenerativeAI } from "@google/generative-ai";
import { v2 as cloudinary } from "cloudinary";

// 2. CONFIGURATION
// Setup Cloudinary for temporary image hosting
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Setup Gemini Flash (Fast & Multimodal)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// 3. HELPER: Age Calculation
// Converts DD/MM/YYYY -> Decimal Age (e.g., 2.5 years)
const calculateAgeInYears = (dobString) => {
    if (!dobString || dobString.toUpperCase() === 'N/A') return null;
    const parts = dobString.split('/');
    if (parts.length !== 3) return null;
    
    const dob = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    const now = new Date();
    
    if (isNaN(dob.getTime()) || dob > now) return null;

    // Logic: Calculate total months difference, divide by 12
    const totalMonths = (now.getFullYear() - dob.getFullYear()) * 12 + (now.getMonth() - dob.getMonth()) + (now.getDate() < dob.getDate() ? -1 : 0);
    
    return Math.round((totalMonths / 12) * 10) / 10;
};

// 4. POST HANDLER (Simulation)
export async function POST(req) {
  try {
    // Parse test data
    // ownerName is crucial for the "Name Match" security check
    const { imageBase64, petName, petBreed, petAge, ownerName } = await req.json();

    if (!imageBase64 || !petName || !ownerName) {
      return new Response(JSON.stringify({ error: "Image, Pet Name, and Owner Name are required" }), { status: 400 });
    }

    // --- A. UPLOAD ASSET ---
    // We upload to a specific 'tests' folder in Cloudinary to keep it separate from real user data.
    const uploadRes = await cloudinary.uploader.upload(imageBase64, {
      folder: "tests/verification",
      resource_type: 'auto',
    });

    // Detect MIME type (Default to JPEG if unknown)
    const mimeType = imageBase64.startsWith('data:application/pdf') ? 'application/pdf' : 'image/jpeg';
    
    // Prepare payload for Gemini (removing the base64 header)
    const base64Data = imageBase64.split(",")[1] || imageBase64;
    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: mimeType,
      },
    };

    // --- B. CONSTRUCT PROMPT ---
    // This uses the exact same prompt logic as the production route to ensure the test is valid.
    const prompt = `
      You are a specialized Pet Certificate Verification AI for a sandbox environment. Analyze the uploaded document (image or PDF) and compare it against the provided data.
      
      User-Provided Data:
      - Pet Name: "${petName}"
      - Pet Breed: "${petBreed}"
      - User-Input Age: "${petAge}"
      - Owner Name (Expected): "${ownerName}" 

      Tasks:
      1. **Extract all key data** from the document: Pet Name, Pet Owner Name, and the pet's **Date of Birth (DOB)**.
      2. **Extract Vaccination Records**: Find all vaccine names, the date they were given (DD/MM/YYYY), and their expiration date (DD/MM/YYYY).
      3. **Compare** the extracted Pet Owner Name against the Expected Owner Name.
      4. **Determine a status**: "verified" | "rejected" | "needs-review". A rejection should occur if the Owner Name clearly mismatches.

      Respond ONLY with a valid JSON object in this exact format:
      {
        "extractedData": {
          "petName": "...",
          "ownerName": "...",
          "extractedDOB": "DD/MM/YYYY or N/A", 
          "extractedAge": "X years or N/A",
          "aiOcrText": "Full readable text (for debug/admin)"
        },
        "vaccinationRecords": [
          { "vaccineName": "Rabies", "vaccinationDate": "DD/MM/YYYY or N/A", "expiryDate": "DD/MM/YYYY or N/A" }
        ],
        "status": "verified" | "rejected" | "needs-review",
        "reason": "Short explanation of the verification result."
      }
    `;

    // --- C. CALL GEMINI ---
    const result = await model.generateContent([prompt, imagePart]);
    const responseText = result.response.text();
    
    // Clean JSON (remove markdown)
    let cleanedText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
    const aiResult = JSON.parse(cleanedText);

    // --- D. SERVER-SIDE PROCESSING ---
    
    // 1. Owner Name Verification (Fuzzy Match)
    const extractedOwnerName = aiResult.extractedData?.ownerName?.toLowerCase() || '';
    const expectedOwnerName = ownerName.toLowerCase();
    
    const isSubstringMatch = extractedOwnerName.includes(expectedOwnerName) || 
                             expectedOwnerName.includes(extractedOwnerName);
                             
    // Sanity check (prevent 1-letter matches)
    const isSane = extractedOwnerName.length >= 3 || expectedOwnerName.length >= 3;
    
    const ownerNameMatch = isSubstringMatch && isSane;

    // 2. Calculate "Trust Score" (For visualization purposes)
    let score = 0;
    let scoreReasons = [];
    
    if (ownerNameMatch) {
        score += 60;
        scoreReasons.push("Owner Name Match (60%)");
    }

    if (aiResult.extractedData?.extractedDOB && aiResult.extractedData.extractedDOB.toUpperCase() !== 'N/A') {
        score += 20;
        scoreReasons.push("DOB Extracted (20%)");
    }
    
    if (aiResult.vaccinationRecords?.length > 0) {
        score += 20;
        scoreReasons.push("Vaccination Records Extracted (20%)");
    }
    
    // 3. Final Decision Logic
    let finalStatus;
    let finalReason;

    if (ownerNameMatch) {
        finalStatus = 'verified';
        finalReason = `Owner name matched, and key certificate data was successfully extracted. Auto-verified with ${score}% match score.`;
    } else {
        finalStatus = 'rejected';
        finalReason = "Owner Name Mismatch. Primary security check failed (Name on certificate does not match user name).";
    }
    
    // 4. Age Calculation
    const calculatedAge = calculateAgeInYears(aiResult.extractedData?.extractedDOB);

    // 5. Parse Vaccinations (Active/Expired Logic)
    const parsedVaccinations = (aiResult.vaccinationRecords || []).map(vax => {
        const parseDate = (dateStr) => {
            if (!dateStr || dateStr.toUpperCase() === 'N/A') return null;
            const parts = dateStr.split('/');
            if (parts.length === 3) {
                return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
            }
            return null;
        };

        const vaxDate = parseDate(vax.vaccinationDate);
        const expiryDate = parseDate(vax.expiryDate);

        let status = 'active';
        if (!expiryDate || isNaN(expiryDate.getTime())) {
            status = 'needs-review'; // Date missing
        } else if (expiryDate < new Date()) {
            status = 'expired'; // Date passed
        } else if (expiryDate < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) {
            status = 'upcoming'; // Expires within 30 days
        }
        
        return {
            vaccineName: vax.vaccineName || 'Unknown',
            vaccinationDate: vaxDate?.toISOString() || 'N/A',
            expiryDate: expiryDate?.toISOString() || 'N/A',
            status: status,
        };
    });

    // --- E. RESPONSE ---
    // Return all data needed to render the "Result Card" on the frontend.
    return new Response(JSON.stringify({
      success: true,
      certificateUrl: uploadRes.secure_url,
      ownerNameMatch: ownerNameMatch,
      calculatedAge: calculatedAge,
      verificationScore: score, // UI can show a progress bar
      scoreReasons: scoreReasons, 
      vaccinationHistory: parsedVaccinations,
      
      analysis: {
        petName: aiResult.extractedData?.petName,
        ownerName: aiResult.extractedData?.ownerName,
        extractedDOB: aiResult.extractedData?.extractedDOB,
        aiOcrText: aiResult.extractedData?.aiOcrText,
      },
      decision: {
        status: finalStatus,
        reason: finalReason,
      },
      debugLogs: [`AI Verdict: ${aiResult.status.toUpperCase()}`, `Server Final Status: ${finalStatus.toUpperCase()}`]
    }), { status: 200 });

  } catch (err) {
    console.error("Test Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
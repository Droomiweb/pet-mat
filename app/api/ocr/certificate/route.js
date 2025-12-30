
import { visionModel } from "../../../lib/gemini";

export const maxDuration = 60; // Allow longer timeout for AI

export async function POST(req) {
    try {
        const { imageBase64 } = await req.json();

        if (!imageBase64) {
            return new Response(JSON.stringify({ error: "Image is required" }), { status: 400 });
        }

        // Prepare Vision Prompt
        const prompt = `
      Analyze this image of a pet vaccination certificate or health record.
      Extract the following details into a JSON object. 
      If a field is missing or illegible, use an empty string "".
      For dates, use "DD/MM/YYYY" format.

      Target JSON Structure:
      {
        "clinicName": "",
        "clinicAddress": "",
        "clinicPhone": "",
        "vetLicense": "",
        "ownerName": "",
        "ownerAddress": "",
        "petName": "",
        "species": "Dog|Cat|Rabbit|Bird|Other", 
        "breed": "",
        "sex": "Male|Female",
        "dob": "",
        "color": "",
        "weight": "",
        "microchip": "",
        
        "vax1Date": "", "vax1Expiry": "", // For DHPP/FVRCP/Core
        "vax2Date": "", "vax2Expiry": "", // For Rabies
        "vax3Date": "", "vax3Expiry": "", // Other
        "vax4Date": "", "vax4Expiry": "",
        "vax5Date": "", "vax5Expiry": "",
        
         "vetSignature": "" // Name of vet
      }
      
      For species, infer from vaccine types if not explicit (e.g., DHPP = Dog, FVRCP = Cat).
      Return ONLY valid JSON.
    `;

        // Prepare Payload for Gemini (inline data)
        // imageBase64 usually comes as "data:image/jpeg;base64,..."
        // We need to strip the prefix for the API part if passing as inlineData
        const base64Data = imageBase64.split(",")[1]; // remove data:image/xxx;base64,

        const inputParts = [
            {
                inlineData: {
                    mimeType: "image/jpeg", // Assuming JPEG for simplicity or detect from header
                    data: base64Data
                }
            },
            { text: prompt }
        ];

        const result = await visionModel.generateContent(inputParts);
        const response = await result.response;
        const text = response.text();

        // Clean JSON
        const jsonStr = text.replace(/```json|```/g, "").trim();

        let data;
        try {
            data = JSON.parse(jsonStr);
        } catch (e) {
            console.error("JSON Parse Error:", text);
            return new Response(JSON.stringify({ error: "Failed to parse AI response" }), { status: 500 });
        }

        return new Response(JSON.stringify(data), { status: 200 });

    } catch (error) {
        console.error("OCR API Error:", error);
        return new Response(JSON.stringify({ error: "Analysis failed" }), { status: 500 });
    }
}

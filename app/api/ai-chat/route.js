// app/api/ai-chat/route.js
import { textModel } from "../../lib/gemini";
import connectDB from "../../lib/mongodb";
import Pet from "../../models/PetModel";

export async function POST(req) {
  try {
    await connectDB();
    // Destructure the new 'image' and 'mimeType' fields
    const { history, message, petId, image, mimeType } = await req.json();

    let contextPrompt = "";
    let currentMemory = "No history recorded.";

    // 1. Fetch Pet Memory if petId is provided
    if (petId) {
        const pet = await Pet.findById(petId);
        if (pet) {
            currentMemory = pet.medicalHistoryLog || "No history recorded.";
            contextPrompt = `
            **IMPORTANT CONTEXT - PET MEDICAL MEMORY:**
            The user is asking about their pet named "${pet.name}" (${pet.breed}, ${pet.age}yo).
            Here is the saved history of past consultations/events for this pet:
            "${currentMemory}"
            
            Use this history to provide accurate, context-aware advice.
            `;
        }
    }

    // 2. Start Chat Session (Text Context)
    const chat = textModel.startChat({
      history: [
        ...history,
        { role: "user", parts: [{ text: contextPrompt || "System: No specific pet context selected." }] }
      ],
    });

    // 3. Prepare the Message Payload
    const systemInstruction = `
      [SYSTEM INSTRUCTION]:
      1. Answer as Dr. Paws (Vet).
      2. IF AN IMAGE IS PROVIDED: 
         - Analyze it strictly for pet health issues (skin, eyes, injuries, posture).
         - If the image is NOT a pet or related to veterinary care, politely refuse to analyze it.
      3. IF the user mentioned a new medical event (surgery, fever, symptoms, medication) to be remembered, append a summary at the very end like this:
      ||MEMORY_UPDATE||: [Concise summary]
    `;

    const textPart = `
      ${message}
      ${systemInstruction}
    `;

    let result;

    // 4. Send Message (Multimodal if image exists)
    if (image) {
        // Remove the header string (e.g., "data:image/jpeg;base64,") if present
        const base64Data = image.split(",")[1] || image;
        
        const imagePart = {
            inlineData: {
                data: base64Data,
                mimeType: mimeType || "image/jpeg"
            }
        };
        
        // Send text + image
        result = await chat.sendMessage([textPart, imagePart]);
    } else {
        // Send text only
        result = await chat.sendMessage(textPart);
    }

    const response = await result.response;
    let fullText = response.text();

    // 5. Extract and Save Memory
    let finalText = fullText;
    
    if (fullText.includes("||MEMORY_UPDATE||:")) {
        const parts = fullText.split("||MEMORY_UPDATE||:");
        finalText = parts[0].trim(); 
        const newMemoryFragment = parts[1].trim();

        if (petId && newMemoryFragment) {
            const pet = await Pet.findById(petId);
            const timestamp = new Date().toLocaleDateString();
            const updatedLog = `${pet.medicalHistoryLog || ''}\n- [${timestamp}]: ${newMemoryFragment}`;
            
            pet.medicalHistoryLog = updatedLog.slice(-3000); 
            await pet.save();
            console.log(`[PetDoc] Memory updated for ${pet.name}`);
        }
    }

    return new Response(JSON.stringify({ text: finalText }), { 
      status: 200,
      headers: { "Content-Type": "application/json" } 
    });

  } catch (error) {
    console.error("AI Chat Error:", error);
    return new Response(JSON.stringify({ error: "Failed to generate response. If uploading an image, ensure it is a supported format (JPG/PNG)." }), { status: 500 });
  }
}
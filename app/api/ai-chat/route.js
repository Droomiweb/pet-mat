// app/api/ai-chat/route.js
import { textModel } from "../../lib/gemini";
import connectDB from "../../lib/mongodb";
import Pet from "../../models/PetModel";

export async function POST(req) {
  try {
    await connectDB();
    
    const { history, message, petId, image, mimeType } = await req.json();

    let contextPrompt = "";
    let currentMemory = "No history recorded yet.";

    // 1. Retrieve Pet Context & Medical Memory
    if (petId) {
        const pet = await Pet.findById(petId);
        if (pet) {
            currentMemory = pet.medicalHistoryLog || "No history recorded yet.";
            contextPrompt = `
            **ACTIVE PATIENT CONTEXT:**
            - Name: ${pet.name}
            - Species: ${pet.type}
            - Breed: ${pet.breed}
            - Age: ${pet.age} years old
            
            **EXISTING MEDICAL HISTORY LOG:**
            """
            ${currentMemory}
            """
            
            **INSTRUCTION:** You are Dr. Paws. Use the history above to inform your answers.
            `;
        }
    }

    // 2. Initialize Chat with History
    const chat = textModel.startChat({
      history: [
        ...history,
        { role: "user", parts: [{ text: contextPrompt || "System: No specific pet selected." }] }
      ],
    });

    // 3. System Prompt - UPDATED for Detailed Storage & Clean UI
    const systemInstruction = `
      [SYSTEM PROTOCOLS]:
      1. **IDENTITY**: You are Dr. Paws, a professional AI Veterinarian.
      2. **SCOPE**: Answer questions related to animal health and care.
      
      3. **MEMORY UPDATE RULE (CRITICAL)**:
         - You must track the pet's health journey in detail.
         - IF the user mentions a NEW medical event (symptoms, injury, vet visit, medication, surgery, vaccination), you MUST append a summary tag at the very end of your response.
         - **Format:** ||MEMORY_UPDATE||: [Date] - [Detailed Clinical Note]
         - **INSTRUCTION FOR NOTE:** Do not be brief. Store ALL specific details provided by the user (e.g., "Surgery on left leg for fracture," "Prescribed 5mg Prednisone," "Doctor said rest for 2 weeks").
         - **Example:** "...hope Peggy feels better. ||MEMORY_UPDATE||: 27/11/2025 - Surgery performed on rear left leg to repair cruciate ligament. Owner advised to keep pet in crate for 10 days."
         - If no new medical info is shared, do NOT output the tag.
    `;

    const textPart = `${message}\n\n${systemInstruction}`;
    let result;

    // 4. Send Request (Multimodal if image exists)
    if (image) {
        const base64Data = image.split(",")[1] || image;
        const imagePart = {
            inlineData: {
                data: base64Data,
                mimeType: mimeType || "image/jpeg"
            }
        };
        result = await chat.sendMessage([textPart, imagePart]);
    } else {
        result = await chat.sendMessage(textPart);
    }

    const response = await result.response;
    const fullText = response.text();

    // 5. Robust Parsing (Fixes the "Showing Tag" issue)
    let finalText = fullText;
    
    // Regex to capture "||MEMORY_UPDATE||:" and EVERYTHING after it (including newlines)
    // [\s\S]* matches any character including newlines, ensuring we catch the whole tag.
    const memoryRegex = /\|\|\s*MEMORY_UPDATE\s*\|\|\s*:\s*([\s\S]*)/i;
    const match = fullText.match(memoryRegex);

    if (match) {
        // Remove the tag from the text sent to the user
        finalText = fullText.replace(match[0], "").trim(); 
        
        const newMemoryFragment = match[1].trim();

        // 6. Update MongoDB
        if (petId && newMemoryFragment) {
            const pet = await Pet.findById(petId);
            if (pet) {
                const timestamp = new Date().toLocaleDateString("en-GB"); // DD/MM/YYYY
                
                // Append new detailed entry to the log
                // If the log was just the default message, start fresh
                const oldLog = (pet.medicalHistoryLog === "No medical history recorded yet.") ? "" : pet.medicalHistoryLog;
                
                const updatedLog = `${oldLog}\n- [${timestamp}] ${newMemoryFragment}`.trim();
                
                // Increased limit to 10,000 characters to hold more details
                pet.medicalHistoryLog = updatedLog.slice(-10000); 
                
                await pet.save();
                console.log(`[Medical Memory] Updated for ${pet.name}`);
            }
        }
    }

    return new Response(JSON.stringify({ text: finalText }), { status: 200 });

  } catch (error) {
    console.error("Dr. Paws Chat Error:", error);
    return new Response(JSON.stringify({ error: "Dr. Paws is currently offline. Please try again." }), { status: 500 });
  }
}
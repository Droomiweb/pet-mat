// app/api/ai-chat/route.js

// Standard imports
import { textModel } from "../../lib/gemini"; // AI configuration
import connectDB from "../../lib/mongodb";
import Pet from "../../models/PetModel";

export async function POST(req) {
  try {
    await connectDB();
    
    // Parse request body
    const { history, message, petId, image, mimeType } = await req.json();

    let contextPrompt = "";
    let currentMemory = "No history recorded yet.";

    // Fetch pet context
    if (petId) {
        const pet = await Pet.findById(petId);
        if (pet) {
            currentMemory = pet.medicalHistoryLog || "No history recorded yet.";
            
            // Build system context
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

    // Start chat session
    const chat = textModel.startChat({
      history: [
        ...history,
        { role: "user", parts: [{ text: contextPrompt || "System: No specific pet selected." }] }
      ],
    });

    // Define AI rules
    const systemInstruction = `
      [SYSTEM PROTOCOLS]:
      1. **IDENTITY**: You are Dr. Paws, a professional AI Veterinarian.
      2. **SCOPE**: Answer questions related to animal health and care.
      
      3. **MEMORY UPDATE RULE (CRITICAL)**:
         - You must track the pet's health journey in detail.
         - IF the user mentions a NEW medical event (symptoms, injury, vet visit, medication, surgery, vaccination), you MUST append a summary tag at the very end of your response.
         - **Format:** ||MEMORY_UPDATE||: [Date] - [Detailed Clinical Note]
         - **INSTRUCTION FOR NOTE:** Do not be brief. Store ALL specific details.
         - If no new medical info is shared, do NOT output the tag.
    `;

    const textPart = `${message}\n\n${systemInstruction}`;
    let result;

    // Send AI message
    try {
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
    } catch (aiError) {
        console.warn("⚠️ Dr. Paws AI Rate Limit Hit:", aiError.message);
        
        // Handle rate limits
        if (aiError.message.includes("429") || aiError.message.includes("Quota")) {
            return new Response(JSON.stringify({ 
                text: "🚫 **High Traffic Alert:** I'm receiving too many requests right now! Please wait about 30 seconds and try asking me again. (Rate Limit Reached)" 
            }), { status: 200 });
        }
        
        // Handle connection errors
        return new Response(JSON.stringify({ 
            text: "My connection is a bit unstable. Please try again in a moment." 
        }), { status: 200 });
    }

    const response = await result.response;
    const fullText = response.text();

    // Clean response text
    let finalText = fullText;
    
    const memoryRegex = /\|\|\s*MEMORY_UPDATE\s*\|\|\s*:\s*([\s\S]*)/i;
    const match = fullText.match(memoryRegex);

    if (match) {
        finalText = fullText.replace(match[0], "").trim(); 
        const newMemoryFragment = match[1].trim();

        // Update medical log
        if (petId && newMemoryFragment) {
            const pet = await Pet.findById(petId);
            if (pet) {
                const timestamp = new Date().toLocaleDateString("en-GB"); 
                const oldLog = (pet.medicalHistoryLog === "No medical history recorded yet.") ? "" : pet.medicalHistoryLog;
                const updatedLog = `${oldLog}\n- [${timestamp}] ${newMemoryFragment}`.trim();
                pet.medicalHistoryLog = updatedLog.slice(-10000); 
                await pet.save();
                console.log(`[Medical Memory] Updated for ${pet.name}`);
            }
        }
    }

    // Return API response
    return new Response(JSON.stringify({ text: finalText }), { status: 200 });

  } catch (error) {
    console.error("Dr. Paws Critical Error:", error);
    // Handle server errors
    return new Response(JSON.stringify({ error: "Dr. Paws is currently offline. Please try again." }), { status: 500 });
  }
}
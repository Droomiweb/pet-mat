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

    // Start chat session with a system-aware initial state
    const chat = textModel.startChat({
      history: history.length === 0 ? [
        { role: "user", parts: [{ text: contextPrompt || "System initialized." }] },
        { role: "model", parts: [{ text: "Understood. I'm ready to assist with your pet's health. How can I help today?" }] }
      ] : history,
    });

    // Define AI rules (CONCISE & DIRECT)
    const systemInstruction = `
      [STRICT PROTOCOLS]:
      1. **IDENTITY**: You are Dr. Paws, a friendly but highly efficient AI Veterinarian.
      2. **STYLE**: Be extremely concise and direct. Avoid long-winded explanations.
      3. **NO BOILERPLATE**: Do NOT introduce yourself or acknowledge the pet's details in every message (e.g., skip "Hello, I'm analyzing..."). Just answer the user's specific question immediately.
      4. **FORMAT**: Use brief bullet points for medical advice or instructions.
      5. **TONE**: Conversational and professional, but brief.
      
      6. **MEMORY UPDATE RULE (HIDDEN)**:
         - IF new medical info (symptoms, medication, surgery) is shared, append:
           ||MEMORY_UPDATE||: [Clinical Note]
         - Hide this from the user's view (it will be processed internally).
    `;

    const textPart = `${message}\n\n(Remember: Be very brief/concise. ${systemInstruction})`;
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
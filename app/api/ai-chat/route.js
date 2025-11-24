// app/api/ai-chat/route.js
import { textModel } from "../../lib/gemini";
import connectDB from "../../lib/mongodb";
import Pet from "../../models/PetModel";

export async function POST(req) {
  try {
    await connectDB();
    // Destructure the 'image' and 'mimeType' fields from the request
    const { history, message, petId, image, mimeType } = await req.json();

    let contextPrompt = "";
    let currentMemory = "No history recorded.";

    // 1. Fetch Pet Memory if petId is provided (for context-aware answers)
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
    // We include the Pet Memory context at the start of the history
    const chat = textModel.startChat({
      history: [
        ...history,
        { role: "user", parts: [{ text: contextPrompt || "System: No specific pet context selected." }] }
      ],
    });

    // 3. Prepare the STRICT System Instructions
    const systemInstruction = `
      [SYSTEM INSTRUCTION - STRICT]:
      1. You are Dr. Paws, a helpful AI Veterinary Assistant.
      
      2. **IMAGE ANALYSIS RULES**:
         - If the user sends an image, you MUST first check if it contains a pet (dog, cat, bird, etc.) or a pet-related item (medical report, medication, pet food label, poop/vomit for diagnosis).
         - **IF THE IMAGE IS NOT RELATED TO PETS OR VETERINARY CARE (e.g., a selfie, a car, a building, random object), YOU MUST REFUSE TO ANALYZE IT.**
         - Polite refusal example: "I'm Dr. Paws, a vet assistant. I can only analyze images related to your pet's health or care. That looks like something else!"
         - If the image IS valid, analyze it strictly for health issues (skin, eyes, injuries, posture) or care advice.

      3. **TEXT RULES**:
         - Answer only questions related to pet health, behavior, nutrition, or care. 
         - If the user asks about general topics (coding, math, news), politely redirect them to pet care.

      4. **MEMORY UPDATE**:
         - IF the user mentioned a new medical event (surgery, fever, symptoms, medication) to be remembered, append a summary at the very end of your response like this:
         ||MEMORY_UPDATE||: [Concise summary of the event]
    `;

    // Combine user message with instructions
    const textPart = `
      ${message}
      
      ${systemInstruction}
    `;

    let result;

    // 4. Send Message (Multimodal if image exists)
    if (image) {
        // Remove the header string (e.g., "data:image/jpeg;base64,") if present to get raw base64
        const base64Data = image.split(",")[1] || image;
        
        const imagePart = {
            inlineData: {
                data: base64Data,
                mimeType: mimeType || "image/jpeg"
            }
        };
        
        // Send text + image to Gemini
        result = await chat.sendMessage([textPart, imagePart]);
    } else {
        // Send text only
        result = await chat.sendMessage(textPart);
    }

    const response = await result.response;
    let fullText = response.text();

    // 5. Extract and Save Memory (if the AI generated a memory update)
    let finalText = fullText;
    
    if (fullText.includes("||MEMORY_UPDATE||:")) {
        const parts = fullText.split("||MEMORY_UPDATE||:");
        finalText = parts[0].trim(); // The actual chat response to show user
        const newMemoryFragment = parts[1].trim();

        // Update the database silently
        if (petId && newMemoryFragment) {
            const pet = await Pet.findById(petId);
            const timestamp = new Date().toLocaleDateString();
            const updatedLog = `${pet.medicalHistoryLog || ''}\n- [${timestamp}]: ${newMemoryFragment}`;
            
            pet.medicalHistoryLog = updatedLog.slice(-3000); // Keep log size manageable
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
    return new Response(JSON.stringify({ error: "Failed to generate response. Please try again." }), { status: 500 });
  }
}
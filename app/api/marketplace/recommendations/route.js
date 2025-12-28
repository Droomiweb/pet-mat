// app/api/marketplace/recommendations/route.js

// Standard imports
import connectDB from "../../../lib/mongodb"; 
import Pet from "../../../models/PetModel"; 
import { textModel } from "../../../lib/gemini"; 

// Dynamic config
export const dynamic = 'force-dynamic';

// Fallback items (Instant load if AI fails)
const getFallbackItems = (petType = "Pet") => {
    return [
        {
            title: `Premium ${petType} Nutrition`,
            query: `best ${petType} food`,
            price: "899",
            category: "Food",
            imageUrl: `https://image.pollinations.ai/prompt/premium ${petType} food packaging?nologo=true`
        },
        {
            title: "Durable Play Toy",
            query: `tough ${petType} toys`,
            price: "450",
            category: "Gear",
            imageUrl: `https://image.pollinations.ai/prompt/colorful ${petType} toy?nologo=true`
        },
        {
            title: "Orthopedic Bed",
            query: `comfortable ${petType} bed`,
            price: "1299",
            category: "Gear",
            imageUrl: `https://image.pollinations.ai/prompt/cozy ${petType} bed?nologo=true`
        },
        {
            title: "Healthy Treats",
            query: `natural ${petType} treats`,
            price: "350",
            category: "Food",
            imageUrl: `https://image.pollinations.ai/prompt/jar of ${petType} treats?nologo=true`
        }
    ];
};

export async function POST(req) {
  let petType = "Pet"; 

  try {
    await connectDB();
    const { petId } = await req.json();

    if (!petId) return new Response(JSON.stringify({ error: "Pet ID required" }), { status: 400 });

    const pet = await Pet.findById(petId);
    
    if (!pet || !pet.aiProfileString) {
      return new Response(JSON.stringify({ error: "Pet profile not found." }), { status: 400 });
    }

    petType = pet.type || "Pet";

    // --- OPTIMIZED PROMPT (Faster) ---
    // We only ask for data, not image descriptions.
    const prompt = `
      You are a personal shopper.
      Pet: "${pet.aiProfileString}" (${pet.breed}, ${pet.age}yo)

      List 8 products (4 Food, 4 Gear) available in India.
      RETURN JSON ONLY:
      {
        "recommendations": [
          { "title": "Short Name", "query": "Amazon Query", "price": "INR Price", "category": "Food/Gear" }
        ]
      }
    `;

    // Generate AI content
    const result = await textModel.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    // Clean JSON
    const jsonStartIndex = text.indexOf('{');
    const jsonEndIndex = text.lastIndexOf('}');
    if (jsonStartIndex !== -1 && jsonEndIndex !== -1) {
        text = text.substring(jsonStartIndex, jsonEndIndex + 1);
    }
    
    let aiData;
    try {
        aiData = JSON.parse(text);
    } catch (e) {
        throw new Error("Invalid AI JSON"); 
    }

    // --- INSTANT IMAGE GENERATION ---
    // We use the product title directly. Removed 'flux' model for speed.
    const recommendations = (aiData.recommendations || []).map((item) => {
        // Construct a simple, effective prompt
        const simplePrompt = `${item.title} for ${pet.breed} pet product photography white background`;
        const encodedPrompt = encodeURIComponent(simplePrompt);
        
        return {
          ...item,
          // Removed '&model=flux' -> Defaults to Turbo (Fast)
          // Added 'seed' -> Ensures the image stays the same if reloaded
          imageUrl: `https://image.pollinations.ai/prompt/${encodedPrompt}?nologo=true&width=512&height=512&seed=${Math.floor(Math.random()*1000)}`
        };
    });

    return new Response(JSON.stringify({ recommendations }), { status: 200 });

  } catch (err) {
    console.warn("⚠️ Recommendation Error:", err.message);
    const fallbackData = getFallbackItems(petType);
    return new Response(JSON.stringify({ recommendations: fallbackData, isFallback: true }), { status: 200 });
  }
}
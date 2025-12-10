// app/api/marketplace/recommendations/route.js

// Standard imports
import connectDB from "../../../lib/mongodb"; 
import Pet from "../../../models/PetModel"; 
import { textModel } from "../../../lib/gemini"; // Gemini AI instance
import * as cheerio from 'cheerio'; // HTML scraper

// Dynamic config
export const dynamic = 'force-dynamic';

// Scrape Amazon images
async function fetchRealAmazonImage(query) {
  try {
    const url = `https://www.amazon.in/s?k=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      },
      cache: 'no-store'
    });
    
    if (!response.ok) return null;
    
    const html = await response.text();
    const $ = cheerio.load(html);
    const imageUrl = $('.s-image').first().attr('src');
    
    return imageUrl || null;
  } catch (error) {
    return null;
  }
}

// Generate fallback items
const getFallbackItems = (petType = "Pet") => {
    return [
        {
            title: `Premium ${petType} Food`,
            query: `best ${petType} food india`,
            price: "899",
            category: "Food",
            imageUrl: "https://image.pollinations.ai/prompt/premium%20pet%20food%20bag%20packaging%20white%20background?nologo=true"
        },
        {
            title: "Healthy Treats Pack",
            query: `healthy ${petType} treats`,
            price: "350",
            category: "Food",
            imageUrl: "https://image.pollinations.ai/prompt/dog%20treats%20biscuits%20white%20background?nologo=true"
        },
        {
            title: "Comfort Bedding",
            query: `comfortable ${petType} bed`,
            price: "1200",
            category: "Gear",
            imageUrl: "https://image.pollinations.ai/prompt/cozy%20pet%20bed%20cushion%20studio%20shot?nologo=true"
        },
        {
            title: "Interactive Toy",
            query: `durable ${petType} toy`,
            price: "450",
            category: "Gear",
            imageUrl: "https://image.pollinations.ai/prompt/colorful%20pet%20toy%20rubber%20bone?nologo=true"
        },
        {
            title: "Grooming Kit",
            query: `${petType} grooming brush`,
            price: "600",
            category: "Gear",
            imageUrl: "https://image.pollinations.ai/prompt/pet%20grooming%20brush%20comb?nologo=true"
        },
        {
            title: "Nutritional Supplements",
            query: `${petType} multivitamins`,
            price: "550",
            category: "Food",
            imageUrl: "https://image.pollinations.ai/prompt/pet%20vitamin%20bottle%20supplement?nologo=true"
        }
    ];
};

// POST request handler
export async function POST(req) {
  let petType = "Pet"; // Default fallback type

  try {
    await connectDB();
    
    const { petId } = await req.json();

    if (!petId) return new Response(JSON.stringify({ error: "Pet ID required" }), { status: 400 });

    const pet = await Pet.findById(petId);
    
    if (!pet || !pet.aiProfileString) {
      return new Response(JSON.stringify({ error: "Pet profile not found." }), { status: 400 });
    }

    petType = pet.type || "Pet"; // Set pet type

    // Define AI prompt
    const prompt = `
      Act as a professional personal shopper for this pet:
      "${pet.aiProfileString}"
      (Breed: ${pet.breed}, Type: ${pet.type}, Age: ${pet.age}, Energy: ${pet.energyLevel})

      Your Task:
      Generate exactly 8 high-quality product recommendations available on Amazon India.
      
      Constraint:
      - 4 items MUST be Food/Nutrition.
      - 4 items MUST be Toys/Gear.
      
      For EACH item, provide:
      1. "title": Short product name.
      2. "query": Amazon search query.
      3. "price": Estimated price in INR.
      4. "fallbackImagePrompt": Visual description for AI image generator.
      5. "category": "Food" or "Gear".

      Respond ONLY with this JSON structure:
      {
        "recommendations": [
          { "title": "...", "query": "...", "price": "...", "fallbackImagePrompt": "...", "category": "..." }
        ]
      }
    `;

    // Generate AI content
    const result = await textModel.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    // Clean JSON response
    const jsonStartIndex = text.indexOf('{');
    const jsonEndIndex = text.lastIndexOf('}');
    if (jsonStartIndex !== -1 && jsonEndIndex !== -1) {
        text = text.substring(jsonStartIndex, jsonEndIndex + 1);
    }
    
    let aiData;
    try {
        aiData = JSON.parse(text);
    } catch (e) {
        console.error("Failed to parse AI response");
        // Trigger fallback
        throw new Error("Invalid AI JSON"); 
    }

    // Fetch item images
    const enrichedRecommendations = await Promise.all(
      (aiData.recommendations || []).map(async (item) => {
        const realImage = await fetchRealAmazonImage(item.query);
        return {
          ...item,
          imageUrl: realImage || `https://image.pollinations.ai/prompt/photorealistic ${item.fallbackImagePrompt} white background?nologo=true`
        };
      })
    );

    return new Response(JSON.stringify({
        recommendations: enrichedRecommendations
    }), { status: 200 });

  } catch (err) {
    console.warn("⚠️ Marketplace Recommendation Error (Rate Limit/AI Fail). Using Fallback.", err.message);
    
    // Use fallback data
    const fallbackData = getFallbackItems(petType);
    
    return new Response(JSON.stringify({ 
        recommendations: fallbackData,
        isFallback: true // Optional UI flag
    }), { status: 200 });
  }
}
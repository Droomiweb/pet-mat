// app/api/marketplace/recommendations/route.js
import connectDB from "../../../lib/mongodb"; 
import Pet from "../../../models/PetModel"; 
import { textModel } from "../../../lib/gemini"; 
import * as cheerio from 'cheerio'; 

export const dynamic = 'force-dynamic';

// --- Helper: Scrape Amazon (Unchanged) ---
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

export async function POST(req) {
  try {
    await connectDB();
    const { petId } = await req.json();

    if (!petId) return new Response(JSON.stringify({ error: "Pet ID required" }), { status: 400 });

    const pet = await Pet.findById(petId);
    if (!pet || !pet.aiProfileString) {
      return new Response(JSON.stringify({ error: "Pet profile not found." }), { status: 400 });
    }

    // --- UPDATED PROMPT: Ask for 12 items ---
    const prompt = `
      Act as a professional personal shopper for this pet:
      "${pet.aiProfileString}"
      (Breed: ${pet.breed}, Type: ${pet.type}, Age: ${pet.age}, Energy: ${pet.energyLevel})

      Your Task:
      Generate exactly 12 high-quality product recommendations available on Amazon India.
      
      **Constraint:**
      - 6 items MUST be **Food/Nutrition/Treats** (Specific to breed/age, e.g., "Calcium bones", "Puppy kibble").
      - 6 items MUST be **Toys/Gear/Grooming** (Specific to behavior, e.g., "Squeaky toy", "Shampoo", "Leash").
      
      For EACH item, provide:
      1. "title": A clean, short product name (Max 5-6 words).
      2. "query": The precise Amazon search query.
      3. "price": Estimated price in INR.
      4. "fallbackImagePrompt": A simple visual description for an AI image generator.
      5. "category": "Food" or "Gear".

      **Respond ONLY with this JSON structure:**
      {
        "recommendations": [
          { "title": "...", "query": "...", "price": "...", "fallbackImagePrompt": "...", "category": "..." }
          // ... total 12 items
        ]
      }
    `;

    const result = await textModel.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    const jsonStartIndex = text.indexOf('{');
    const jsonEndIndex = text.lastIndexOf('}');
    if (jsonStartIndex !== -1 && jsonEndIndex !== -1) {
        text = text.substring(jsonStartIndex, jsonEndIndex + 1);
    }
    
    let aiData;
    try {
        aiData = JSON.parse(text);
    } catch (e) {
        aiData = { recommendations: [] };
    }

    // Fetch Real Images in Parallel
    // Note: Fetching 12 images might take 2-3 seconds, which is acceptable for a "generating" state.
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
    console.error("Recommendation Error:", err);
    return new Response(JSON.stringify({ recommendations: [] }), { status: 200 });
  }
}
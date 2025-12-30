// app/api/marketplace/recommendations/route.js

// Standard imports
import connectDB from "../../../lib/mongodb";
import Pet from "../../../models/PetModel";
import { textModel } from "../../../lib/gemini";
import * as cheerio from 'cheerio';

// Dynamic config
export const dynamic = 'force-dynamic';

// --- HELPER: Get Real Image URL (Bing Search) ---
// Uses Bing Image Search Thumbnails to get a real image of the product.
const getSearchImageUrl = (query) => {
  const encodedQuery = encodeURIComponent(query.trim());
  // w=500&h=500 ensures decent quality, c=7 crops to fill
  return `https://tse2.mm.bing.net/th?q=${encodedQuery}&w=500&h=500&c=7&rs=1&p=0`;
};

// --- HELPER: Scrape Amazon (Best Effort) ---
const scrapeAmazon = async (query) => {
  try {
    const searchUrl = `https://www.amazon.in/s?k=${encodeURIComponent(query)}`;
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    };

    const response = await fetch(searchUrl, { headers, next: { revalidate: 3600 } }); // Cache for 1 hour
    if (!response.ok) return null;

    const html = await response.text();
    const $ = cheerio.load(html);

    // Select first non-sponsored product
    const product = $('div[data-component-type="s-search-result"]').first();

    if (!product.length) return null;

    const title = product.find('h2 a span').text().trim();
    const priceWhole = product.find('.a-price-whole').first().text().trim();
    const priceSymbol = product.find('.a-price-symbol').first().text().trim();
    const image = product.find('img.s-image').attr('src');
    const link = 'https://www.amazon.in' + product.find('h2 a').attr('href');

    if (!title || !priceWhole || !image) return null;

    return {
      title,
      price: `${priceSymbol}${priceWhole}`,
      imageUrl: image,
      productUrl: link,
      source: 'Amazon'
    };
  } catch (e) {
    console.error("Amazon Scrape Error:", e.message);
    return null;
  }
};

// --- HELPER: Scrape Flipkart (Best Effort) ---
// Note: Flipkart class names change frequently, using generic structure attempts
const scrapeFlipkart = async (query) => {
  try {
    const searchUrl = `https://www.flipkart.com/search?q=${encodeURIComponent(query)}`;
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
    };

    const response = await fetch(searchUrl, { headers, next: { revalidate: 3600 } });
    if (!response.ok) return null;

    const html = await response.text();
    const $ = cheerio.load(html);

    // Flipkart typically uses these classes for grid items
    // Trying multiple selectors as fallback
    let product = $('div._1AtVbE').find('div[data-id]').first(); // Common container

    // If specific "Vertical" layout
    if (!product.length) {
      product = $('div._75nlfW').first();
    }

    // Try to find title - usually div._4rR01T or a.s1Q9rs
    const title = product.find('div._4rR01T').text().trim() || product.find('a.s1Q9rs').text().trim();

    // Try to find price - usually div._30jeq3 or div.Nx9bqj
    const price = product.find('div._30jeq3').text().trim() || product.find('div.Nx9bqj').text().trim();

    // Try to find image - usually img._396cs4
    const image = product.find('img._396cs4').attr('src');

    // Link
    let linkHref = product.find('a._1fQZEK').attr('href') || product.find('a.s1Q9rs').attr('href');
    const link = linkHref ? `https://www.flipkart.com${linkHref}` : null;

    if (!title || !price || !image) return null;

    return {
      title,
      price,
      imageUrl: image,
      productUrl: link,
      source: 'Flipkart'
    };

  } catch (e) {
    console.error("Flipkart Scrape Error:", e.message);
    return null;
  }
}


// Fallback items (Instant load if AI fails)
const getFallbackItems = (petType = "Pet") => {
  return [
    {
      title: `Premium ${petType} Nutrition`,
      query: `best ${petType} food`,
      price: "₹899",
      category: "Food",
      imageUrl: getSearchImageUrl(`premium ${petType} food packaging`)
    },
    {
      title: "Durable Play Toy",
      query: `tough ${petType} toys`,
      price: "₹450",
      category: "Gear",
      imageUrl: getSearchImageUrl(`durable ${petType} toy`)
    },
    {
      title: "Orthopedic Bed",
      query: `comfortable ${petType} bed`,
      price: "₹1299",
      category: "Gear",
      imageUrl: getSearchImageUrl(`orthopedic ${petType} bed`)
    },
    {
      title: "Healthy Treats",
      query: `natural ${petType} treats`,
      price: "₹350",
      category: "Food",
      imageUrl: getSearchImageUrl(`natural ${petType} dog treats`)
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
          { "title": "Short Descriptive Name", "query": "Specific Search Query for India", "price": "Est. ₹ Price", "category": "Food/Gear" }
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

    // --- HYBRID GENERATION: SCRAPE OR SIMULATE ---
    const recommendations = await Promise.all((aiData.recommendations || []).map(async (item) => {
      // 1. Try Scraping Amazon (Primary Recommendation)
      // We add "India" to ensure we get regional results if possible
      const amazonData = await scrapeAmazon(item.query);

      if (amazonData) {
        return {
          ...item,
          ...amazonData, // Overwrite title, price, image with real data
          isScraped: true
        };
      }

      // 2. Try Scraping Flipkart (Secondary) if Amazon fails
      // Note: We use the same query but it might need adjustment for Flipkart if results are poor
      const flipkartData = await scrapeFlipkart(item.query);

      if (flipkartData) {
        return {
          ...item,
          ...flipkartData,
          isScraped: true
        };
      }

      // 3. Fallback: Bing Search Image (Reliable)
      // We use the product title directly for the search.
      return {
        ...item,
        imageUrl: getSearchImageUrl(`${item.title} ${petType} product`),
        isScraped: false // Mark as simulated
      };
    }));

    return new Response(JSON.stringify({ recommendations }), { status: 200 });

  } catch (err) {
    console.warn("⚠️ Recommendation Error:", err.message);
    const fallbackData = getFallbackItems(petType);
    return new Response(JSON.stringify({ recommendations: fallbackData, isFallback: true }), { status: 200 });
  }
}
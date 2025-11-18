// app/api/marketplace/recommendations/route.js
import connectDB from "../../../../lib/mongodb";
import Product from "../../../../models/ProductModel";
import Pet from "../../../../models/PetModel";
import { textModel } from "../../../../lib/gemini";

// Force dynamic to ensure we get fresh AI results
export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    await connectDB();
    const { petId } = await req.json();

    if (!petId) {
      return new Response(JSON.stringify({ error: "Pet ID is required" }), { status: 400 });
    }

    // 1. Fetch the Pet Data
    const pet = await Pet.findById(petId);
    if (!pet || !pet.aiProfileString) {
      return new Response(JSON.stringify({ error: "Pet profile not found. Please complete the AI profile first." }), { status: 400 });
    }

    // 2. Fetch Local Marketplace Products (for hybrid suggestions)
    const allProducts = await Product.find({}).select('name description category price').lean();
    
    // Format local products for AI context
    const productListString = allProducts.map(p => 
      `ID: ${p._id}, Name: "${p.name}", Desc: "${p.description}"`
    ).join("\n");

    // 3. Construct the AI Prompt
    const prompt = `
      Act as a generic pet shopping expert.
      
      Target Pet Profile:
      - Species/Breed: ${pet.type} / ${pet.breed}
      - Age: ${pet.age} years
      - Personality: "${pet.aiProfileString}"
      - Temperament: ${pet.temperament}
      - Energy Level: ${pet.energyLevel}

      Your Task:
      1. **Local Match:** Recommend up to 3 Product IDs from this local inventory that fit the pet:
      ${productListString}

      2. **External Search:** Generate 4 specific, distinct search queries for items this specific pet would love or needs. 
         - Focus on their specific traits (e.g., if "heavy chewer", suggest "indestructible toys").
         - Do NOT simply search for the breed name. Search for *solutions* or *fun items*.
         - Examples: "orthopedic bed for older dog", "interactive laser toy for energetic cat", "calming treats for anxious puppy".

      **Respond ONLY with this JSON structure:**
      {
        "localMatchIds": ["id1", "id2"],
        "externalQueries": [
           "search query 1",
           "search query 2",
           "search query 3",
           "search query 4"
        ]
      }
    `;

    // 4. Generate with Gemini
    const result = await textModel.generateContent(prompt);
    const response = await result.response;
    let text = response.text().replace(/```json/g, "").replace(/```/g, "").trim();
    
    let aiData;
    try {
        aiData = JSON.parse(text);
    } catch (e) {
        console.error("JSON Parse Error:", text);
        // Fallback if AI JSON is broken
        aiData = { localMatchIds: [], externalQueries: [`toys for ${pet.breed}`, `food for ${pet.breed}`] };
    }

    // 5. Filter the real local product objects based on AI IDs
    const recommendedProducts = allProducts.filter(p => 
        aiData.localMatchIds?.includes(p._id.toString())
    );

    return new Response(JSON.stringify({
        localProducts: recommendedProducts,
        externalQueries: aiData.externalQueries || []
    }), { status: 200 });

  } catch (err) {
    console.error("Recommendation Error:", err);
    return new Response(JSON.stringify({ localProducts: [], externalQueries: [] }), { status: 500 });
  }
}
// app/api/pregnancy/generate-extras/route.js

// Standard imports
import { textModel } from "../../../lib/gemini"; // AI configuration
import { NextResponse } from "next/server";

// POST request handler
export async function POST(req) {
  try {
    // Parse request data
    const { action, petBreed, petType, currentDay, totalDays } = await req.json();

    // Validate required fields
    if (!action || !petBreed || !currentDay) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Handle meal plan
    if (action === "meal_plan") {
      const prompt = `
        You are a veterinary nutritionist. Create a one-day healthy meal plan for a pregnant **${petBreed} ${petType}** who is at **Day ${currentDay}** of her ${totalDays}-day pregnancy.
        
        Focus on nutrients needed for this specific stage (e.g., calcium, protein, fat).
        
        **Format using Markdown:**
        - **🥣 Morning:** [Specific food & portion advice]
        - **🌙 Evening:** [Specific food & portion advice]
        - **🦴 Healthy Treats:** [Safe snack options]
        - **💧 Hydration:** [A tip for water intake]
        - **⚠️ Avoid:** [One specific food to strictly avoid today]
        
        Keep it concise, encouraging, and safe.
      `;

      // Generate AI content
      const result = await textModel.generateContent(prompt);
      const response = await result.response;
      
      // Return text response
      return NextResponse.json({ result: response.text() });
    }

    // Handle visual comparison
    if (action === "fetus_visual") {
      // Generate comparison text
      const textPrompt = `
        Compare the size of a ${petType} fetus at Day ${currentDay} (out of ${totalDays}) to a common fruit, vegetable, or seed.
        Examples: "Poppy seed", "Blueberry", "Lemon", "Avocado".
        
        Respond ONLY with a valid JSON object:
        {
          "comparisonText": "Your babies are currently the size of a [Object]!",
          "objectName": "[Object]" 
        }
      `;
      
      const textResult = await textModel.generateContent(textPrompt);
      
      // Clean JSON response
      const textResponse = textResult.response.text()
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();
        
      let data;
      try {
        data = JSON.parse(textResponse);
      } catch (e) {
        // Handle parsing errors
        data = { comparisonText: "Growing bigger every day!", objectName: "heart" };
      }

      // Sanitize object name
      const cleanObjectName = data.objectName.replace(/[^a-zA-Z0-9 ]/g, "");

      // Generate image URL
      const imagePrompt = `cute ${cleanObjectName} minimalistic vector illustration, white background`;
      const encodedPrompt = encodeURIComponent(imagePrompt);
      
      // Randomize seed
      const randomSeed = Math.floor(Math.random() * 1000);
      
      const imageUrl = `https://pollinations.ai/p/${encodedPrompt}?nologo=true&seed=${randomSeed}&width=512&height=512`;

      return NextResponse.json({ 
        result: data.comparisonText, 
        imageUrl: imageUrl 
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (error) {
    console.error("AI Extras Error:", error);
    return NextResponse.json({ error: "Failed to generate insight." }, { status: 500 });
  }
}
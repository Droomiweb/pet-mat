// app/api/pregnancy/generate-extras/route.js
import { textModel } from "../../../lib/gemini";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { action, petBreed, petType, currentDay, totalDays } = await req.json();

    if (!action || !petBreed || !currentDay) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // --- FEATURE 1: MEAL PLAN GENERATOR ---
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

      const result = await textModel.generateContent(prompt);
      const response = await result.response;
      return NextResponse.json({ result: response.text() });
    }

    // --- FEATURE 2: BABY SIZE VISUALIZER ---
    if (action === "fetus_visual") {
      // Step 1: Get the comparison object text
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
      const textResponse = textResult.response.text().replace(/```json/g, "").replace(/```/g, "").trim();
      const data = JSON.parse(textResponse);

      // --- FIX: Clean the object name to ensure a valid URL ---
      // This removes special characters that might break the image generator link
      const cleanObjectName = data.objectName.replace(/[^a-zA-Z0-9 ]/g, "");

      // Step 2: Generate Image URL
      const imagePrompt = `cute ${cleanObjectName} minimalistic vector illustration, white background`;
      const encodedPrompt = encodeURIComponent(imagePrompt);
      
      // --- FIX: Add random seed ---
      // This prevents caching errors and forces a new generation attempt
      const randomSeed = Math.floor(Math.random() * 1000);
      const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?nologo=true&seed=${randomSeed}`;

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
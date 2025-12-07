// app/api/pregnancy/generate-extras/route.js

// 1. IMPORTS
import { textModel } from "../../../lib/gemini"; // Our configured Google Gemini instance
import { NextResponse } from "next/server";

// 2. POST HANDLER
export async function POST(req) {
  try {
    // 3. PARSE REQUEST
    // We expect:
    // - action: 'meal_plan' OR 'fetus_visual'
    // - petBreed/Type: Context for the AI (Chihuahua vs Great Dane matters!)
    // - currentDay/totalDays: To calculate the specific development stage.
    const { action, petBreed, petType, currentDay, totalDays } = await req.json();

    // Basic Validation
    if (!action || !petBreed || !currentDay) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // ============================================================
    // FEATURE 1: MEAL PLAN GENERATOR
    // ============================================================
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

      // Call Gemini
      const result = await textModel.generateContent(prompt);
      const response = await result.response;
      
      // Return the raw markdown string. The frontend will render this nicely.
      return NextResponse.json({ result: response.text() });
    }

    // ============================================================
    // FEATURE 2: BABY SIZE VISUALIZER
    // ============================================================
    if (action === "fetus_visual") {
      // Step A: Get the comparison object text from Gemini
      // We ask for JSON so we can extract the object name cleanly for the image generator.
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
      
      // Clean up markdown code blocks if present
      const textResponse = textResult.response.text()
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();
        
      let data;
      try {
        data = JSON.parse(textResponse);
      } catch (e) {
        // Fallback if AI output is broken
        data = { comparisonText: "Growing bigger every day!", objectName: "heart" };
      }

      // Step B: Clean the object name
      // Ensure we don't pass weird characters to the URL generator
      const cleanObjectName = data.objectName.replace(/[^a-zA-Z0-9 ]/g, "");

      // Step C: Generate Image URL via Pollinations
      // We ask for a "cute minimalistic vector" style for a consistent app aesthetic.
      const imagePrompt = `cute ${cleanObjectName} minimalistic vector illustration, white background`;
      const encodedPrompt = encodeURIComponent(imagePrompt);
      
      // Add a random seed to bypass browser caching so the user gets a fresh image if they refresh
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
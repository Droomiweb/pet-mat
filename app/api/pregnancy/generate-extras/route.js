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
      // DETERMINISTIC SIZE CHART (Accurate Veterinary Data scaling)
      // Converted to percentages so it works for a 30-day rabbit or 63-day dog
      const FETUS_SIZE_CHART = [
        { percent: 0,   object: "Dust Speck", text: "Your babies are currently the size of a Dust Speck (microscopic)!" },
        { percent: 20,  object: "Grain of Sand", text: "Your babies are currently the size of a Grain of Sand!" },
        { percent: 35,  object: "Poppy Seed", text: "Your babies are currently the size of a Poppy Seed!" },
        { percent: 45,  object: "Blueberry", text: "Your babies are currently the size of a Blueberry!" },
        { percent: 55,  object: "Raspberry", text: "Your babies are currently the size of a Raspberry!" }, 
        { percent: 66,  object: "Fig", text: "Your babies are currently the size of a Fig!" },           
        { percent: 77,  object: "Lime", text: "Your babies are currently the size of a Lime!" },          
        { percent: 88,  object: "Avocado", text: "Your babies are currently the size of an Avocado!" },   
        { percent: 95,  object: "Sweet Potato", text: "Your babies are currently the size of a Sweet Potato!" } 
      ];

      // Calculate progress percentage
      const progressPercent = (currentDay / totalDays) * 100;

      // Find the closest milestone without going over
      let sizeData = FETUS_SIZE_CHART[0]; 
      
      for (let i = 0; i < FETUS_SIZE_CHART.length; i++) {
        if (progressPercent >= FETUS_SIZE_CHART[i].percent) {
          sizeData = FETUS_SIZE_CHART[i];
        } else {
          break; // Stop once we surpass the current progress
        }
      }

      // Sanitize object name for image generation prompt
      const cleanObjectName = sizeData.object.replace(/[^a-zA-Z0-9 ]/g, "");

      // Generate image URL (Pollinations.ai)
      const imagePrompt = `cute ${cleanObjectName} minimalistic vector illustration, white background, single object`;
      const encodedPrompt = encodeURIComponent(imagePrompt);
      const randomSeed = Math.floor(Math.random() * 1000);
      const imageUrl = `https://pollinations.ai/p/${encodedPrompt}?nologo=true&seed=${randomSeed}&width=512&height=512`;

      return NextResponse.json({ 
        result: sizeData.text, 
        imageUrl: imageUrl 
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (error) {
    console.error("AI Extras Error:", error);
    return NextResponse.json({ error: "Failed to generate insight." }, { status: 500 });
  }
}
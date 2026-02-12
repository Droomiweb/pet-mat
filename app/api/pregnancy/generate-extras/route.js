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
      // DETERMINISTIC SIZE CHART (Accurate Veterinary Data)
      // Based on ~63-65 day gestation for dogs/cats
      const FETUS_SIZE_CHART = [
        { day: 7,  object: "Dust Speck", text: "Your babies are currently the size of a Dust Speck (microscopic)!" },
        { day: 14, object: "Grain of Sand", text: "Your babies are currently the size of a Grain of Sand!" },
        { day: 21, object: "Poppy Seed", text: "Your babies are currently the size of a Poppy Seed!" },
        { day: 28, object: "Blueberry", text: "Your babies are currently the size of a Blueberry!" },
        { day: 35, object: "Raspberry", text: "Your babies are currently the size of a Raspberry!" }, // Week 5
        { day: 42, object: "Fig", text: "Your babies are currently the size of a Fig!" },           // Week 6
        { day: 49, object: "Lime", text: "Your babies are currently the size of a Lime!" },          // Week 7
        { day: 56, object: "Avocado", text: "Your babies are currently the size of an Avocado!" },   // Week 8
        { day: 63, object: "Sweet Potato", text: "Your babies are currently the size of a Sweet Potato!" } // Week 9
      ];

      // Find the closest milestone without going over
      // Default to "Dust Speck" if < 7 days
      let sizeData = FETUS_SIZE_CHART[0]; 
      
      for (let i = 0; i < FETUS_SIZE_CHART.length; i++) {
        if (currentDay >= FETUS_SIZE_CHART[i].day) {
          sizeData = FETUS_SIZE_CHART[i];
        } else {
          break; // Stop once we surpass the current day
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
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
      const imagePrompt = `highly detailed cute ${cleanObjectName} minimalistic illustration, white background, single object centered`;
      const encodedPrompt = encodeURIComponent(imagePrompt);
      const randomSeed = Math.floor(Math.random() * 100000);
      const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?nologo=true&seed=${randomSeed}&width=512&height=512`;

      let finalImageUrl = pollinationsUrl; // Default to direct link

        // Attempt to fetch and store in Cloudinary so the frontend doesn't break on redirects
        try {
            console.log(`[FetusVisual] Fetching from Pollinations: ${pollinationsUrl}`);
            const polRes = await fetch(pollinationsUrl, { signal: AbortSignal.timeout(8000) });
            
            if (polRes.ok) {
                const buffer = Buffer.from(await polRes.arrayBuffer());
                
                // Cloudinary import (requires it to be available in this file or globally)
                const cloudinary = require('cloudinary').v2;
                cloudinary.config({
                    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
                    api_key: process.env.CLOUDINARY_API_KEY,
                    api_secret: process.env.CLOUDINARY_API_SECRET,
                });

                if (process.env.CLOUDINARY_CLOUD_NAME) {
                    const uploadToCloudinary = () => {
                        return new Promise((resolve, reject) => {
                            const uploadStream = cloudinary.uploader.upload_stream(
                            { folder: "pregnancy_tracker_visuals" },
                            (error, result) => {
                                if (error) reject(error);
                                else resolve(result);
                            }
                            );
                            uploadStream.end(buffer);
                        });
                    };
                    const cloudinaryResult = await uploadToCloudinary();
                    finalImageUrl = cloudinaryResult.secure_url;
                    console.log(`[FetusVisual] Saved to Cloudinary: ${finalImageUrl}`);
                }
            } else {
                 console.warn(`[FetusVisual] Failed to fetch. Status: ${polRes.status}`);
                 finalImageUrl = ""; // Force fallback
            }
        } catch (e) {
            console.warn(`[FetusVisual] Exception fetching/saving image:`, e.message);
            finalImageUrl = ""; // Force fallback
        }

        // --- FALLBACK TO HUGGING FACE SDXL ---
        if (!finalImageUrl) {
            console.log(`[FetusVisual] Pollinations failed. Falling back to Hugging Face SDXL...`);
            const apiKey = process.env.HUGGINGFACE_API_KEY;
            const hfModel = "stabilityai/stable-diffusion-xl-base-1.0";

            let retries = 0;
            const MAX_RETRIES = 1;

            while (retries <= MAX_RETRIES && !finalImageUrl) {
                try {
                    const hfRes = await fetch(
                        `https://router.huggingface.co/hf-inference/models/${hfModel}`,
                        {
                            headers: {
                                Authorization: `Bearer ${apiKey}`,
                                "Content-Type": "application/json",
                            },
                            method: "POST",
                            body: JSON.stringify({ inputs: imagePrompt }),
                        }
                    );

                    if (hfRes.ok) {
                        const buffer = Buffer.from(await hfRes.arrayBuffer());
                        
                        const cloudinary = require('cloudinary').v2;
                        cloudinary.config({
                            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
                            api_key: process.env.CLOUDINARY_API_KEY,
                            api_secret: process.env.CLOUDINARY_API_SECRET,
                        });

                        const uploadToCloudinary = () => {
                            return new Promise((resolve, reject) => {
                                const uploadStream = cloudinary.uploader.upload_stream(
                                { folder: "pregnancy_tracker_visuals" },
                                (error, result) => {
                                    if (error) reject(error);
                                    else resolve(result);
                                }
                                );
                                uploadStream.end(buffer);
                            });
                        };
                        const cloudinaryResult = await uploadToCloudinary();
                        finalImageUrl = cloudinaryResult.secure_url;
                        console.log(`[FetusVisual] Saved HF Fallback to Cloudinary: ${finalImageUrl}`);
                    }
                } catch (e) {
                    console.warn(`[FetusVisual] HF Fallback exception:`, e.message);
                }
                
                if (!finalImageUrl) retries++;
            }
        }

      return NextResponse.json({ 
        result: sizeData.text, 
        imageUrl: finalImageUrl || "https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg" // absolute final fail-safe
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (error) {
    console.error("AI Extras Error:", error);
    return NextResponse.json({ error: "Failed to generate insight." }, { status: 500 });
  }
}
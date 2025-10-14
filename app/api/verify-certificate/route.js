// app/api/verify-certificate/route.js
import model from "../../lib/gemini"; // Assuming gemini.js exports a model compatible with vision
import { GoogleGenerativeAI } from "@google/generative-ai";

const geminiProVision = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY).getGenerativeModel({ model: "gemini-pro-vision" });

// Function to convert a remote image URL to a format the Gemini model can read
async function fetchAndEncodeImage(url) {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  return {
    inlineData: {
      data: Buffer.from(buffer).toString("base64"),
      mimeType: response.headers.get("Content-Type") || "image/jpeg",
    },
  };
}

export async function POST(req) {
  try {
    const { certificateUrl, petName, petAge, petBreed } = await req.json();

    if (!certificateUrl) {
      return new Response(JSON.stringify({ error: "Certificate URL is required" }), { status: 400 });
    }

    // Fetch and encode the image from Cloudinary
    const imagePart = await fetchAndEncodeImage(certificateUrl);
    
    // Create the prompt for the AI
    const prompt = `
    Analyze this pet certificate image. 
    1. Does this document look like a valid pet certificate or a fake?
    2. Try to find and extract the pet's name, age, and breed from the document.
    3. Compare the extracted information with the provided details: Pet Name: ${petName}, Age: ${petAge}, Breed: ${petBreed}. State if they match or if there are any discrepancies.
    
    Provide your analysis and extracted information in a clear, structured JSON format.
    `;

    // Send the prompt and image to the Gemini Pro Vision model
    const result = await geminiProVision.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();

    // You can parse the text to use the information, but for a simple verification,
    // a manual review by an admin is more reliable. This AI response serves as a
    // strong recommendation for the admin.
    
    return new Response(JSON.stringify({ aiAnalysis: text }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error with AI verification:", error);
    return new Response(JSON.stringify({ error: "AI verification failed" }), { status: 500 });
  }
}
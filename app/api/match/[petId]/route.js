// app/api/match/[petId]/route.js
import connectDB from "../../../lib/mongodb";
import Pet from "../../../models/PetModel";
import { textModel } from "../../../lib/gemini";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function GET(req, { params }) {
  try {
    await connectDB();

    const { petId } = params;
    if (!petId) {
      return new Response(JSON.stringify({ error: "Pet ID is required" }), { status: 400 });
    }

    // 1. Fetch the user's pet
    const myPet = await Pet.findById(petId).lean();
    if (!myPet) {
      return new Response(JSON.stringify({ error: "User pet not found" }), { status: 404 });
    }

    // 2. Check if pet has completed the AI profile
    if (!myPet.aiProfileString) {
      return new Response(JSON.stringify({ error: "Your pet's AI profile is not complete. Cannot find matches." }), { status: 400 });
    }
    
    // 3. Find all *potential* matches from the database
    const potentialMatches = await Pet.find({
      _id: { $ne: myPet._id }, 
      ownerId: { $ne: myPet.ownerId }, 
      type: myPet.type, // Match same type
      gender: myPet.gender === 'Male' ? 'Female' : 'Male', // Opposite gender
      verificationStatus: 'verified', // Must be verified
      isBanned: false,
      isPregnant: { $ne: true }, 
      listingType: 'Mating',
      aiProfileString: { $ne: null, $exists: true } // MUST have an AI profile
    }).lean();

    if (potentialMatches.length === 0) {
      return new Response(JSON.stringify([]), { status: 200 });
    }

    // 4. Prepare data for the AI analysis
    const profilesToCompare = potentialMatches.map(p => ({
      petId: p._id.toString(),
      profile: p.aiProfileString,
      age: p.age,
      breed: p.breed
    }));
    
    const myPetProfile = {
      profile: myPet.aiProfileString,
      age: myPet.age,
      breed: myPet.breed
    };

    // 5. Send one large request to the AI for ranking
    const prompt = `My pet's profile is:
    ${JSON.stringify(myPetProfile)}
    
    I am looking for a mate. Please analyze this list of potential matches and their profiles:
    ${JSON.stringify(profilesToCompare)}
    
    Return a JSON array of the top 10 most compatible matches, ranked from highest to lowest. For each, provide a 'petId', a 'compatibilityScore' (as a number 0-100), and a brief one-sentence 'reason' explaining why they are a good match based on their personalities, age, or breed.
    
    Respond *only* with a valid JSON array in this exact format:
    [
      {"petId": "...", "compatibilityScore": 95, "reason": "..."},
      {"petId": "...", "compatibilityScore": 88, "reason": "..."}
    ]`;

    const result = await textModel.generateContent(prompt);
    const response = await result.response;
    let text = response.text();
    
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();
    
    const aiRankedMatches = JSON.parse(text);

    // 6. Join AI results with the full Pet data
    const aiResultsMap = new Map(
      aiRankedMatches.map(r => [r.petId, r])
    );

    const finalMatches = potentialMatches
      .filter(p => aiResultsMap.has(p._id.toString())) // Only include pets the AI ranked
      .map(p => {
        const aiData = aiResultsMap.get(p._id.toString());
        return {
          ...p, // The full pet object (name, images, etc.)
          compatibilityScore: aiData.compatibilityScore,
          matchReason: aiData.reason, // Add the new AI reason
        };
      })
      .sort((a, b) => b.compatibilityScore - a.compatibilityScore); // Re-sort to be safe
    
    return new Response(JSON.stringify(finalMatches), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Error in AI matchmaking API:", err);
    return new Response(JSON.stringify({ error: "Failed to get matches: " + err.message }), { status: 500 });
  }
}
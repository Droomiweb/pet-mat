// app/api/match/[petId]/route.js
import connectDB from "../../../lib/mongodb";
import Pet from "../../../models/PetModel";
import { textModel } from "../../../lib/gemini";

export async function GET(req, context) {
  try {
    await connectDB();

    const { petId } = await context.params; // Correctly await params

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
      return new Response(JSON.stringify({ error: "Your pet's AI profile is not complete." }), { status: 400 });
    }
    
    // 3. Find matches
    const potentialMatches = await Pet.find({
      _id: { $ne: myPet._id }, 
      ownerId: { $ne: myPet.ownerId }, 
      type: myPet.type, 
      gender: myPet.gender === 'Male' ? 'Female' : 'Male', 
      verificationStatus: 'verified', 
      isBanned: false,
      isPregnant: { $ne: true }, 
      listingType: 'Mating',
      aiProfileString: { $ne: null, $exists: true }
    }).lean();

    if (potentialMatches.length === 0) {
      return new Response(JSON.stringify([]), { status: 200 });
    }

    // 4. Prepare data for AI
    const profilesToCompare = potentialMatches.map(p => ({
      petId: p._id.toString(),
      profile: p.aiProfileString,
      age: p.age,
      breed: p.breed
    }));
    
    const myPetProfile = {
      profile: myPet.aiProfileString,
      age: myPet.age,
      breed: myPet.breed // <--- FIXED: Changed myReal.breed to myPet.breed
    };

    // 5. Send to AI
    const prompt = `My pet's profile is:
    ${JSON.stringify(myPetProfile)}
    
    Analyze these potential matches:
    ${JSON.stringify(profilesToCompare)}
    
    Return a JSON array of the top 10 matches. Format:
    [{"petId": "...", "compatibilityScore": 95, "reason": "..."}]`;

    const result = await textModel.generateContent(prompt);
    const response = await result.response;
    let text = response.text();
    
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const aiRankedMatches = JSON.parse(text);

    // 6. Merge results
    const aiResultsMap = new Map(aiRankedMatches.map(r => [r.petId, r]));

    const finalMatches = potentialMatches
      .filter(p => aiResultsMap.has(p._id.toString())) 
      .map(p => {
        const aiData = aiResultsMap.get(p._id.toString());
        return { ...p, compatibilityScore: aiData.compatibilityScore, matchReason: aiData.reason };
      })
      .sort((a, b) => b.compatibilityScore - a.compatibilityScore); 
    
    return new Response(JSON.stringify(finalMatches), { status: 200 });

  } catch (err) {
    console.error("Error in AI matchmaking:", err);
    return new Response(JSON.stringify({ error: "Failed to get matches" }), { status: 500 });
  }
}
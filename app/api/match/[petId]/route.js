// app/api/match/[petId]/route.js

// Standard imports
import connectDB from "../../../lib/mongodb";
import Pet from "../../../models/PetModel";
import { textModel } from "../../../lib/gemini"; // Gemini AI instance

// GET request handler
export async function GET(req, context) {
  try {
    await connectDB();

    // Extract pet ID
    const { petId } = await context.params;

    if (!petId) {
      return new Response(JSON.stringify({ error: "Pet ID is required" }), { status: 400 });
    }

    // Fetch seeker profile
    const myPet = await Pet.findById(petId).lean();
    if (!myPet) {
      return new Response(JSON.stringify({ error: "User pet not found" }), { status: 404 });
    }

    // Validate AI profile
    if (!myPet.aiProfileString) {
      return new Response(JSON.stringify({ error: "Your pet's AI profile is not complete. Please complete the AI interview first." }), { status: 400 });
    }
    
    // Format breed regex
    const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const breedRegex = new RegExp(`^${escapeRegex(myPet.breed.trim())}$`, 'i');

    // Find potential matches
    const potentialMatches = await Pet.find({
      _id: { $ne: myPet._id },          // Exclude self
      ownerId: { $ne: myPet.ownerId },  // Exclude same owner
      type: myPet.type,                 // Match species
      breed: { $regex: breedRegex },    // Match breed
      gender: myPet.gender === 'Male' ? 'Female' : 'Male', // Opposite gender
      verificationStatus: 'verified',   // Verified only
      isBanned: false,                  // Not banned
      isPregnant: { $ne: true },        // Not pregnant
      listingType: 'Mating',            // Mating listings
      aiProfileString: { $ne: null, $exists: true } // Has profile
    }).lean();

    // Check match count
    if (potentialMatches.length === 0) {
      return new Response(JSON.stringify([]), { status: 200 });
    }

    // Limit AI candidates
    const candidatesForAi = potentialMatches.slice(0, 6);

    let finalMatches = potentialMatches;

    try {
        // Prepare AI prompt
        const profilesToCompare = candidatesForAi.map(p => ({
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

        const prompt = `My pet's profile is:
        ${JSON.stringify(myPetProfile)}
        
        Analyze these potential matches based on temperament, energy levels, and age compatibility:
        ${JSON.stringify(profilesToCompare)}
        
        Return a JSON array of the top matches. Format:
        [{"petId": "...", "compatibilityScore": 95, "reason": "3-5 word summary"}]
        
        Rules:
        - Score between 0-100.
        - Higher scores for matching energy levels (e.g. High Energy + High Energy).
        - Higher scores for age proximity.
        `;

        // Generate compatibility scores
        const result = await textModel.generateContent(prompt);
        const response = await result.response;
        let text = response.text();
        
        // Parse AI response
        text = text.replace(/```json/g, "").replace(/```/g, "").trim();
        
        let aiRankedMatches = JSON.parse(text);

        // Merge scores/reasons
        const aiResultsMap = new Map(aiRankedMatches.map(r => [r.petId, r]));

        finalMatches = potentialMatches
          .map(p => {
            // Check analysis status
            if (aiResultsMap.has(p._id.toString())) {
                const aiData = aiResultsMap.get(p._id.toString());
                return { 
                    ...p, 
                    compatibilityScore: aiData.compatibilityScore, 
                    matchReason: aiData.reason 
                };
            }
            // Set default data
            return {
                ...p,
                compatibilityScore: 50, // Default score
                matchReason: "Potential Match (Not AI Analyzed)"
            };
          })
          // Sort by score
          .sort((a, b) => b.compatibilityScore - a.compatibilityScore); 

    } catch (aiError) {
        console.warn("⚠️ AI Matchmaking Rate Limit Hit (or Error). Returning DB results.", aiError.message);
        
        // Handle AI failure
        finalMatches = potentialMatches.map(p => ({
            ...p,
            compatibilityScore: 70, // Fallback score
            matchReason: "Breed Match (AI Unavailable)"
        }));
    }
    
    // Return sorted matches
    return new Response(JSON.stringify(finalMatches), { status: 200 });

  } catch (err) {
    console.error("Error in AI matchmaking route:", err);
    return new Response(JSON.stringify({ error: "Failed to get matches" }), { status: 500 });
  }
}
// app/api/match/[petId]/route.js

// 1. IMPORTS
import connectDB from "../../../lib/mongodb";
import Pet from "../../../models/PetModel";
import { textModel } from "../../../lib/gemini"; // Google Gemini AI instance

// 2. GET HANDLER
export async function GET(req, context) {
  try {
    await connectDB();

    // Extract the ID of the "Seeker" pet from the URL
    // Note: In Next.js 15, context.params should be awaited.
    const { petId } = await context.params;

    if (!petId) {
      return new Response(JSON.stringify({ error: "Pet ID is required" }), { status: 400 });
    }

    // 3. FETCH SEEKER PET
    // We need the profile of the pet looking for a match to compare against others.
    const myPet = await Pet.findById(petId).lean();
    if (!myPet) {
      return new Response(JSON.stringify({ error: "User pet not found" }), { status: 404 });
    }

    // Guard Clause: Cannot match if personality profile is missing
    if (!myPet.aiProfileString) {
      return new Response(JSON.stringify({ error: "Your pet's AI profile is not complete. Please complete the AI interview first." }), { status: 400 });
    }
    
    // 4. REGEX BREED MATCHING
    // Create a safe, case-insensitive regex for the breed.
    const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const breedRegex = new RegExp(`^${escapeRegex(myPet.breed.trim())}$`, 'i');

    // 5. STAGE 1: DATABASE FILTERING (Hard Requirements)
    // We fetch ALL technically valid matches from the DB first.
    const potentialMatches = await Pet.find({
      _id: { $ne: myPet._id },          // Exclude self
      ownerId: { $ne: myPet.ownerId },  // Exclude other pets owned by the same user
      type: myPet.type,                 // Must be same species (Dog -> Dog)
      breed: { $regex: breedRegex },    // Must match breed (flexible casing)
      gender: myPet.gender === 'Male' ? 'Female' : 'Male', // Must be opposite gender
      verificationStatus: 'verified',   // Only trusted pets
      isBanned: false,                  // No banned pets
      isPregnant: { $ne: true },        // Exclude currently pregnant females
      listingType: 'Mating',            // Must be listed for Mating (not adoption/sale)
      aiProfileString: { $ne: null, $exists: true } // Target must also have a profile
    }).lean();

    // If DB returns nothing, stop here to save AI API tokens.
    if (potentialMatches.length === 0) {
      return new Response(JSON.stringify([]), { status: 200 });
    }

    // 6. STAGE 2: AI SCORING (Soft Requirements)
    // We strictly limit the data sent to AI to minimize token usage and latency.
    
    // --- OPTIMIZATION: SLICING ---
    // Only send the top 6 candidates to the AI. 
    // Sending 50+ pets at once causes the "Token Limit Exceeded" (429) error.
    const candidatesForAi = potentialMatches.slice(0, 6);

    let finalMatches = potentialMatches;

    try {
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

        // Prompt Engineering: We ask for a JSON array return format for easy parsing.
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

        const result = await textModel.generateContent(prompt);
        const response = await result.response;
        let text = response.text();
        
        // Clean potential Markdown wrapping
        text = text.replace(/```json/g, "").replace(/```/g, "").trim();
        
        let aiRankedMatches = JSON.parse(text);

        // 7. DATA MERGING
        // Convert array to Map for O(1) lookup speed
        const aiResultsMap = new Map(aiRankedMatches.map(r => [r.petId, r]));

        // Reconstruct the final array: DB Data + AI Score + AI Reason
        finalMatches = potentialMatches
          .map(p => {
            // Check if this pet was analyzed by AI
            if (aiResultsMap.has(p._id.toString())) {
                const aiData = aiResultsMap.get(p._id.toString());
                return { 
                    ...p, 
                    compatibilityScore: aiData.compatibilityScore, 
                    matchReason: aiData.reason 
                };
            }
            // If not analyzed (because of slicing), return default/neutral data
            return {
                ...p,
                compatibilityScore: 50, // Default neutral score
                matchReason: "Potential Match (Not AI Analyzed)"
            };
          })
          // Sort by the new AI compatibility score (Highest first)
          .sort((a, b) => b.compatibilityScore - a.compatibilityScore); 

    } catch (aiError) {
        console.warn("⚠️ AI Matchmaking Rate Limit Hit (or Error). Returning DB results.", aiError.message);
        
        // Fallback: If AI fails, return the list with default scores
        finalMatches = potentialMatches.map(p => ({
            ...p,
            compatibilityScore: 70, // Default "Good" score so UI looks okay
            matchReason: "Breed Match (AI Unavailable)"
        }));
    }
    
    return new Response(JSON.stringify(finalMatches), { status: 200 });

  } catch (err) {
    console.error("Error in AI matchmaking route:", err);
    return new Response(JSON.stringify({ error: "Failed to get matches" }), { status: 500 });
  }
}
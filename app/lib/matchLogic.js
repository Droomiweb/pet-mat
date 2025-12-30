import Pet from "../models/PetModel";
import { textModel } from "./gemini";

export async function findMatches(petId) {
    try {
        // Fetch seeker profile
        const myPet = await Pet.findById(petId).lean();
        if (!myPet) {
            throw new Error("User pet not found");
        }

        // Validate AI profile
        // Note: We might want to relax this for "Breeding" listing type if strictly breed-based, 
        // but for now we keep the existing logic that requires an AI profile for match *analysis*.
        // If the user just wants to see potential matches without AI scores, we could allow it,
        // but the current requirement implies "matches" are what triggers the ability to request.

        // Format breed regex
        const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const breedRegex = new RegExp(`^${escapeRegex(myPet.breed.trim())}$`, 'i');

        // Find potential matches from DB
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
            // Relaxing the strict AI profile requirement for the *DB query* to ensure we catch all eligible pets 
            // even if they haven't done the interview yet, though they might get low scores.
            // keeping existing logic mainly to minimize breakage, but 'aiProfileString' check was in original route.
            aiProfileString: { $ne: null, $exists: true }
        }).lean();

        if (potentialMatches.length === 0) {
            return [];
        }

        let finalMatches = potentialMatches;

        // If myPet doesn't have an AI profile, skips AI analysis
        if (!myPet.aiProfileString) {
            return finalMatches.map(p => ({
                ...p,
                compatibilityScore: 50,
                matchReason: "Potential Match (No AI Analysis)"
            }));
        }

        // Limit AI candidates for cost/performance
        const candidatesForAi = potentialMatches.slice(0, 6);

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

            let aiRankedMatches = [];
            try {
                aiRankedMatches = JSON.parse(text);
            } catch (e) {
                console.error("Failed to parse AI JSON", text);
            }

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
                    // Set default data for those not analyzed by AI in this batch
                    return {
                        ...p,
                        compatibilityScore: 50, // Default score
                        matchReason: "Potential Match (Not AI Analyzed)"
                    };
                })
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

        return finalMatches;

    } catch (err) {
        console.error("Error in logic findMatches:", err);
        throw err;
    }
}

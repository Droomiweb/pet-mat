import Pet from "../models/PetModel";
import { textModel } from "./gemini";

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export async function findMatches(petId) {
    try {
        // Fetch seeker profile
        const myPet = await Pet.findById(petId).lean();
        if (!myPet) {
            throw new Error("User pet not found");
        }

        // --- CACHE CHECK ---
        const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 Hours
        const now = new Date();

        if (
            false && // FORCE BYPASS CACHE FOR DEBUGGING
            myPet.cachedMatches &&
            myPet.cachedMatches.lastUpdated &&
            (now - new Date(myPet.cachedMatches.lastUpdated) < CACHE_DURATION) &&
            myPet.cachedMatches.data &&
            myPet.cachedMatches.data.length > 0
        ) {
            // console.log("Using cached matches for", petId);
            const cachedData = myPet.cachedMatches.data;
            const petIds = cachedData.map(m => m.petId);

            // Re-fetch the pet details to ensure up-to-date info (name/image)
            const cachedPets = await Pet.find({ _id: { $in: petIds } }).lean();

            // Map scores back to the fetched pets
            const results = cachedPets.map(p => {
                const matchData = cachedData.find(m => m.petId === p._id.toString());
                return {
                    ...p,
                    compatibilityScore: matchData ? matchData.compatibilityScore : 50,
                    matchReason: matchData ? matchData.matchReason : "Cached Match"
                };
            }).sort((a, b) => b.compatibilityScore - a.compatibilityScore);

            return results;
        }

        // Validate AI profile
        // Note: We might want to relax this for "Breeding" listing type if strictly breed-based, 
        // but for now we keep the existing logic that requires an AI profile for match *analysis*.
        // If the user just wants to see potential matches without AI scores, we could allow it,
        // but the current requirement implies "matches" are what triggers the ability to request.

        // DEBUG: Check what pets exist at all (including unverified)
        const allPets = await Pet.find({}).lean();
        console.log("DEBUG DEEP DB DUMP:", JSON.stringify(allPets));

        // Format breed regex - Relaxed for partial matches and comma-separated breeds
        const breedParts = myPet.breed.split(',').map(b => b.trim());
        const breedConditions = breedParts.map(part => ({
            breed: { $regex: new RegExp(escapeRegex(part), 'i') }
        }));

        // Find potential matches from DB
        const potentialMatches = await Pet.find({
            _id: { $ne: myPet._id },          // Exclude self
            $or: breedConditions,            // Match any part of the breed string
            gender: myPet.gender === 'Male' ? 'Female' : 'Male', // Opposite gender
            verificationStatus: { $in: ['verified', 'fallback-verified'] },   // Verified only
            isBanned: { $ne: true },          // Not banned
            isPregnant: { $ne: true },        // Strictly exclude pregnant pets
            listingType: { $in: ['Mating', null, undefined] }, 
        }).lean();

        console.log(`[MatchLogic] Pet ${myPet.name} (${myPet.gender} ${myPet.breed}) found ${potentialMatches.length} candidates. (Filtered out pregnant/banned)`);
        if (potentialMatches.length > 0) {
            console.log(`[MatchLogic] Candidates: ${potentialMatches.map(p => `${p.name} (${p.gender})`).join(', ')}`);
        }
        if (potentialMatches.length === 0) {
            return [];
        }

        let finalMatches = potentialMatches;

        // If myPet doesn't have an AI profile, skips AI analysis
        if (!myPet.aiProfileString) {
            finalMatches = finalMatches.map(p => ({
                ...p,
                compatibilityScore: 50,
                matchReason: "Potential Match (No AI Analysis)"
            }));

            // We still want to cache potential matches even if no AI involved, to save DB queries
        } else {
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
                // Remove code blocks
                text = text.replace(/```json/g, "").replace(/```/g, "").trim();

                // Extract JSON if embedded in text (find first [ and last ])
                const start = text.indexOf('[');
                const end = text.lastIndexOf(']');
                if (start !== -1 && end !== -1) {
                    text = text.substring(start, end + 1);
                }

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
        }

        // --- UPDATE CACHE ---
        const cacheData = finalMatches.map(p => ({
            petId: p._id.toString(),
            compatibilityScore: p.compatibilityScore,
            matchReason: p.matchReason
        }));

        await Pet.updateOne(
            { _id: petId },
            {
                $set: {
                    cachedMatches: {
                        data: cacheData,
                        lastUpdated: new Date()
                    }
                }
            },
            { strict: false }
        );

        return finalMatches;

    } catch (err) {
        console.error("Error in logic findMatches:", err);
        throw err;
    }
}

/**
 * TRIGGER: Called when a NEW pet is registered.
 * Finds all *other* pets that might be looking for this new pet,
 * runs a quick check, and inserts this new pet into their cache
 * if they match.
 */
export async function integrateNewPetIntoMatches(newPet) {
    try {
        if (!newPet || !newPet.listingType === 'Mating') return;

        // 1. Find candidates (Reverse of findMatches)
        // We look for pets that WOULD include this newPet in their search
        const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const breedRegex = new RegExp(`^${escapeRegex(newPet.breed.trim())}$`, 'i');
        
        const candidates = await Pet.find({
            _id: { $ne: newPet._id },
            ownerId: { $ne: newPet.ownerId },
            type: newPet.type,
            breed: { $regex: breedRegex },
            gender: newPet.gender === 'Male' ? 'Female' : 'Male',
            listingType: 'Mating',
            // Note: We process even if they have old cache, because we want to INJECT this new one
        }).lean();

        if (candidates.length === 0) return;

        // 2. Prepare Match Data (Simplified to avoid N x 1 AI calls if possible, or batch)
        // For high quality, we should do AI. For scaling, maybe basic heuristic first.
        // Let's do batch AI if candidates < 10, else just basic injection.

        const candidatesWithAi = candidates.filter(c => c.aiProfileString);
        
        // We'll process in small batches to not kill the API
        const processingCandidates = candidatesWithAi.slice(0, 5); // Limit immediate updates to 5 most relevant? Or just 5.
        // Actually, let's just do a heuristic compatibility for now or a very simple prompt to save tokens.
        
        // We will perform a "One-to-Many" comparison: NewPet vs Candidates
        const prompt = `
        New Pet: ${JSON.stringify({ 
            age: newPet.age, 
            breed: newPet.breed, 
            profile: newPet.aiProfileString || "Friendly pet" 
        })}

        Candidates: ${JSON.stringify(processingCandidates.map(c => ({
            id: c._id.toString(),
            age: c.age,
            profile: c.aiProfileString
        })))}

        Task: Select candidates that are a GOOD match (score > 60) for the New Pet.
        Return JSON: [{"id": "...", "score": 85, "reason": "..."}]
        `;

        let matchResults = [];
        try {
             if (processingCandidates.length > 0 && newPet.aiProfileString) {
                const result = await textModel.generateContent(prompt);
                const response = await result.response;
                let text = response.text().replace(/```json/g, "").replace(/```/g, "").trim();
                const start = text.indexOf('[');
                const end = text.lastIndexOf(']');
                if (start !== -1 && end !== -1) text = text.substring(start, end + 1);
                matchResults = JSON.parse(text);
             }
        } catch (e) {
            console.warn("Incremental Match AI failed, falling back to default score", e);
        }

        const matchMap = new Map(matchResults.map(m => [m.id, m]));

        // 3. Update Caches
        const updates = candidates.map(async (candidate) => {
             // Determine score
             let score = 50;
             let reason = "New Arrival!";

             if (matchMap.has(candidate._id.toString())) {
                 const m = matchMap.get(candidate._id.toString());
                 score = m.score;
                 reason = m.reason;
             } else if (!newPet.aiProfileString) {
                 score = 60; // Default for non-AI pets
                 reason = "New Breed Match";
             }

             // Only update if score is decent
             if (score >= 50) {
                 // Push to cachedMatches.data, Sort, Slice (keep top 20), Update lastUpdated
                 
                 // Get existing cache
                 let currentCache = candidate.cachedMatches?.data || [];
                 
                 // Remove if already exists (rare, but prevents dupes)
                 currentCache = currentCache.filter(m => m.petId !== newPet._id.toString());
                 
                 // Add new
                 currentCache.push({
                     petId: newPet._id.toString(),
                     compatibilityScore: score,
                     matchReason: reason
                 });

                 // Sort
                 currentCache.sort((a,b) => b.compatibilityScore - a.compatibilityScore);
                 
                 // Trim
                 if (currentCache.length > 20) currentCache = currentCache.slice(0, 20);

                 // DB Update
                 await Pet.updateOne(
                     { _id: candidate._id },
                     { 
                         $set: { 
                             "cachedMatches.data": currentCache,
                             "cachedMatches.lastUpdated": new Date() // Force "fresh" status
                         } 
                     }
                 );
             }
        });

        await Promise.all(updates);

    } catch (err) {
        console.error("Error in integrateNewPetIntoMatches:", err);
        // Don't throw, as this is a background process
    }
}

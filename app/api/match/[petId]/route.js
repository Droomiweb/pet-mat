// app/api/match/[petId]/route.js
import connectDB from "../../../lib/mongodb";
import Pet from "../../../models/PetModel";

// --- Compatibility Scoring Logic (Unchanged) ---
// 1. Temperament Compatibility Score
const getTemperamentScore = (temp1, temp2) => {
  const compatiblePairs = {
    'Friendly': ['Playful', 'Energetic', 'Curious', 'Friendly'],
    'Playful': ['Friendly', 'Energetic', 'Curious'],
    'Calm': ['Shy', 'Independent', 'Calm'],
    'Shy': ['Calm', 'Independent'],
    'Energetic': ['Playful', 'Friendly', 'Curious'],
    'Independent': ['Calm', 'Shy', 'Independent'],
    'Curious': ['Playful', 'Energetic', 'Friendly'],
    'Other': [],
  };
  if (compatiblePairs[temp1]?.includes(temp2)) return 50;
  if (compatiblePairs[temp2]?.includes(temp1)) return 25;
  if (temp1 === temp2) return 40;
  return 0;
};
// 2. Energy Level Compatibility Score
const getEnergyScore = (energy1, energy2) => {
  if (energy1 === energy2) return 30;
  if (
    (energy1 === 'Medium' && (energy2 === 'Low' || energy2 === 'High')) ||
    (energy2 === 'Medium' && (energy1 === 'Low' || energy1 === 'High'))
  ) return 15;
  return 0;
};
// 3. Age Compatibility Score
const getAgeScore = (age1, age2) => {
  const ageDiff = Math.abs(age1 - age2);
  if (ageDiff <= 1) return 20;
  if (ageDiff <= 3) return 10;
  return 0;
};
// --- End of Scoring Logic ---


export async function GET(req, { params }) { // <--- FIX 1: Changed signature
  try {
    await connectDB();

    const { petId } = params; // <--- FIX 2: Changed access
    if (!petId) {
      return new Response(JSON.stringify({ error: "Pet ID is required" }), { status: 400 });
    }

    const myPet = await Pet.findById(petId).lean();
    if (!myPet) {
      return new Response(JSON.stringify({ error: "User pet not found" }), { status: 404 });
    }
    
    // --- UPDATED: Match Query ---
    const matchQuery = {
      _id: { $ne: myPet._id }, 
      ownerId: { $ne: myPet.ownerId }, 
      type: myPet.type, 
      gender: myPet.gender === 'Male' ? 'Female' : 'Male',
      verificationStatus: 'verified', // Must be verified
      isBanned: false,
      isPregnant: { $ne: true }, // --- ADDED: Must not be pregnant
      listingType: 'Mating', // --- ADDED: Must be listed for Mating
    };
    // --- END UPDATED QUERY ---

    const potentialMatches = await Pet.find(matchQuery).lean();

    const scoredMatches = potentialMatches.map(match => {
      let compatibilityScore = 0;
      compatibilityScore += getTemperamentScore(myPet.temperament, match.temperament);
      compatibilityScore += getEnergyScore(myPet.energyLevel, match.energyLevel);
      compatibilityScore += getAgeScore(myPet.age, match.age);
      if (myPet.breed === match.breed) {
        compatibilityScore += 10;
      }
      return {
        ...match,
        compatibilityScore: compatibilityScore,
      };
    });

    const sortedMatches = scoredMatches.sort((a, b) => b.compatibilityScore - a.compatibilityScore);
    
    return new Response(JSON.stringify(sortedMatches.slice(0, 10)), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Error in matchmaking API:", err);
    return new Response(JSON.stringify({ error: "Failed to get matches" }), { status: 500 });
  }
}
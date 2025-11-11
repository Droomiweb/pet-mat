// app/api/match/[petId]/route.js
import connectDB from "../../../lib/mongodb";
import Pet from "../../../models/PetModel";

// --- Compatibility Scoring Logic ---
// This is the "AI Engine" from your PDF 

// 1. Temperament Compatibility Score [cite: 76]
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
  // High score for very compatible, medium for one-way compatible, low for non-compatible
  if (compatiblePairs[temp1]?.includes(temp2)) return 50;
  if (compatiblePairs[temp2]?.includes(temp1)) return 25;
  if (temp1 === temp2) return 40;
  return 0;
};

// 2. Energy Level Compatibility Score
const getEnergyScore = (energy1, energy2) => {
  if (energy1 === energy2) return 30; // High score for same energy
  if (
    (energy1 === 'Medium' && (energy2 === 'Low' || energy2 === 'High')) ||
    (energy2 === 'Medium' && (energy1 === 'Low' || energy1 === 'High'))
  ) return 15; // Medium score for adjacent energy
  return 0; // Low score for opposite energy
};

// 3. Age Compatibility Score [cite: 76]
const getAgeScore = (age1, age2) => {
  const ageDiff = Math.abs(age1 - age2);
  if (ageDiff <= 1) return 20; // Max score for <= 1 year difference
  if (ageDiff <= 3) return 10; // Medium score for <= 3 years
  return 0; // Low score
};
// --- End of Scoring Logic ---


export async function GET(req, context) {
  try {
    await connectDB();

    const { petId } = context.params;
    if (!petId) {
      return new Response(JSON.stringify({ error: "Pet ID is required" }), { status: 400 });
    }

    // 1. Get the user's pet (the one we are matching for)
    const myPet = await Pet.findById(petId).lean();
    if (!myPet) {
      return new Response(JSON.stringify({ error: "User pet not found" }), { status: 404 });
    }

    // 2. Define the ideal match (opposite gender, same type, not owned by user)
    const matchQuery = {
      _id: { $ne: myPet._id }, // Not the same pet
      ownerId: { $ne: myPet.ownerId }, // Not owned by the same user
      type: myPet.type, // Must be same type
      gender: myPet.gender === 'Male' ? 'Female' : 'Male', // Must be opposite gender
      verificationStatus: 'verified', // Must be a verified pet
      isBanned: false, // Must not be banned
    };

    // 3. Find all potential matches
    const potentialMatches = await Pet.find(matchQuery).lean();

    // 4. Calculate compatibility scores for each match [cite: 77]
    const scoredMatches = potentialMatches.map(match => {
      let compatibilityScore = 0;

      // Add scores based on different criteria
      compatibilityScore += getTemperamentScore(myPet.temperament, match.temperament);
      compatibilityScore += getEnergyScore(myPet.energyLevel, match.energyLevel);
      compatibilityScore += getAgeScore(myPet.age, match.age);
      
      // Bonus points for same breed
      if (myPet.breed === match.breed) {
        compatibilityScore += 10;
      }

      return {
        ...match,
        compatibilityScore: compatibilityScore,
      };
    });

    // 5. Sort matches by the highest score
    const sortedMatches = scoredMatches.sort((a, b) => b.compatibilityScore - a.compatibilityScore);
    
    // 6. Return the top matches (e.g., top 10)
    return new Response(JSON.stringify(sortedMatches.slice(0, 10)), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Error in matchmaking API:", err);
    return new Response(JSON.stringify({ error: "Failed to get matches" }), { status: 500 });
  }
}
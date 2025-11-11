// app/AiPredict/page.js
"use client";
import { useState, useEffect } from "react";
import { auth } from "../lib/firebase";
import { useRouter } from "next/navigation";

export default function AiPredictor() {
  const [myPets, setMyPets] = useState([]);
  const [partnerPets, setPartnerPets] = useState([]);
  const [selectedPetA, setSelectedPetA] = useState(null);
  const [selectedPetB, setSelectedPetB] = useState(null);
  const [prediction, setPrediction] = useState("");
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const router = useRouter();
  const user = auth.currentUser;

  // Fetch all pets (user's pets and potential partners)
  const fetchAllPets = async () => {
    if (!user) return router.push("/Login");

    try {
      // Fetch user's pets
      const myPetsRes = await fetch(`/api/pet/user/${user.uid}`);
      const myPetsData = await myPetsRes.json();
      setMyPets(myPetsData);

      // Fetch all other pets (excluding user's)
      const partnerPetsRes = await fetch(`/api/pet?excludeOwnerId=${user.uid}`);
      const partnerPetsData = await partnerPetsRes.json();
      setPartnerPets(partnerPetsData);

    } catch (err) {
      console.error("Error fetching pets:", err);
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => {
    fetchAllPets();
  }, [user]);

  // Handle the prediction generation
  const handlePrediction = async () => {
    if (!selectedPetA || !selectedPetB) {
      alert("Please select two pets to predict.");
      return;
    }

    setLoading(true);
    setPrediction("");
    try {
      const res = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          petAId: selectedPetA._id,
          petBId: selectedPetB._id,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setPrediction(data.prediction);
      } else {
        alert("Prediction failed: " + data.error);
      }
    } catch (err) {
      console.error("Error calling prediction API:", err);
      alert("An error occurred. Check the console.");
    } finally {
      setLoading(false);
    }
  };

  // Helper component for Pet Selection Card
  const PetSelector = ({ pet, onSelect, isSelected, title }) => (
    <div className="w-full">
      <h3 className="text-xl font-bold text-[#333333] mb-2">{title}</h3>
      <select
        onChange={(e) => onSelect(e.target.value)}
        className="w-full p-3 bg-white border-2 border-gray-300 rounded-lg focus:border-[#4A90E2] transition-colors"
      >
        <option value="">-- Select {title.toLowerCase()} --</option>
        {pet.map(p => (
          <option key={p._id} value={p._id}>{p.name} ({p.breed})</option>
        ))}
      </select>
      {isSelected && (
        <div className="mt-4 p-4 bg-white/60 rounded-lg shadow-inner border">
          <img src={isSelected.imageUrls[0]} alt={isSelected.name} className="w-full h-48 object-cover rounded-lg mb-2" />
          <h4 className="text-lg font-bold">{isSelected.name}</h4>
          <p className="text-sm"><b>Breed:</b> {isSelected.breed}</p>
          <p className="text-sm"><b>Gender:</b> {isSelected.gender}</p>
          <p className="text-sm"><b>Temperament:</b> {isSelected.temperament}</p>
          <p className="text-sm"><b>Energy:</b> {isSelected.energyLevel}</p>
        </div>
      )}
    </div>
  );

  if (pageLoading) {
    return <p className="text-[#333333] text-center mt-20 text-xl">Loading AI Predictor...</p>;
  }
  
  return (
    <div className="min-h-screen bg-[#F4F7F9] p-4 md:p-10">
      <div className="max-w-5xl mx-auto glass-container shadow-2xl border-t-8 border-[#4A90E2]">
        <h1 className="text-4xl font-extrabold text-[#333333] mb-8 text-center border-b pb-4 border-gray-100">
          AI Pet Offspring Prediction
        </h1>
        
        {myPets.length === 0 ? (
           <p className="text-center text-lg text-primary">You must <a href="/Addpet" className="text-[#4A90E2] underline font-bold">add a pet</a> before you can use the predictor.</p>
        ) : (
          <>
            <div className="grid md:grid-cols-2 gap-8 items-start">
              {/* Pet A Selector (User's Pets) */}
              <PetSelector
                pet={myPets}
                onSelect={(id) => setSelectedPetA(myPets.find(p => p._id === id))}
                isSelected={selectedPetA}
                title="Parent A (Your Pet)"
              />

              {/* Pet B Selector (Partner Pets) */}
              <PetSelector
                pet={partnerPets}
                onSelect={(id) => setSelectedPetB(partnerPets.find(p => p._id === id))}
                isSelected={selectedPetB}
                title="Parent B (Potential Partner)"
              />
            </div>

            <div className="text-center mt-10">
              <button
                onClick={handlePrediction}
                disabled={loading || !selectedPetA || !selectedPetB}
                className="btn-primary py-4 px-10 text-lg"
              >
                {loading ? "Generating Prediction..." : "Predict Offspring Traits"}
              </button>
            </div>

            {/* Prediction Result */}
            {prediction && (
              <div className="mt-10 p-6 bg-white rounded-xl shadow-lg border border-gray-200">
                <h2 className="text-2xl font-bold text-[#4A90E2] mb-4">AI Prediction Result</h2>
                {/* Format the prediction text nicely */}
                <div className="text-primary space-y-2 whitespace-pre-wrap font-sans">
                  {prediction}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
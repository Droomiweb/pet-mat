// app/Home/page.js
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "./../lib/firebase";

export default function Main() {
  // --- State Variables ---
  const [pets, setPets] = useState([]); // General feed pets
  const [suggestionsMap, setSuggestionsMap] = useState({}); // Matches for user's pets
  const [userPets, setUserPets] = useState([]); // User's own pets
  const [filters, setFilters] = useState({ type: "", breed: "", radius: "50" }); 
  
  const [loading, setLoading] = useState(true);
  const [suggestionsLoading, setSuggestionsLoading] = useState(true);
  const router = useRouter();
  
  // --- Constants ---
  const breedOptions = {
      Dog: ["Labrador Retriever", "German Shepherd", "Golden Retriever", "Bulldog", "Poodle", "Beagle", "Other"],
      Cat: ["Persian", "Maine Coon", "Siamese", "Bengal", "Ragdoll", "British Shorthair", "Other"],
      Rabbit: ["Holland Lop", "Netherland Dwarf", "Lionhead", "Flemish Giant", "Mini Rex", "Other"],
      Bird: ["Parrot", "Cockatiel", "Canary", "Lovebird", "Finch", "Macaw", "Other"],
      Other: ["Mixed", "Unknown"],
  };

  // --- Fetch Functions ---

  // 1. Fetch Feed Pets (General Listings)
  const fetchPets = async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      const excludeOwnerId = user ? user.uid : "";
      
      const queryParams = {
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v)),
        excludeOwnerId: excludeOwnerId,
        listingType: "Mating" 
      };
      
      const query = new URLSearchParams(queryParams).toString();

      const res = await fetch(`/api/pet?${query}`);
      if (res.ok) {
        const data = await res.json();
        setPets(data);
      }
    } catch (err) {
      console.error("Error fetching pets:", err);
    } finally {
      setLoading(false);
    }
  };
  
  // 2. Fetch User's Pets & Handle Pregnancy Redirect
  const fetchUserPets = async () => {
      const user = auth.currentUser;
      if (!user) {
        setSuggestionsLoading(false);
        return;
      }
      try {
          const res = await fetch(`/api/pet/user/${user.uid}`);
          if (res.ok) {
              let data = await res.json();
              
              // --- NEW: PREGNANCY REDIRECT LOGIC ---
              // If ANY of the user's pets are pregnant, redirect to the tracker immediately.
              // This hides the mating interface as requested.
              const pregnantPet = data.find(p => p.isPregnant);
              if (pregnantPet) {
                  router.push(`/pregnancy-tracker/${pregnantPet._id}`);
                  return; 
              }
              // -------------------------------------

              const matingPets = data.filter(p => p.listingType === 'Mating');
              setUserPets(matingPets);
              
              // If user has pets listed for mating, fetch suggestions for EACH
              if (matingPets.length > 0) {
                matingPets.forEach(pet => {
                    fetchSuggestionsForPet(pet._id);
                });
              } else {
                setSuggestionsLoading(false);
              }
          }
      } catch (err) {
          console.error("Error fetching user pets:", err);
          setSuggestionsLoading(false);
      }
  }

  // 3. Helper to fetch suggestions for a single pet
  const fetchSuggestionsForPet = async (petId) => {
    try {
      const res = await fetch(`/api/match/${petId}`);
      if (res.ok) {
        const data = await res.json();
        // Update the map with results for this specific pet
        setSuggestionsMap(prev => ({
            ...prev,
            [petId]: data
        }));
      }
    } catch (err) {
      console.error(`Error fetching suggestions for ${petId}:`, err);
    } finally {
      setSuggestionsLoading(false);
    }
  };

  // --- Effects ---

  useEffect(() => {
    fetchUserPets();
    fetchPets();
  }, []); 

  useEffect(() => {
    fetchPets();
  }, [filters]);


  // --- Handlers ---

  const handlePetClick = (petId) => {
    const user = auth.currentUser;
    if (!user) return router.push("/Login");
    router.push(`/pet/${petId}`);
  };

  return (
    <div className="min-h-screen bg-[#F4F7F9] p-4 md:p-10">
      <h1 className="text-4xl font-extrabold text-[#333333] mb-12 text-center border-b-4 border-[#4A90E2] pb-4">
        Discover Your Pet's Mate
      </h1>

      {/* --- SECTION 1: AI MATCHING SUGGESTIONS --- */}
      {suggestionsLoading ? (
        <p className="text-center text-[#333333] text-lg mb-8">Loading compatible matches...</p>
      ) : userPets.length > 0 ? (
          <div className="mb-12 space-y-12">
            {userPets.map((myPet) => {
                const matches = suggestionsMap[myPet._id] || [];
                
                // Skip if no matches found for this specific pet
                if (matches.length === 0) return null;

                return (
                    <div key={myPet._id} className="bg-white/50 p-6 rounded-3xl border border-white shadow-sm">
                        <h2 className="text-3xl font-bold text-[#4A90E2] mb-6 border-l-4 border-[#50E3C2] pl-3">
                          Top Matches for <span className="text-[#333333]">{myPet.name}</span>
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                          {matches.map((pet) => (
                            <div
                              key={pet._id}
                              onClick={() => handlePetClick(pet._id)}
                              className="cursor-pointer bg-white rounded-xl shadow-lg p-3 hover:scale-105 hover:shadow-2xl transition-transform duration-300 border-2 border-[#50E3C2] relative"
                            >
                              <div className="absolute top-2 right-2 bg-[#FF9A00] text-white text-xs font-bold px-2 py-1 rounded-full shadow-md">
                                {pet.compatibilityScore}% Match
                              </div>
                              
                              {pet.imageUrls?.[0] && (
                                <img
                                  src={pet.imageUrls[0]}
                                  alt={pet.name}
                                  className="w-full h-32 object-cover rounded-lg mb-3"
                                />
                              )}
                              <h3 className="font-bold text-lg text-[#333333] mb-1">{pet.name} ({pet.gender.charAt(0)})</h3>
                              <p className="text-[#333333] text-sm truncate">Breed: {pet.breed}</p>
                              <p className="text-[#333333] text-sm capitalize">Age: {pet.age}</p>
                            </div>
                          ))}
                        </div>
                    </div>
                );
            })}
            
            {/* Fallback if user has pets but 0 total matches */}
            {Object.values(suggestionsMap).every(arr => arr.length === 0) && (
                 <p className="text-center text-gray-500 text-lg mb-8">No AI matches found yet. Try adjusting your pet's profile!</p>
            )}
          </div>
      ) : (
        <p className="text-center text-gray-500 text-lg mb-8">Add a pet (for mating) to start seeing compatible matches!</p>
      )}

      <h2 className="text-3xl font-bold text-[#333333] mb-6 border-l-4 border-[#4A90E2] pl-3 mt-12">
              Pet Matrimony Listings
      </h2>
      
      {/* --- SECTION 2: FILTERS --- */}
      <div className="flex flex-wrap justify-center gap-4 mb-10 p-5 rounded-xl bg-white shadow-inner items-center">
        <select
          className="p-3 rounded-lg border-2 border-gray-300 bg-white focus:border-[#4A90E2] transition-colors cursor-pointer"
          value={filters.type}
          onChange={(e) => setFilters({ ...filters, type: e.target.value, breed: "" })}
        >
          <option value="">All Types</option>
          <option value="Dog">Dog</option>
          <option value="Cat">Cat</option>
          <option value="Rabbit">Rabbit</option>
          <option value="Bird">Bird</option>
          <option value="Other">Other</option>
        </select>

        <select
          className="p-3 rounded-lg border-2 border-gray-300 bg-white focus:border-[#4A90E2] transition-colors cursor-pointer"
          value={filters.breed}
          onChange={(e) => setFilters({ ...filters, breed: e.target.value })}
          disabled={!filters.type}
        >
          <option value="">All Breeds</option>
          {filters.type && breedOptions[filters.type].map((breed) => (
              <option key={breed} value={breed}>{breed}</option>
          ))}
        </select>

        <div className="flex items-center gap-2 p-3 rounded-lg border-2 border-gray-300 bg-white">
            <label htmlFor="radius" className="font-medium text-gray-700">Radius:</label>
            <input
                type="range"
                id="radius"
                min="5"
                max="250"
                step="5"
                value={filters.radius}
                onChange={(e) => setFilters({ ...filters, radius: e.target.value })}
                className="w-32 cursor-pointer"
            />
            <span className="font-bold text-[#4A90E2] w-12 text-right">
                {filters.radius} km
            </span>
        </div>
      </div>

      {/* --- SECTION 3: GENERAL LISTINGS GRID --- */}
      {loading ? (
        <p className="text-center text-[#333333] text-xl py-10">Loading wonderful pets...</p>
      ) : pets.length === 0 ? (
        <p className="text-[#333333] text-center text-xl py-10">
          No pets found for mating based on your search criteria.
        </p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6"> 
          {pets.map((pet) => (
            <div
              key={pet._id}
              onClick={() => handlePetClick(pet._id)}
              className="cursor-pointer bg-white rounded-xl shadow-lg p-4 hover:scale-[1.03] hover:shadow-2xl transition-transform duration-300 border-b-4 border-[#4A90E2] hover:border-[#50E3C2] relative"
            >
              {pet.distance !== undefined && (
                  <span className="absolute top-2 left-2 text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                    {pet.distance.toFixed(1)} km away
                  </span>
              )}

              {pet.imageUrls?.[0] && (
                <img
                  src={pet.imageUrls[0]}
                  alt={pet.name}
                  className="w-full h-40 object-cover rounded-lg mb-3 border border-gray-200 mt-6"
                />
              )}
              <h3 className="font-bold text-xl text-[#333333] mb-1 flex justify-between items-center">
                {pet.name}
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${pet.gender === 'Male' ? 'bg-blue-200 text-blue-800' : 'bg-pink-200 text-pink-800'}`}>
                  {pet.gender}
                </span>
              </h3>
              <p className="text-[#333333] text-sm">Type: {pet.type}</p>
              <p className="text-[#333333] text-sm">Breed: {pet.breed}</p>
              <p className="text-[#333333] text-sm">Age: {pet.age}</p>
              {pet.location?.city && (
                <p className="text-[#333333] text-sm mt-1">📍 {pet.location.city}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
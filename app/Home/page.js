// app/Home/page.js
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "./../lib/firebase";
import Image from "next/image"; // Optimization

export default function Main() {
  // --- State Variables ---
  const [pets, setPets] = useState([]); 
  const [suggestionsMap, setSuggestionsMap] = useState({}); 
  const [userPets, setUserPets] = useState([]); 
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
              
              const pregnantPets = data.filter(p => p.isPregnant);
              
              // Smart Redirect: If ONLY 1 pet and it's pregnant -> Go to tracker
              if (data.length === 1 && pregnantPets.length === 1) {
                  router.push(`/pregnancy-tracker/${pregnantPets[0]._id}`);
                  return; 
              }

              const matingPets = data.filter(p => p.listingType === 'Mating' && !p.isPregnant);
              setUserPets(matingPets);
              
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

  const fetchSuggestionsForPet = async (petId) => {
    try {
      const res = await fetch(`/api/match/${petId}`);
      if (res.ok) {
        const data = await res.json();
        setSuggestionsMap(prev => ({ ...prev, [petId]: data }));
      }
    } catch (err) {
      console.error(`Error fetching suggestions for ${petId}:`, err);
    } finally {
      setSuggestionsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserPets();
    fetchPets();
  }, []); 

  useEffect(() => {
    fetchPets();
  }, [filters]);

  const handlePetClick = (petId) => {
    const user = auth.currentUser;
    if (!user) return router.push("/Login");
    router.push(`/pet/${petId}`);
  };

  return (
    <div className="min-h-screen bg-[#E2F4EF] relative overflow-x-hidden">
      
      {/* Decorative Background Elements */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-purple-200/30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-10%] left-[-5%] w-96 h-96 bg-blue-200/30 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 pt-28 pb-20">
        
        {/* --- HERO HEADER --- */}
        <div className="text-center mb-16 animate-in fade-in slide-in-from-top duration-700">
            <span className="inline-block py-1 px-3 rounded-full bg-white/60 border border-white shadow-sm text-[#4A90E2] text-xs font-bold uppercase tracking-wider mb-4 backdrop-blur-md">
                Pet Matrimony & Adoption
            </span>
            <h1 className="text-5xl md:text-6xl font-extrabold text-[#333333] mb-6 tracking-tight">
                Find Their <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#4A90E2] to-[#50E3C2]">Perfect Match</span>
            </h1>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">
                Connect with verified pet owners nearby. Whether you're looking for a playmate, a partner, or a new family member.
            </p>
        </div>

        {/* --- SECTION 1: AI MATCHING SUGGESTIONS --- */}
        {!suggestionsLoading && userPets.length > 0 && (
            <div className="mb-20">
              {userPets.map((myPet) => {
                  const matches = suggestionsMap[myPet._id] || [];
                  if (matches.length === 0) return null;

                  return (
                      <div key={myPet._id} className="mb-12">
                          <div className="flex items-center gap-4 mb-6">
                              <div className="relative w-12 h-12 rounded-full border-2 border-white shadow-md overflow-hidden">
                                <img src={myPet.imageUrls?.[0] || "/imgs/dog.jpg"} className="object-cover w-full h-full" alt={myPet.name} />
                              </div>
                              <div>
                                  <h2 className="text-2xl font-bold text-[#333333]">Top Picks for {myPet.name}</h2>
                                  <p className="text-sm text-gray-500">Based on breed, age & compatibility</p>
                              </div>
                          </div>
                          
                          {/* Horizontal Scroll Container for Matches */}
                          <div className="flex gap-6 overflow-x-auto pb-8 pt-2 px-2 scrollbar-hide snap-x">
                            {matches.map((pet) => (
                              <div
                                key={pet._id}
                                onClick={() => handlePetClick(pet._id)}
                                className="snap-center shrink-0 w-64 bg-white/80 backdrop-blur-md rounded-[2rem] p-3 shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 border border-white cursor-pointer group relative"
                              >
                                <div className="absolute top-3 right-3 z-10 bg-gradient-to-r from-[#FF9A00] to-[#FF5E62] text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-md">
                                  {pet.compatibilityScore}% Match
                                </div>
                                
                                <div className="h-48 w-full rounded-[1.5rem] overflow-hidden relative mb-3">
                                    <img
                                        src={pet.imageUrls?.[0]}
                                        alt={pet.name}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                                    <div className="absolute bottom-3 left-4 text-white">
                                        <h3 className="font-bold text-lg leading-tight">{pet.name}</h3>
                                        <p className="text-xs opacity-90">{pet.age} yrs • {pet.location?.city || 'Nearby'}</p>
                                    </div>
                                </div>
                              </div>
                            ))}
                          </div>
                      </div>
                  );
              })}
            </div>
        )}

        {/* --- SECTION 2: DISCOVER (FILTERS + GRID) --- */}
        <div>
            <h2 className="text-3xl font-bold text-[#333333] mb-8 text-center">Explore All Pets</h2>
            
            {/* Glass Filter Bar */}
            <div className="sticky top-20 z-30 mb-10 mx-auto max-w-4xl">
                <div className="bg-white/70 backdrop-blur-xl rounded-full p-2 shadow-xl border border-white/50 flex flex-col md:flex-row gap-2 md:items-center justify-between">
                    
                    {/* Type & Breed (Mobile Scrollable) */}
                    <div className="flex items-center gap-2 overflow-x-auto px-2 pb-2 md:pb-0 no-scrollbar">
                        <select
                            className="bg-transparent font-bold text-sm text-gray-700 py-2 px-4 rounded-full hover:bg-white/50 focus:bg-white transition-colors cursor-pointer outline-none"
                            value={filters.type}
                            onChange={(e) => setFilters({ ...filters, type: e.target.value, breed: "" })}
                        >
                            <option value="">All Types</option>
                            <option value="Dog">Dog 🐶</option>
                            <option value="Cat">Cat 🐱</option>
                            <option value="Rabbit">Rabbit 🐰</option>
                            <option value="Bird">Bird 🦜</option>
                        </select>

                        <div className="w-px h-6 bg-gray-300/50 mx-1 hidden md:block"></div>

                        <select
                            className="bg-transparent font-bold text-sm text-gray-700 py-2 px-4 rounded-full hover:bg-white/50 focus:bg-white transition-colors cursor-pointer outline-none disabled:opacity-30"
                            value={filters.breed}
                            onChange={(e) => setFilters({ ...filters, breed: e.target.value })}
                            disabled={!filters.type}
                        >
                            <option value="">All Breeds</option>
                            {filters.type && breedOptions[filters.type].map((breed) => (
                                <option key={breed} value={breed}>{breed}</option>
                            ))}
                        </select>
                    </div>

                    {/* Radius Slider */}
                    <div className="flex items-center gap-3 bg-white/50 rounded-full px-4 py-2 mx-2 md:mx-0">
                        <span className="text-xs font-bold text-gray-400 uppercase">Distance</span>
                        <input
                            type="range"
                            min="5"
                            max="250"
                            step="5"
                            value={filters.radius}
                            onChange={(e) => setFilters({ ...filters, radius: e.target.value })}
                            className="w-24 md:w-32 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#4A90E2]"
                        />
                        <span className="text-xs font-bold text-[#4A90E2] w-10">{filters.radius}km</span>
                    </div>
                </div>
            </div>

            {/* Listing Grid */}
            {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {[...Array(10)].map((_, i) => (
                        <div key={i} className="h-64 bg-white/40 rounded-[2rem] animate-pulse"></div>
                    ))}
                </div>
            ) : pets.length === 0 ? (
                <div className="text-center py-20 bg-white/40 rounded-[3rem]">
                    <p className="text-gray-500 text-lg font-medium">No pets found matching your criteria.</p>
                    <button onClick={() => setFilters({ type: "", breed: "", radius: "50" })} className="mt-4 text-[#4A90E2] font-bold hover:underline">Clear Filters</button>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6"> 
                {pets.map((pet) => (
                    <div
                    key={pet._id}
                    onClick={() => handlePetClick(pet._id)}
                    className="group cursor-pointer bg-white rounded-[2rem] p-3 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 border border-transparent hover:border-[#4A90E2]/20 relative overflow-hidden"
                    >
                    <div className="h-64 w-full rounded-[1.5rem] overflow-hidden relative mb-3 bg-gray-100">
                        <img
                            src={pet.imageUrls?.[0]}
                            alt={pet.name}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                        {/* Gender Badge */}
                        <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-[10px] font-bold shadow-sm backdrop-blur-md ${pet.gender === 'Male' ? 'bg-blue-500/90 text-white' : 'bg-pink-500/90 text-white'}`}>
                            {pet.gender}
                        </div>
                        {/* Distance Badge */}
                        {pet.distance !== undefined && (
                            <div className="absolute top-3 left-3 px-2 py-1 rounded-full text-[10px] font-bold bg-black/50 backdrop-blur-md text-white flex items-center gap-1">
                                📍 {pet.distance.toFixed(0)}km
                            </div>
                        )}
                        
                        {/* Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity"></div>
                        
                        <div className="absolute bottom-4 left-4 text-white">
                            <h3 className="font-extrabold text-xl tracking-tight">{pet.name}</h3>
                            <p className="text-xs font-medium opacity-90">{pet.breed}</p>
                        </div>
                    </div>
                    
                    <div className="px-2 pb-2 flex justify-between items-center">
                        <div className="flex gap-2">
                            <span className="px-2 py-1 bg-gray-100 rounded-lg text-[10px] font-bold text-gray-600 uppercase tracking-wide">{pet.type}</span>
                            <span className="px-2 py-1 bg-gray-100 rounded-lg text-[10px] font-bold text-gray-600 uppercase tracking-wide">{pet.age} Yrs</span>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-[#E2F4EF] flex items-center justify-center text-[#4A90E2] group-hover:bg-[#4A90E2] group-hover:text-white transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                            </svg>
                        </div>
                    </div>
                    </div>
                ))}
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
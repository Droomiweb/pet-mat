// app/adoption/page.js
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./../auth-provider";
import Image from "next/image";
import Link from "next/link";

// --- ICONS ---
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>;
const LocationIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>;
const FilterIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" /></svg>;

// --- SKELETON COMPONENT ---
const SkeletonCard = () => (
  <div className="bg-white/60 rounded-[2rem] p-3 shadow-sm border border-white animate-pulse">
    <div className="h-48 bg-gray-200 rounded-[1.5rem] mb-3"></div>
    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2 mx-2"></div>
    <div className="h-3 bg-gray-200 rounded w-1/2 mx-2 mb-4"></div>
    <div className="flex gap-2 mx-2">
        <div className="h-6 w-16 bg-gray-200 rounded-lg"></div>
        <div className="h-6 w-16 bg-gray-200 rounded-lg"></div>
    </div>
  </div>
);

export default function AdoptionPage() {
  const [pets, setPets] = useState([]);
  const [filters, setFilters] = useState({ type: "", breed: "", city: "" });
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const breedOptions = {
      Dog: ["Labrador Retriever", "German Shepherd", "Golden Retriever", "Bulldog", "Poodle", "Beagle", "Other"],
      Cat: ["Persian", "Maine Coon", "Siamese", "Bengal", "Ragdoll", "British Shorthair", "Other"],
      Rabbit: ["Holland Lop", "Netherland Dwarf", "Lionhead", "Flemish Giant", "Mini Rex", "Other"],
      Bird: ["Parrot", "Cockatiel", "Canary", "Lovebird", "Finch", "Macaw", "Other"],
      Other: ["Mixed", "Unknown"],
  };

  const cityOptions = [
    "All Cities", "Delhi", "Mumbai", "Bengaluru", "Chennai", "Kolkata", "Hyderabad", "Kochi", "Pune", "Jaipur",
  ];

  // Fetches pets listed ONLY for adoption
  const fetchAdoptionPets = async () => {
    if (authLoading) return;

    setLoading(true);
    try {
      const excludeOwnerId = user ? user.uid : "";
      
      const queryParams = {
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v)),
        excludeOwnerId: excludeOwnerId,
        listingType: "Adoption" 
      };
      
      const query = new URLSearchParams(queryParams).toString();

      const res = await fetch(`/api/pet?${query}`);
      if (res.ok) {
        const data = await res.json();
        setPets(data);
      } else {
        console.error("Failed to fetch pets:", await res.text());
      }
    } catch (err) {
      console.error("Error fetching pets:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
        fetchAdoptionPets();
    }
  }, [filters, authLoading, user]);

  const handlePetClick = (petId) => {
    if (!user) return router.push("/Login");
    router.push(`/pet/${petId}`);
  };

  return (
    <div className="min-h-screen bg-[#E2F4EF] relative overflow-x-hidden pb-20">
      
      {/* --- BACKGROUND ANIMATION --- */}
      <div className="fixed top-0 left-0 w-full h-full z-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-purple-200/30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-10%] left-[-5%] w-96 h-96 bg-blue-200/30 rounded-full blur-3xl"></div>
        {[...Array(6)].map((_, i) => (
            <div key={i} className="paw-print" style={{ 
                position: 'absolute', 
                opacity: 0.05, 
                top: `${Math.random() * 100}%`, 
                left: `${Math.random() * 100}%`,
                fontSize: '3rem'
            }}>🐾</div>
        ))}
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 pt-24 md:pt-28">
        
        {/* --- HEADER --- */}
        <div className="text-center mb-12">
            <span className="inline-block py-1 px-3 rounded-full bg-white/60 border border-white shadow-sm text-[#4A90E2] text-xs font-bold uppercase tracking-wider mb-3 backdrop-blur-md">
                Find a Friend
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold text-[#333333] mb-4 tracking-tight">
                Adopt a <span className="text-[#4A90E2]">Forever Companion</span>
            </h1>
            <p className="text-gray-500 max-w-2xl mx-auto text-lg leading-relaxed">
                Give a loving home to a pet in need. Browse verified adoption listings nearby.
            </p>
        </div>

        {/* --- FILTERS BAR --- */}
        <div className="sticky top-24 z-30 mb-10">
            <div className="bg-white/70 backdrop-blur-xl rounded-[2rem] p-3 shadow-xl border border-white/50 flex flex-col lg:flex-row gap-3 items-center justify-between max-w-5xl mx-auto">
                
                {/* Dropdowns Container */}
                <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-center">
                    <div className="relative group">
                        <select
                            className="appearance-none bg-white border border-gray-200 text-gray-700 font-bold py-3 pl-4 pr-10 rounded-xl focus:outline-none focus:border-[#4A90E2] focus:ring-2 focus:ring-blue-50 cursor-pointer transition-all shadow-sm text-sm min-w-[140px]"
                            value={filters.type}
                            onChange={(e) => setFilters({ ...filters, type: e.target.value, breed: "" })}
                        >
                            <option value="">All Types</option>
                            <option value="Dog">Dog 🐶</option>
                            <option value="Cat">Cat 🐱</option>
                            <option value="Rabbit">Rabbit 🐰</option>
                            <option value="Bird">Bird 🦜</option>
                            <option value="Other">Other 🐾</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                            <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                        </div>
                    </div>

                    <div className="relative group">
                        <select
                            className="appearance-none bg-white border border-gray-200 text-gray-700 font-bold py-3 pl-4 pr-10 rounded-xl focus:outline-none focus:border-[#4A90E2] focus:ring-2 focus:ring-blue-50 cursor-pointer transition-all shadow-sm text-sm min-w-[160px] disabled:opacity-50 disabled:cursor-not-allowed"
                            value={filters.breed}
                            onChange={(e) => setFilters({ ...filters, breed: e.target.value })}
                            disabled={!filters.type}
                        >
                            <option value="">All Breeds</option>
                            {filters.type && breedOptions[filters.type].map((breed) => (
                                <option key={breed} value={breed}>{breed}</option>
                            ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                            <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                        </div>
                    </div>

                    <div className="relative group">
                        <select
                            className="appearance-none bg-white border border-gray-200 text-gray-700 font-bold py-3 pl-4 pr-10 rounded-xl focus:outline-none focus:border-[#4A90E2] focus:ring-2 focus:ring-blue-50 cursor-pointer transition-all shadow-sm text-sm min-w-[140px]"
                            value={filters.city}
                            onChange={(e) => setFilters({ ...filters, city: e.target.value === "All Cities" ? "" : e.target.value })}
                        >
                            {cityOptions.map((city) => (
                                <option key={city} value={city}>{city}</option>
                            ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                            <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                        </div>
                    </div>
                </div>

                {/* Search Button */}
                <button
                    onClick={fetchAdoptionPets}
                    disabled={loading}
                    className="w-full lg:w-auto bg-[#333333] text-white font-bold py-3 px-8 rounded-xl shadow-lg hover:bg-black transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 disabled:scale-100"
                >
                    {loading ? (
                        <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                    ) : (
                        <>
                            <SearchIcon />
                            <span>Find Pet</span>
                        </>
                    )}
                </button>
            </div>
        </div>

        {/* --- GRID CONTENT --- */}
        {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {[...Array(10)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
        ) : pets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white/40 rounded-[3rem] border-2 border-dashed border-white/50">
                <div className="text-6xl mb-4 grayscale opacity-40">🏠</div>
                <h3 className="text-xl font-bold text-gray-500">No pets found for adoption.</h3>
                <p className="text-gray-400 text-sm mt-1">Try changing your filters or check back later.</p>
                <button 
                    onClick={() => setFilters({ type: "", breed: "", city: "" })} 
                    className="mt-6 text-[#4A90E2] font-bold hover:underline bg-white px-6 py-2 rounded-full shadow-sm"
                >
                    Clear Filters
                </button>
            </div>
        ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6"> 
                {pets.map((pet) => (
                    <div
                        key={pet._id}
                        onClick={() => handlePetClick(pet._id)}
                        className="group cursor-pointer bg-white rounded-[2rem] p-3 shadow-md hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 border border-white relative overflow-hidden"
                    >
                        {/* Image Container */}
                        <div className="h-60 w-full rounded-[1.5rem] overflow-hidden relative mb-3 bg-gray-100">
                            <Image
                                src={pet.imageUrls?.[0] || "/imgs/dog.jpg"}
                                alt={pet.name}
                                fill
                                className="object-cover transition-transform duration-700 group-hover:scale-110"
                            />
                            
                            {/* Gender Badge */}
                            <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-[10px] font-bold shadow-md backdrop-blur-md border border-white/20 ${pet.gender === 'Male' ? 'bg-blue-500/90 text-white' : 'bg-pink-500/90 text-white'}`}>
                                {pet.gender}
                            </div>

                            {/* Overlay Gradient */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity"></div>
                            
                            {/* Floating Info */}
                            <div className="absolute bottom-4 left-4 text-white">
                                <h3 className="font-extrabold text-2xl tracking-tight leading-none mb-1">{pet.name}</h3>
                                <p className="text-xs font-medium opacity-90 flex items-center gap-1">
                                    {pet.breed}
                                </p>
                            </div>
                        </div>
                        
                        {/* Bottom Details */}
                        <div className="px-2 pb-2 flex justify-between items-center">
                            <div className="flex gap-2">
                                <span className="px-2.5 py-1 bg-gray-100 rounded-lg text-[10px] font-bold text-gray-600 uppercase tracking-wide border border-gray-200">
                                    {pet.age} Yrs
                                </span>
                                {pet.location?.city && (
                                    <span className="px-2.5 py-1 bg-blue-50 rounded-lg text-[10px] font-bold text-blue-600 uppercase tracking-wide border border-blue-100 flex items-center gap-1">
                                        <LocationIcon /> {pet.location.city}
                                    </span>
                                )}
                            </div>
                            
                            {/* Action Button Icon */}
                            <div className="w-8 h-8 rounded-full bg-[#E2F4EF] flex items-center justify-center text-[#4A90E2] group-hover:bg-[#4A90E2] group-hover:text-white transition-colors shadow-sm">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                    <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )}
        
      </div>
    </div>
  );
}
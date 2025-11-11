// app/adoption/page.js
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "./../lib/firebase";

export default function AdoptionPage() {
  const [pets, setPets] = useState([]);
  const [filters, setFilters] = useState({ type: "", breed: "", city: "" });
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  
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
    setLoading(true);
    try {
      const user = auth.currentUser;
      const excludeOwnerId = user ? user.uid : "";
      
      const queryParams = {
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v)),
        excludeOwnerId: excludeOwnerId,
        listingType: "Adoption" // <-- KEY CHANGE: Only fetch adoption pets
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
    fetchAdoptionPets();
  }, [filters]); // Re-fetch when filters change


  const handlePetClick = (petId) => {
    const user = auth.currentUser;
    if (!user) return router.push("/Login");
    router.push(`/pet/${petId}`);
  };

  return (
    <div className="min-h-screen bg-[#F4F7F9] p-4 md:p-10">
      <h1 className="text-4xl font-extrabold text-[#333333] mb-12 text-center border-b-4 border-[#4A90E2] pb-4">
        Find a Pet to Adopt
      </h1>

      <h2 className="text-3xl font-bold text-[#333333] mb-6 border-l-4 border-[#4A90E2] pl-3">
              Adoption Listings
      </h2>
      
      {/* Filters Section */}
      <div className="flex flex-wrap justify-center gap-4 mb-10 p-5 rounded-xl bg-white shadow-inner">
        {/* Pet Type */}
        <select
          className="p-3 rounded-lg border-2 border-gray-300 bg-white focus:border-[#4A90E2] transition-colors cursor-pointer"
          value={filters.type}
          onChange={(e) =>
            setFilters({ ...filters, type: e.target.value, breed: "" })
          }
        >
          <option value="">All Types</option>
          <option value="Dog">Dog</option>
          <option value="Cat">Cat</option>
          <option value="Rabbit">Rabbit</option>
          <option value="Bird">Bird</option>
          <option value="Other">Other</option>
        </select>

        {/* Breed (depends on type) */}
        <select
          className="p-3 rounded-lg border-2 border-gray-300 bg-white focus:border-[#4A90E2] transition-colors cursor-pointer"
          value={filters.breed}
          onChange={(e) =>
            setFilters({ ...filters, breed: e.target.value })
          }
          disabled={!filters.type}
        >
          <option value="">All Breeds</option>
          {filters.type &&
            breedOptions[filters.type].map((breed) => (
              <option key={breed} value={breed}>
                {breed}
              </option>
            ))}
        </select>

        {/* City */}
        <select
          className="p-3 rounded-lg border-2 border-gray-300 bg-white focus:border-[#4A90E2] transition-colors cursor-pointer"
          value={filters.city}
          onChange={(e) =>
            setFilters({
              ...filters,
              city: e.target.value === "All Cities" ? "" : e.target.value,
            })
          }
        >
          {cityOptions.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>

        <button
          onClick={fetchAdoptionPets}
          className="btn-primary py-3 px-8"
          disabled={loading}
        >
          {loading ? "Searching..." : "Apply Filters"}
        </button>
      </div>

      {/* Pet Grid */}
      {loading ? (
        <p className="text-center text-[#333333] text-xl py-10">Loading pets for adoption...</p>
      ) : pets.length === 0 ? (
        <p className="text-[#333333] text-center text-xl py-10">
          No pets found for adoption matching your criteria.
        </p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6"> 
          {pets.map((pet) => (
            <div
              key={pet._id}
              onClick={() => handlePetClick(pet._id)}
              className="cursor-pointer bg-white rounded-xl shadow-lg p-4 hover:scale-[1.03] hover:shadow-2xl transition-transform duration-300 border-b-4 border-[#4A90E2] hover:border-[#50E3C2]" 
            >
              {pet.imageUrls?.[0] && (
                <img
                  src={pet.imageUrls[0]}
                  alt={pet.name}
                  className="w-full h-40 object-cover rounded-lg mb-3 border border-gray-200"
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
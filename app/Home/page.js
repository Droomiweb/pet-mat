// app/Home/page.js
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "./../lib/firebase";

export default function Main() {
  const [pets, setPets] = useState([]);
  const [filters, setFilters] = useState({ type: "", breed: "", city: "" });
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const breedOptions = {
    Dog: [
      "Labrador Retriever", "German Shepherd", "Golden Retriever", "Bulldog", "Poodle", "Beagle", "Other",
    ],
    Cat: [
      "Persian", "Maine Coon", "Siamese", "Bengal", "Ragdoll", "British Shorthair", "Other",
    ],
    Rabbit: [
      "Holland Lop", "Netherland Dwarf", "Lionhead", "Flemish Giant", "Mini Rex", "Other",
    ],
    Bird: [
      "Parrot", "Cockatiel", "Canary", "Lovebird", "Finch", "Macaw", "Other",
    ],
    Other: ["Mixed", "Unknown"],
  };

  const cityOptions = [
    "All Cities", "Delhi", "Mumbai", "Bengaluru", "Chennai", "Kolkata", "Hyderabad", "Kochi", "Pune", "Jaipur",
  ];

  const fetchPets = async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams(
        Object.fromEntries(Object.entries(filters).filter(([_, v]) => v))
      ).toString();

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
    fetchPets();
  }, []);

  const handlePetClick = (petId) => {
    const user = auth.currentUser;
    if (!user) return router.push("/Login");
    router.push(`/pet/${petId}`);
  };

  return (
    <div className="min-h-screen bg-[#F6F1E9] p-4 md:p-10">
      <h1 className="text-4xl font-bold text-[#4F200D] mb-6 text-center">Our Lovely Pets</h1>

      {/* Filters Section */}
      <div className="flex flex-wrap justify-center gap-4 mb-8 items-center">
        <select
          className="p-2 rounded-xl border-2 border-[#FF9A00] bg-white"
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
          className="p-2 rounded-xl border-2 border-[#FF9A00] bg-white"
          value={filters.breed}
          onChange={(e) => setFilters({ ...filters, breed: e.target.value })}
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
        <select
          className="p-2 rounded-xl border-2 border-[#FF9A00] bg-white"
          value={filters.city}
          onChange={(e) => setFilters({ ...filters, city: e.target.value === "All Cities" ? "" : e.target.value })}
        >
          {cityOptions.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>
        <button
          onClick={fetchPets}
          className="bg-[#FF9A00] hover:bg-[#e68a00] text-white font-semibold px-6 py-2 rounded-xl shadow-lg transition-all duration-200"
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </div>

      {/* Pet Grid */}
      {loading ? (
        <p className="text-center text-[#4F200D] text-lg">Loading pets...</p>
      ) : pets.length === 0 ? (
        <p className="text-[#4F200D] text-center text-xl">No pets found for your search.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
          {pets.map((pet) => (
            <div
              key={pet._id}
              onClick={() => handlePetClick(pet._id)}
              className="cursor-pointer bg-[#FFD93D] rounded-2xl shadow-lg p-4 hover:scale-105 hover:shadow-2xl transition-transform duration-300"
            >
              {pet.imageUrls?.[0] && (
                <img
                  src={pet.imageUrls[0]}
                  alt={pet.name}
                  className="w-full h-48 object-cover rounded-xl mb-4 border-2 border-[#FF9A00]"
                />
              )}
              <h3 className="font-bold text-xl text-[#4F200D] mb-1">{pet.name}</h3>
              <p className="text-[#4F200D] text-sm">Type: {pet.type}</p>
              <p className="text-[#4F200D] text-sm">Breed: {pet.breed}</p>
              <p className="text-[#4F200D] text-sm">Age: {pet.age}</p>
              {pet.location?.city && (
                <p className="text-[#4F200D] text-sm">📍 {pet.location.city}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
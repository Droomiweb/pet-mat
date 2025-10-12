"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "./../lib/firebase";

export default function Main() {
  const [pets, setPets] = useState([]);
  const router = useRouter();

  const fetchPets = async () => {
    try {
      const res = await fetch("/api/pet");
      if (res.ok) {
        const data = await res.json();
        setPets(data);
      } else {
        console.error("Failed to fetch pets:", await res.text());
      }
    } catch (err) {
      console.error("Error fetching pets:", err);
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
      <h1 className="text-4xl font-bold text-[#4F200D] mb-10 text-center">Our Lovely Pets</h1>

      {pets.length === 0 ? (
        <p className="text-[#4F200D] text-center text-xl">No pets available yet.</p>
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
              <p className="text-[#4F200D] text-sm">Breed: {pet.breed}</p>
              <p className="text-[#4F200D] text-sm">Age: {pet.age}</p>
              <div className="mt-2 w-full h-1 bg-[#FF9A00] rounded-full" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { auth } from "../../lib/firebase";

export default function PetDetailPage() {
  const [pet, setPet] = useState(null);
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    const fetchPet = async () => {
      try {
        const res = await fetch(`/api/pet/${params.id}`);
        if (!res.ok) {
          console.error("Pet not found");
          router.push("/"); // go back to homepage
          return;
        }
        const data = await res.json();
        setPet(data);
      } catch (err) {
        console.error(err);
      }
    };

    fetchPet();
  }, [params.id]);

  if (!pet) return <p className="text-[#4F200D]">Loading...</p>;

  return (
    <div className="min-h-screen bg-[#F6F1E9] p-4 md:p-10">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg p-6 md:p-10">
        {pet.imageUrls?.length > 0 && (
          <img
            src={pet.imageUrls[0]}
            alt={pet.name}
            className="w-full h-64 object-cover rounded-xl mb-4"
          />
        )}
        <h1 className="text-3xl font-bold text-[#4F200D] mb-2">{pet.name}</h1>
        <p className="text-[#4F200D]">Breed: {pet.breed}</p>
        <p className="text-[#4F200D]">Age: {pet.age}</p>
        {pet.certificateUrl && (
          <a
            href={pet.certificateUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline mt-2 block"
          >
            View Certificate
          </a>
        )}
      </div>
    </div>
  );
}

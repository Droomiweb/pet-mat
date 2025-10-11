"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "../lib/firebase";

export default function ProfilePage() {
  const [userData, setUserData] = useState(null);
  const [pets, setPets] = useState([]);
  const [locationName, setLocationName] = useState("");
  const router = useRouter();

  const fetchUserData = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return router.push("/Login");

      // Fetch user from MongoDB
      const res = await fetch(`/api/user/${user.uid}`);
      if (!res.ok) {
        console.error("Failed to fetch user:", await res.text());
        return;
      }
      const data = await res.json();
      setUserData(data);

      // Reverse geocode location if available
      if (data.location && data.location.lat && data.location.lng) {
        const { lat, lng } = data.location;
        const geoRes = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
        );
        if (geoRes.ok) {
          const geoData = await geoRes.json();
          setLocationName(geoData.display_name);
        } else {
          console.error("Failed to fetch location:", await geoRes.text());
        }
      }

      // Fetch user's pets
      await fetchPets(user.uid);
    } catch (err) {
      console.error("Error fetching profile data:", err);
    }
  };

  const fetchPets = async (uid) => {
    try {
      const petsRes = await fetch(`/api/pet/user/${uid}`);
      if (petsRes.ok) {
        const petsData = await petsRes.json();
        setPets(petsData);
      } else {
        console.error("Failed to fetch pets:", await petsRes.text());
      }
    } catch (err) {
      console.error("Error fetching pets:", err);
    }
  };

  const handleDeletePet = async (petId) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this pet?");
    if (!confirmDelete) return;

    try {
      const res = await fetch(`/api/pet/${petId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setPets((prev) => prev.filter((pet) => pet._id !== petId));
      } else {
        console.error("Failed to delete pet:", await res.text());
        alert("Failed to delete pet. Try again later.");
      }
    } catch (err) {
      console.error("Error deleting pet:", err);
      alert("Error deleting pet. Check console for details.");
    }
  };

  const handleLogout = async () => {
    await auth.signOut();
    router.push("/Login");
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  if (!userData) return <p className="text-[#4F200D]">Loading...</p>;

  return (
    <div className="min-h-screen bg-[#F6F1E9] p-4 md:p-10">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg p-6 md:p-10">
        <div className="flex flex-col md:flex-row md:justify-between items-start md:items-center">
          <div>
            <h1 className="text-3xl font-bold text-[#4F200D]">{userData.name}</h1>
            <p className="text-[#4F200D] mt-1">Email: {auth.currentUser.email}</p>
            <p className="text-[#4F200D] mt-1">Phone: {userData.phone}</p>
            <p className="text-[#4F200D] mt-1">
              Location: {locationName || "Not available"}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="mt-4 md:mt-0 bg-[#FF9A00] hover:bg-[#FFD93D] text-white font-bold py-2 px-6 rounded-full"
          >
            Logout
          </button>
        </div>

        <h2 className="text-2xl font-bold text-[#4F200D] mt-10 mb-4">My Pets</h2>
        {pets.length === 0 ? (
          <p className="text-[#4F200D]">No pets added yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {pets.map((pet) => (
              <div
                key={pet._id}
                className="bg-[#FFD93D] p-4 rounded-xl shadow-md text-[#4F200D] flex flex-col justify-between"
              >
                <div>
                  {pet.imageUrls?.[0] && (
                    <img
                      src={pet.imageUrls[0]}
                      alt={pet.name}
                      className="w-full h-48 object-cover rounded-lg mb-3"
                    />
                  )}
                  <h3 className="font-bold text-xl">{pet.name}</h3>
                  <p>Breed: {pet.breed}</p>
                  <p>Age: {pet.age}</p>
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
                <button
                  onClick={() => handleDeletePet(pet._id)}
                  className="mt-4 bg-[#4F200D] hover:bg-[#FF9A00] text-white font-bold py-2 px-4 rounded-full transition"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

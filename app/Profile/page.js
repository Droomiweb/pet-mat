// app/Profile/page.js
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "../lib/firebase";

export default function ProfilePage() {
  const [userData, setUserData] = useState(null);
  const [pets, setPets] = useState([]);
  const [locationName, setLocationName] = useState("");
  const router = useRouter();

  const fetchUserData = async (user) => {
    // Fetch user from MongoDB
    const res = await fetch(`/api/user/${user.uid}`);
    if (!res.ok) {
      console.error("Failed to fetch user:", await res.text());
      return;
    }
    const data = await res.json();
    setUserData(data);

    // Reverse geocode location if available
    if (data.location?.lat && data.location?.lng) {
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${data.location.lat}&lon=${data.location.lng}`
      );
      if (geoRes.ok) {
        const geoData = await geoRes.json();
        setLocationName(geoData.display_name);
      }
    }

    // Fetch user's pets
    await fetchPets(user.uid);
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
      const res = await fetch(`/api/pet/${petId}`, { method: "DELETE" });
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
    const user = auth.currentUser;
    if (!user) {
      return router.push("/Login");
    }
    fetchUserData(user);
  }, []);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'verified':
        return 'bg-green-100 text-green-700 border-green-400';
      case 'rejected':
        return 'bg-red-100 text-red-700 border-red-400';
      default:
        return 'bg-yellow-100 text-yellow-700 border-yellow-400';
    }
  };

  if (!userData) {
    return <p className="text-[#333333] text-center mt-20 text-xl">Loading profile...</p>; 
  }

  const userId = userData.username || auth.currentUser.uid;

  return (
    // Updated BG color to new global background
    <div className="min-h-screen bg-[#E2F4EF] p-4 md:p-10"> 
      
      {/* Main Profile Card - APPLY GLASS */}
      <div className="max-w-5xl mx-auto glass-container shadow-2xl border-t-8 border-[#4A90E2]"> 
        
        {/* Header: User Info + Add Pet Button */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-10 border-b pb-6 border-gray-100">
          <div>
            <h1 className="text-4xl font-extrabold text-[#333333]">{userData.name}</h1>
            <p className="text-[#333333] mt-2 text-lg">UserID: {userId}</p>
            <p className="text-[#333333] mt-1 text-lg">
              Location: {locationName || "Not available"}
            </p>
          </div>
          <div className="flex gap-4 mt-6 md:mt-0">
            <button
              onClick={() => router.push("/Addpet")}
              className="bg-[#50E3C2] hover:bg-[#3FCCB4] text-[#333333] font-bold py-3 px-6 rounded-xl transition shadow-lg hover:scale-105"
            >
              + Add Pet
            </button>
            <button
              onClick={handleLogout}
              className="bg-[#333333] hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-xl transition shadow-lg" 
            >
              Logout
            </button>
          </div>
        </div>

        {/* Pets Section */}
        <h2 className="text-3xl font-bold text-[#4A90E2] mb-8 border-l-4 border-[#50E3C2] pl-3">My Pets ({pets.length})</h2>
        {pets.length === 0 ? (
          <p className="text-[#333333] text-lg">No pets added yet. Click 'Add Pet' to get started!</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
            {pets.map((pet) => (
              <div
                key={pet._id}
                // Pet card styling - APPLY subtle glass background
                className="bg-white/50 p-5 rounded-2xl shadow-xl flex flex-col justify-between hover:scale-[1.02] transform transition duration-300 border-b-4 border-[#50E3C2] hover:border-[#4A90E2]" 
              >
                <div>
                  {pet.imageUrls?.[0] && (
                    <img
                      src={pet.imageUrls[0]}
                      alt={pet.name}
                      className="w-full h-48 object-cover rounded-xl mb-4 border border-gray-200"
                    />
                  )}
                  {/* Name and Gender Display */}
                  <h3 className="font-bold text-2xl text-[#333333] flex justify-between items-center mb-2">
                    {pet.name}
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${pet.gender === 'Male' ? 'bg-blue-200 text-blue-800' : 'bg-pink-200 text-pink-800'}`}>
                        {pet.gender}
                    </span>
                  </h3>
                  
                  {/* Verification Status Badge */}
                  <div className="mb-2">
                      <span className={`font-bold px-3 py-1 rounded-full text-xs border ${getStatusBadge(pet.verificationStatus)} uppercase tracking-wider`}>
                          {pet.verificationStatus}
                      </span>
                  </div>

                  <p className="text-[#333333] mt-1">Breed: {pet.breed}</p>
                  <p className="text-[#333333]">Age: {pet.age}</p>
                  
                  {pet.certificateUrl && (
                    <a
                      href={pet.certificateUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      // Updated link color
                      className="text-[#4A90E2] font-medium underline mt-3 block hover:text-[#50E3C2]" 
                    >
                      View Certificate
                    </a>
                  )}
                </div>
                <button
                  onClick={() => handleDeletePet(pet._id)}
                  // Updated delete button style
                  className="mt-6 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-full transition shadow-md hover:shadow-lg" 
                >
                  Delete Listing
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
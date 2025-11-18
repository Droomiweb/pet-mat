// app/marketplace/page.js
"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { auth } from "../lib/firebase";

export default function MarketplacePage() {
  // Removed "products" state (Community Listings)
  
  const [myPets, setMyPets] = useState([]);
  const [selectedPetId, setSelectedPetId] = useState("");
  
  const [recData, setRecData] = useState({ recommendations: [] });
  const [recLoading, setRecLoading] = useState(false);

  const router = useRouter();
  const user = auth.currentUser;

  // Only fetch user pets now
  const fetchUserPets = async () => {
    if (!user) return;
    try {
        const timestamp = new Date().getTime();
        const res = await fetch(`/api/pet/user/${user.uid}?t=${timestamp}`);
        if (res.ok) {
            const data = await res.json();
            setMyPets(data);
            if (data.length > 0) setSelectedPetId(data[0]._id);
        }
    } catch (err) { console.error(err); }
  }

  useEffect(() => {
    const fetchRecommendations = async () => {
        if (!selectedPetId) return;
        
        const pet = myPets.find(p => p._id === selectedPetId);
        
        // Clear previous data while loading to avoid confusion
        setRecData({ recommendations: [] });

        if (!pet || !pet.aiProfileString) {
            return;
        }

        setRecLoading(true);
        try {
            const res = await fetch("/api/marketplace/recommendations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ petId: selectedPetId })
            });
            if (res.ok) {
                const data = await res.json();
                setRecData(data);
            }
        } catch (err) { console.error(err); } 
        finally { setRecLoading(false); }
    };
    fetchRecommendations();
  }, [selectedPetId, myPets]);

  useEffect(() => {
    if (user) fetchUserPets();
  }, [user]);

  const selectedPet = myPets.find(p => p._id === selectedPetId);

  return (
    <div className="min-h-screen bg-[#F4F7F9] p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Header Area */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-extrabold text-[#333333] mb-2">
            Pet Essentials
          </h1>
          <p className="text-gray-500">Curated picks for your furry friend</p>
        </div>

        {/* --- MAIN CONTENT --- */}
        {user && myPets.length > 0 ? (
            <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-6 md:p-8">
                
                {/* Selector Header */}
                <div className="flex flex-col md:flex-row items-center justify-between mb-8 border-b pb-4 border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-100 p-3 rounded-full">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#4A90E2]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-800">Shopping for:</h2>
                            <div className="relative group">
                                <select 
                                    value={selectedPetId}
                                    onChange={(e) => setSelectedPetId(e.target.value)}
                                    className="appearance-none bg-transparent font-bold text-[#4A90E2] text-lg pr-6 cursor-pointer outline-none"
                                >
                                    {myPets.map(pet => <option key={pet._id} value={pet._id}>{pet.name}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    {selectedPet?.aiProfileString && (
                        <span className="mt-2 md:mt-0 text-xs font-medium px-3 py-1 bg-green-100 text-green-700 rounded-full">
                            AI Profile Active
                        </span>
                    )}
                </div>

                {/* Content Area */}
                {!selectedPet?.aiProfileString ? (
                     <div className="flex flex-col items-center justify-center py-12 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                        <p className="text-lg text-gray-600 mb-4 font-medium">
                            To get personalized food & toy recommendations, we need to know {selectedPet?.name} better.
                        </p>
                        <Link 
                            href={`/add-pet-profile/${selectedPetId}`}
                            className="bg-[#4A90E2] text-white px-8 py-3 rounded-xl font-bold hover:bg-[#3A75B9] transition-all shadow-lg hover:shadow-xl"
                        >
                            Create Profile
                        </Link>
                     </div>
                ) : recLoading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="w-12 h-12 border-4 border-[#4A90E2] border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-gray-500 font-medium animate-pulse">Finding the best prices on Amazon...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {recData.recommendations.map((item, idx) => (
                            <div key={idx} className="group bg-white rounded-2xl border border-gray-200 hover:border-[#4A90E2] shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden relative">
                                
                                {/* Category Badge */}
                                <div className="absolute top-3 left-3 z-10">
                                    <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wide text-white shadow-sm ${
                                        item.category === 'Food' ? 'bg-green-500' : 'bg-purple-500'
                                    }`}>
                                        {item.category}
                                    </span>
                                </div>

                                {/* Image Container */}
                                <div className="h-48 w-full bg-gray-50 p-4 flex items-center justify-center">
                                    <img 
                                        src={item.imageUrl} 
                                        alt={item.title}
                                        className="max-h-full max-w-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-500"
                                    />
                                </div>

                                {/* Card Body */}
                                <div className="p-5 flex flex-col flex-1">
                                    <h3 className="font-bold text-gray-800 text-sm mb-2 leading-relaxed line-clamp-2 min-h-[40px]">
                                        {item.title}
                                    </h3>
                                    
                                    <div className="mt-auto">
                                        <p className="text-2xl font-extrabold text-gray-900 mb-4">
                                            {item.price}
                                        </p>
                                        
                                        <div className="grid grid-cols-2 gap-2">
                                            <a 
                                                href={`https://www.amazon.in/s?k=${encodeURIComponent(item.query)}`} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="flex items-center justify-center gap-1 bg-[#FF9900] hover:bg-[#e68a00] text-white text-xs font-bold py-2.5 rounded-lg transition-colors shadow-sm"
                                            >
                                                Amazon
                                            </a>
                                            <a 
                                                href={`https://www.flipkart.com/search?q=${encodeURIComponent(item.query)}`} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="flex items-center justify-center gap-1 bg-[#2874F0] hover:bg-[#1e60d1] text-white text-xs font-bold py-2.5 rounded-lg transition-colors shadow-sm"
                                            >
                                                Flipkart
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        ) : (
            <div className="text-center py-20">
                <p className="text-xl text-gray-500 mb-6">Please login and add a pet to see recommendations.</p>
                <Link href="/Login" className="bg-[#4A90E2] text-white px-8 py-3 rounded-full font-bold shadow-lg">
                    Login Now
                </Link>
            </div>
        )}
      </div>
    </div>
  );
}
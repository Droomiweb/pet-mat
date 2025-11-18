// app/marketplace/page.js
"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { auth } from "../lib/firebase";

export default function MarketplacePage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // AI Recommendation State
  const [myPets, setMyPets] = useState([]);
  const [selectedPetId, setSelectedPetId] = useState("");
  const [recData, setRecData] = useState({ localProducts: [], externalQueries: [] });
  const [recLoading, setRecLoading] = useState(false);

  const router = useRouter();
  const user = auth.currentUser;

  // 1. Fetch All Manual Products
  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/products");
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (err) {
      console.error("Error fetching products:", err);
    } finally {
      setLoading(false);
    }
  };

  // 2. Fetch User's Pets for the Dropdown
  const fetchUserPets = async () => {
    if (!user) return;
    try {
        const res = await fetch(`/api/pet/user/${user.uid}`);
        if (res.ok) {
            const data = await res.json();
            // Only show pets that have a profile generated
            const petsWithProfile = data.filter(p => p.aiProfileString);
            setMyPets(petsWithProfile);
            if (petsWithProfile.length > 0) setSelectedPetId(petsWithProfile[0]._id);
        }
    } catch (err) { console.error(err); }
  }

  // 3. Trigger AI Recommendations when Pet Changes
  useEffect(() => {
    const fetchRecommendations = async () => {
        if (!selectedPetId) return;
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
  }, [selectedPetId]);

  // Initial Data Load
  useEffect(() => {
    fetchProducts();
    if (user) fetchUserPets();
  }, [user]);

  const handleAddProduct = () => {
    if (!user) return router.push("/Login");
    router.push("/Add-product");
  };

  if (loading) return <div className="flex justify-center items-center min-h-screen text-[#4A90E2] font-bold">Loading marketplace...</div>;

  return (
    <div className="min-h-screen bg-[#F6F1E9] p-4 md:p-10">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <h1 className="text-4xl font-extrabold text-[#4F200D]">Pet Marketplace</h1>
          <button onClick={handleAddProduct} className="bg-[#FF9A00] hover:bg-[#e68a00] text-white font-bold px-8 py-3 rounded-full shadow-lg transition-all transform hover:scale-105">
            + Sell Item
          </button>
        </div>

        {/* --- AI RECOMMENDATIONS SECTION --- */}
        {user && myPets.length > 0 && (
            <div className="mb-12 bg-white border-2 border-[#4A90E2]/30 rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden">
                {/* Decor element */}
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#50E3C2] to-[#4A90E2]"></div>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-[#333333] flex items-center gap-2">
                           🛍️ For Your Pet:
                            <select 
                                value={selectedPetId}
                                onChange={(e) => setSelectedPetId(e.target.value)}
                                className="ml-2 bg-[#F4F7F9] border-b-2 border-[#4A90E2] text-[#4A90E2] font-bold text-xl py-1 focus:outline-none cursor-pointer"
                            >
                                {myPets.map(pet => <option key={pet._id} value={pet._id}>{pet.name}</option>)}
                            </select>
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">Based on their personality profile</p>
                    </div>
                </div>

                {recLoading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <div className="w-10 h-10 border-4 border-[#4A90E2] border-t-transparent rounded-full animate-spin mb-3"></div>
                        <p className="text-[#4A90E2] font-semibold animate-pulse">Dr. Paws is shopping...</p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        
                        {/* 1. EXTERNAL WEB LINKS (The New Feature) */}
                        {recData.externalQueries.length > 0 && (
                            <div>
                                <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                                    <span>🌐</span> Suggested from the Web
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {recData.externalQueries.map((query, idx) => (
                                        <div key={idx} className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-3 hover:shadow-md transition-shadow">
                                            <span className="font-medium text-gray-800 text-center sm:text-left capitalize">
                                                "{query}"
                                            </span>
                                            <div className="flex gap-2 shrink-0">
                                                <a 
                                                    href={`https://www.amazon.in/s?k=${encodeURIComponent(query)}`} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1 text-xs font-bold bg-[#FF9900] text-white px-3 py-2 rounded-lg hover:bg-[#e68a00] transition-colors"
                                                >
                                                    Amazon
                                                </a>
                                                <a 
                                                    href={`https://www.flipkart.com/search?q=${encodeURIComponent(query)}`} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1 text-xs font-bold bg-[#2874F0] text-white px-3 py-2 rounded-lg hover:bg-[#1e60d1] transition-colors"
                                                >
                                                    Flipkart
                                                </a>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 2. LOCAL MATCHES */}
                        {recData.localProducts.length > 0 && (
                            <div>
                                <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                                    <span>📍</span> Matches from our Community
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {recData.localProducts.map((product) => (
                                       <Link key={product._id} href={`/marketplace/${product._id}`}>
                                        <div className="bg-white rounded-xl shadow-sm hover:shadow-xl p-3 border border-gray-100 transition-all cursor-pointer group relative">
                                            <div className="absolute top-2 right-2 bg-[#50E3C2] text-[#333333] text-[10px] font-bold px-2 py-1 rounded-full shadow-sm z-10">
                                                Verified
                                            </div>
                                            {product.images?.[0] ? (
                                                <img src={product.images[0]} alt={product.name} className="w-full h-32 object-cover rounded-lg mb-3 group-hover:scale-105 transition-transform" />
                                            ) : (
                                                <div className="w-full h-32 bg-gray-100 rounded-lg mb-3 flex items-center justify-center text-gray-400 text-xs">No Image</div>
                                            )}
                                            <h3 className="font-bold text-[#333333] text-sm truncate">{product.name}</h3>
                                            <p className="text-[#FF9A00] font-extrabold mt-1">₹ {product.price}</p>
                                        </div>
                                       </Link>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {recData.localProducts.length === 0 && recData.externalQueries.length === 0 && (
                             <p className="text-gray-500 text-center italic">No specific recommendations found for this pet yet.</p>
                        )}
                    </div>
                )}
            </div>
        )}

        {/* ALL PRODUCTS GRID */}
        <h2 className="text-2xl font-bold text-[#333333] mb-6 pl-4 border-l-4 border-[#FF9A00]">
            Community Listings
        </h2>
        
        {products.length === 0 ? (
            <p className="text-center text-gray-500 py-10">No community products listed yet.</p>
        ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {products.map((product) => (
                  <Link key={product._id} href={`/marketplace/${product._id}`}>
                    <div className="bg-white rounded-2xl shadow-lg p-4 hover:shadow-2xl transition-all duration-300 border border-transparent hover:border-[#4A90E2]">
                      {product.images?.[0] && (
                        <div className="overflow-hidden rounded-xl mb-4">
                             <img src={product.images[0]} alt={product.name} className="w-full h-48 object-cover hover:scale-110 transition-transform duration-500" />
                        </div>
                      )}
                      <h3 className="font-bold text-xl text-[#333333] mb-1 truncate">{product.name}</h3>
                      <div className="flex justify-between items-center">
                          <p className="text-[#FF9A00] text-lg font-bold">₹ {product.price}</p>
                          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-md">{product.category}</span>
                      </div>
                    </div>
                  </Link>
                ))}
            </div>
        )}
      </div>
    </div>
  );
}
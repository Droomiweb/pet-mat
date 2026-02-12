// app/marketplace/page.js
"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../auth-provider";
import Image from "next/image";

// --- ICONS ---
const ShoppingBagIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>;
const SparklesIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" /></svg>;

// --- SKELETON LOADER ---
const ProductSkeleton = () => (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 animate-pulse">
        <div className="h-48 bg-gray-200 rounded-xl mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="flex gap-2">
            <div className="h-10 bg-gray-200 rounded-lg flex-1"></div>
            <div className="h-10 bg-gray-200 rounded-lg flex-1"></div>
        </div>
    </div>
);

export default function MarketplacePage() {
    const [myPets, setMyPets] = useState([]);
    const [selectedPetId, setSelectedPetId] = useState("");
    const [activeCategory, setActiveCategory] = useState("All");

    const [recData, setRecData] = useState({ recommendations: [] });
    const [recLoading, setRecLoading] = useState(false);

    const [recommendationsCache, setRecommendationsCache] = useState({});

    const router = useRouter();
    const { user, loading: authLoading } = useAuth();

    // 1. Fetch User Pets
    useEffect(() => {
        if (authLoading || !user) return;

        const fetchUserPets = async () => {
            try {
                const timestamp = new Date().getTime();
                const res = await fetch(`/api/pet/user/${user.uid}?t=${timestamp}`);
                if (res.ok) {
                    const data = await res.json();
                    setMyPets(data);
                    if (data.length > 0 && !selectedPetId) {
                        setSelectedPetId(data[0]._id);
                    }
                }
            } catch (err) { console.error(err); }
        };

        fetchUserPets();
        fetchUserPets();
    }, [user, authLoading]);

    // 2. Fetch Recommendations
    useEffect(() => {
        const fetchRecommendations = async () => {
            if (!selectedPetId) return;

            const pet = myPets.find(p => p._id === selectedPetId);
            if (!pet) return;

            // Check cache first
            if (recommendationsCache[selectedPetId]) {
                setRecData(recommendationsCache[selectedPetId]);
                return;
            }

            setRecData({ recommendations: [] });

            if (pet.aiProfileString) {
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
                        // Update cache
                        setRecommendationsCache(prev => ({
                            ...prev,
                            [selectedPetId]: data
                        }));
                    }
                } catch (err) { console.error(err); }
                finally { setRecLoading(false); }
            }
        };

        if (myPets.length > 0) {
            fetchRecommendations();
        }
    }, [selectedPetId, myPets, recommendationsCache]);

    // Filter Logic
    const filteredProducts = recData.recommendations.filter(item => {
        if (activeCategory === "All") return true;
        if (activeCategory === "Nutrition") return item.category === "Food";
        if (activeCategory === "Toys & Gear") return item.category !== "Food";
        return true;
    });

    if (authLoading) return null;

    if (!user) {
        return (
            <div className="min-h-screen bg-[#F4F7F9] flex flex-col items-center justify-center text-center p-6">
                <div className="bg-white p-10 rounded-3xl shadow-2xl max-w-md">
                    <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 text-[#4A90E2]">
                        <ShoppingBagIcon />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-800 mb-3">Member Exclusive</h1>
                    <p className="text-gray-500 mb-8">Login to see personalized shopping recommendations tailored specifically for your pet's breed and age.</p>
                    <Link href="/Login" className="bg-[#4A90E2] text-white px-8 py-3 rounded-xl font-bold hover:bg-[#3A75B9] transition-all shadow-lg">
                        Login Now
                    </Link>
                </div>
            </div>
        );
    }

    const selectedPet = myPets.find(p => p._id === selectedPetId);

    return (
        <div className="min-h-screen bg-[#F4F7F9] p-4 md:p-8 pb-20">
            <div className="max-w-7xl mx-auto">

                {/* --- HEADER --- */}
                <div className="flex flex-col md:flex-row justify-between items-end mb-10 gap-6">
                    <div>
                        <h1 className="text-4xl font-extrabold text-[#333333] flex items-center gap-3">
                            Marketplace
                        </h1>
                        <p className="text-gray-500 mt-2 font-medium">Curated essentials for your furry family members.</p>
                    </div>
                </div>

                {/* --- PET SELECTOR --- */}
                {myPets.length > 0 && (
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-8 overflow-x-auto">
                        <div className="flex items-center gap-4 min-w-max">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mr-2">Shop For:</span>
                            {myPets.map(pet => (
                                <button
                                    key={pet._id}
                                    onClick={() => setSelectedPetId(pet._id)}
                                    className={`flex items-center gap-3 p-2 pr-4 rounded-full transition-all border-2 ${selectedPetId === pet._id
                                        ? "border-[#4A90E2] bg-blue-50 shadow-sm"
                                        : "border-transparent hover:bg-gray-50"
                                        }`}
                                >
                                    <div className="relative w-10 h-10">
                                        <Image
                                            src={pet.imageUrls?.[0] || "/imgs/dog.jpg"}
                                            alt={pet.name}
                                            fill
                                            className="rounded-full object-cover border border-gray-200"
                                        />
                                    </div>
                                    <span className={`font-bold text-sm ${selectedPetId === pet._id ? "text-[#4A90E2]" : "text-gray-600"}`}>
                                        {pet.name}
                                    </span>
                                </button>
                            ))}
                            <Link href="/Addpet" className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:bg-[#4A90E2] hover:text-white transition-colors border-2 border-dashed border-gray-300 hover:border-transparent">
                                <span className="text-xl leading-none pb-1">+</span>
                            </Link>
                        </div>
                    </div>
                )}

                {/* --- CONTENT --- */}
                {!selectedPet ? (
                    <div className="text-center py-20 text-gray-500">
                        <p>No pets found. <Link href="/Addpet" className="text-[#4A90E2] font-bold hover:underline">Add a pet</Link> to start shopping.</p>
                    </div>
                ) : !selectedPet.aiProfileString ? (
                    <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-3xl p-10 text-white text-center shadow-xl relative overflow-hidden">
                        <div className="relative z-10 max-w-2xl mx-auto">
                            <h2 className="text-3xl font-bold mb-4">Unlock Personal Shopper 🛍️</h2>
                            <p className="text-blue-100 mb-8 text-lg">
                                We don't know enough about <strong>{selectedPet.name}</strong> yet! Create an AI Personality Profile to get highly accurate food, toy, and gear recommendations.
                            </p>
                            <Link
                                href={`/add-pet-profile/${selectedPetId}`}
                                className="bg-white text-blue-600 px-8 py-4 rounded-xl font-bold shadow-lg hover:scale-105 transition-transform inline-flex items-center gap-2"
                            >
                                <SparklesIcon /> Create Profile
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div>
                        {/* Categories */}
                        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
                            {["All", "Nutrition", "Toys & Gear"].map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setActiveCategory(cat)}
                                    className={`px-5 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${activeCategory === cat
                                        ? "bg-[#333333] text-white shadow-md"
                                        : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                                        }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>

                        {/* Grid */}
                        {recLoading ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                {[...Array(8)].map((_, i) => <ProductSkeleton key={i} />)}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                {filteredProducts.map((item, idx) => (
                                    <div key={idx} className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:border-[#4A90E2]/30 transition-all duration-300 flex flex-col overflow-hidden relative h-full">

                                        {/* Image */}
                                        <div className="h-56 p-6 bg-white flex items-center justify-center relative group-hover:bg-gray-50 transition-colors">
                                            <div className="absolute top-3 left-3 flex gap-2">
                                                <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wide text-white shadow-sm ${item.category === 'Food' ? 'bg-green-500' : 'bg-purple-500'
                                                    }`}>
                                                    {item.category === 'Food' ? 'Nutrition' : 'Gear'}
                                                </span>
                                                {item.isScraped && (
                                                    <span className="text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wide text-white shadow-sm bg-blue-600">
                                                        Real Deal
                                                    </span>
                                                )}
                                            </div>

                                            {/* Using standard img for faster external loading without optimization overhead */}
                                            <img
                                                src={item.imageUrl}
                                                alt={item.title}
                                                className="max-h-full max-w-full object-contain mix-blend-multiply transition-transform duration-500 group-hover:scale-110"
                                                loading="lazy"
                                            />
                                        </div>

                                        {/* Content */}
                                        <div className="p-5 flex flex-col flex-1 bg-white">
                                            <h3 className="font-bold text-gray-800 text-sm mb-3 leading-relaxed line-clamp-2" title={item.title}>
                                                {item.title}
                                            </h3>

                                            <div className="mt-auto pt-4 border-t border-gray-50">
                                                <div className="flex justify-between items-baseline mb-4">
                                                    <span className="text-xs text-gray-400 font-medium">
                                                        {item.isScraped ? "Best Price" : "Est. Price"}
                                                    </span>
                                                    <span className="text-xl font-extrabold text-[#333333]">{item.price}</span>
                                                </div>

                                                {item.isScraped ? (
                                                    <a
                                                        href={item.productUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className={`flex items-center justify-center gap-2 text-white text-sm font-bold py-3 rounded-xl transition-all shadow-md hover:shadow-lg ${item.source === 'Flipkart' ? 'bg-[#2874F0] hover:bg-[#1e60c9]' : 'bg-[#FF9900] hover:bg-[#e88b00]'
                                                            }`}
                                                    >
                                                        Buy on {item.source}
                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                                                        </svg>
                                                    </a>
                                                ) : (
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <a
                                                            href={`https://www.amazon.in/s?k=${encodeURIComponent(item.query)}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center justify-center gap-1 bg-[#FF9900]/10 text-[#FF9900] hover:bg-[#FF9900] hover:text-white text-xs font-bold py-2.5 rounded-xl transition-all"
                                                        >
                                                            Amazon
                                                        </a>
                                                        <a
                                                            href={`https://www.flipkart.com/search?q=${encodeURIComponent(item.query)}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center justify-center gap-1 bg-[#2874F0]/10 text-[#2874F0] hover:bg-[#2874F0] hover:text-white text-xs font-bold py-2.5 rounded-xl transition-all"
                                                        >
                                                            Flipkart
                                                        </a>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {!recLoading && filteredProducts.length === 0 && (
                            <div className="text-center py-20">
                                <p className="text-gray-400 font-medium">No products found in this category.</p>
                                <button onClick={() => setActiveCategory("All")} className="text-[#4A90E2] font-bold text-sm mt-2 hover:underline">
                                    View All Items
                                </button>
                            </div>
                        )}
                    </div>
                )}

            </div>
        </div>
    );
}
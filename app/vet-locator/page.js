// app/vet-locator/page.js
"use client";
import { useState, useEffect } from "react";
import { useAuth } from "../auth-provider";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Image from "next/image";

// --- Dynamically Import the Map Component ---
const VetMap = dynamic(() => import("../components/VetMap"), { 
    ssr: false,
    loading: () => (
        <div className="flex flex-col items-center justify-center h-full bg-white/50 backdrop-blur-sm rounded-[2rem] border border-white/60">
            <div className="w-10 h-10 border-4 border-[#4A90E2] border-t-transparent rounded-full animate-spin mb-2"></div>
            <span className="text-[#4A90E2] font-bold text-sm">Loading Map...</span>
        </div>
    )
});

// --- ICONS ---
const ListIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>;
const MapIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" /></svg>;
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>;
const LocationIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>;

export default function VetLocatorPage() {
  const { user, userData, loading: authLoading } = useAuth();
  const [radius, setRadius] = useState(5); 
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [coords, setCoords] = useState(null);
  const [usingLiveLocation, setUsingLiveLocation] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState(null);
  
  // --- NEW: View Mode for Mobile (List vs Map) ---
  const [mobileView, setMobileView] = useState("list"); // 'list' or 'map'

  const router = useRouter();

  // 1. Initial Load & Location Setup
  useEffect(() => {
    if (!authLoading && !user) {
        router.push("/Login");
        return;
    }

    if (!coords && userData?.location?.coordinates) {
        const [lng, lat] = userData.location.coordinates;
        if (lat !== 0 && lng !== 0) {
            setCoords({ lat, lng });
        } else {
            setCoords({ lat: 20.5937, lng: 78.9629 }); // Default fallback
        }
    }
  }, [user, userData, authLoading, router, coords]);

  // 2. Fetch Vets when coords/radius change
  useEffect(() => {
    if (!coords) return;
    const timer = setTimeout(() => { fetchVets(); }, 800);
    return () => clearTimeout(timer);
  }, [coords, radius]);

  const fetchVets = async () => {
    setLoading(true);
    try {
        const res = await fetch("/api/find-vets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lat: coords.lat, lng: coords.lng, radius: radius })
        });
        const data = await res.json();
        
        if (data.warning) {
            alert(data.warning); // Show upstream warning if exists
        }
        
        if (res.ok) {
            setHospitals(data.hospitals || []);
        }
    } catch (err) {
        console.error(err);
        alert("Failed to load map data. Please check your connection.");
    } finally {
        setLoading(false);
    }
  };

  // ... (lines 81-190 remain matched by context if I don't touch them, but to be safe I will just target the list area in a separate block if possible, but replace_file_content is better with contiguous blocks. I will assume the user wants me to replace the list rendering logic.)

  // Actually, I will just replace the whole file content for the List Panel section to ensure it matches perfectly.
  // Wait, I can't replace lines 64-236 in one go if there are unchanged lines in between that I want to keep (like handleHospitalClick).
  // I'll stick to a multi-chunk approach or just replace the specific render block. 
  // Let's replace the `fetchVets` first, and then the List rendering.


  // 3. Handle Interactions
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) return alert("Geolocation is not supported");
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const { latitude, longitude } = position.coords;
            setCoords({ lat: latitude, lng: longitude });
            setUsingLiveLocation(true);
            setLoading(false);
        },
        (error) => {
            console.error(error);
            alert("Unable to retrieve location.");
            setLoading(false);
        }
    );
  };

  const handleHospitalClick = (vet) => {
      setSelectedHospital(vet);
      // On Mobile, if user clicks a list item, switch to map view immediately
      if (window.innerWidth < 768) {
          setMobileView("map");
      }
  };

  if (authLoading || !coords) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#E2F4EF]">
            <div className="w-16 h-16 border-4 border-[#4A90E2] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[#4A90E2] font-bold mt-4 animate-pulse">Locating Clinics...</p>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#E2F4EF] relative overflow-hidden">
      
      {/* Background Animation (Matches other pages) */}
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

      <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 pt-24 md:pt-28 pb-24 h-screen flex flex-col">
        
        {/* --- HEADER --- */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-6 gap-4 shrink-0">
            <div>
                <span className="inline-block py-1 px-3 rounded-full bg-white/60 border border-white shadow-sm text-[#4A90E2] text-xs font-bold uppercase tracking-wider mb-2 backdrop-blur-md">
                    Emergency & Care
                </span>
                <h1 className="text-3xl md:text-4xl font-extrabold text-[#333333] tracking-tight">
                    Vet Locator <span className="text-[#4A90E2]">Nearby</span>
                </h1>
            </div>

            {/* Controls */}
            <div className="bg-white/80 backdrop-blur-md p-2 rounded-2xl shadow-lg border border-white flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                <button 
                    onClick={handleUseCurrentLocation} 
                    className="flex items-center justify-center gap-2 bg-[#4A90E2] text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-md hover:bg-[#3A75B9] transition-all active:scale-95 w-full sm:w-auto"
                >
                    <LocationIcon /> Use GPS
                </button>
                
                <div className="flex items-center gap-3 px-3 py-1 w-full sm:w-auto bg-gray-50 rounded-xl border border-gray-100">
                    <span className="text-xs font-bold text-gray-400 uppercase">Radius</span>
                    <input 
                        type="range" 
                        min="1" 
                        max="50" 
                        value={radius} 
                        onChange={(e) => setRadius(e.target.value)} 
                        className="w-full md:w-32 h-1.5 bg-gray-200 rounded-lg cursor-pointer accent-[#4A90E2]" 
                    />
                    <span className="text-xs font-bold text-[#4A90E2] min-w-[40px] text-right">{radius}km</span>
                </div>
            </div>
        </div>

        {/* --- MAIN CONTENT (Grid Layout) --- */}
        <div className="flex-1 bg-white/60 backdrop-blur-md rounded-[2.5rem] shadow-xl border border-white overflow-hidden flex relative">
            
            {/* 1. LIST PANEL (Visible on Desktop, Toggled on Mobile) */}
            <div className={`
                md:w-1/3 lg:w-1/4 h-full flex flex-col border-r border-white/50 bg-white/40
                absolute md:relative w-full z-20 transition-transform duration-300 ease-in-out
                ${mobileView === 'list' ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            `}>
                {/* List Header */}
                <div className="p-5 border-b border-white/50 bg-white/40 backdrop-blur-md sticky top-0 z-10 flex justify-between items-center">
                    <h3 className="font-bold text-gray-700 flex items-center gap-2">
                        <SearchIcon /> Results
                    </h3>
                    <span className="bg-[#4A90E2]/10 text-[#4A90E2] px-3 py-1 rounded-full text-xs font-bold">
                        {loading ? "..." : `${hospitals.length} Found`}
                    </span>
                </div>

                {/* List Items */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-40 text-gray-400 gap-2">
                            <div className="w-8 h-8 border-4 border-[#4A90E2] border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-xs font-bold text-[#4A90E2] animate-pulse">Scanning {radius}km Radius...</p>
                        </div>
                    ) : hospitals.length === 0 ? (
                        <div className="text-center py-10 px-4 flex flex-col items-center">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-3xl mb-3">🔭</div>
                            <p className="text-gray-600 font-bold text-sm">No clinics found nearby.</p>
                            <p className="text-xs text-gray-400 mt-1 max-w-[200px] mx-auto">Try increasing the search radius using the slider above.</p>
                            <button 
                                onClick={() => setRadius(r => Math.min(parseInt(r) + 10, 50))}
                                className="mt-4 px-4 py-2 bg-[#4A90E2]/10 text-[#4A90E2] rounded-lg text-xs font-bold hover:bg-[#4A90E2] hover:text-white transition"
                            >
                                +10km Radius
                            </button>
                        </div>
                    ) : (
                        hospitals.map((vet) => (
                            <div 
                                key={vet.id} 
                                onClick={() => handleHospitalClick(vet)}
                                className={`
                                    group cursor-pointer p-4 rounded-2xl border transition-all duration-300 relative overflow-hidden
                                    ${selectedHospital?.id === vet.id 
                                        ? 'bg-white border-[#4A90E2] shadow-md ring-1 ring-[#4A90E2]/20' 
                                        : 'bg-white/70 border-white hover:border-[#4A90E2]/50 hover:shadow-sm'}
                                `}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <h4 className="font-bold text-gray-800 text-sm leading-tight pr-2">{vet.name}</h4>
                                    {vet.emergency && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold animate-pulse">24/7</span>}
                                </div>
                                
                                <p className="text-xs text-gray-500 mt-1 leading-relaxed line-clamp-2">{vet.address}</p>
                                
                                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100">
                                    {/* Call Button */}
                                    {vet.phone && vet.phone !== "No Phone" && (
                                        <a 
                                            href={`tel:${vet.phone}`}
                                            onClick={(e) => e.stopPropagation()}
                                            className="flex-1 py-2 bg-green-50 text-green-600 rounded-lg text-xs font-bold flex items-center justify-center gap-1 hover:bg-green-100 transition"
                                        >
                                            📞 Call
                                        </a>
                                    )}
                                    
                                    {/* Directions Button */}
                                    <a 
                                        href={`https://www.google.com/maps/dir/?api=1&destination=${vet.lat},${vet.lng}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="flex-1 py-2 bg-blue-50 text-[#4A90E2] rounded-lg text-xs font-bold flex items-center justify-center gap-1 hover:bg-[#4A90E2] hover:text-white transition"
                                    >
                                        📍 Directions
                                    </a>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* 2. MAP PANEL (Visible on Desktop, Toggled on Mobile) */}
            <div className={`
                flex-1 h-full relative bg-gray-100
                absolute md:relative w-full z-10 transition-transform duration-300 ease-in-out
                ${mobileView === 'map' ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
            `}>
                <VetMap 
                    coords={coords} 
                    radius={radius} 
                    hospitals={hospitals} 
                    userDataName={userData?.name} 
                    usingLiveLocation={usingLiveLocation}
                    selectedHospital={selectedHospital}
                />
                
                {/* Loading Overlay for Map */}
                {loading && (
                    <div className="absolute inset-0 bg-white/30 backdrop-blur-sm z-[500] flex items-center justify-center">
                        <div className="bg-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-pulse">
                            <div className="w-4 h-4 border-2 border-[#4A90E2] border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-xs font-bold text-[#4A90E2]">Updating Map...</span>
                        </div>
                    </div>
                )}
            </div>

        </div>

        {/* --- MOBILE TOGGLE BAR (Sticky Bottom) --- */}
        <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white/90 backdrop-blur-xl border border-white/50 shadow-2xl rounded-full p-1.5 flex items-center gap-1">
            <button
                onClick={() => setMobileView("list")}
                className={`flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold transition-all shadow-sm ${
                    mobileView === "list" 
                    ? "bg-[#333333] text-white" 
                    : "text-gray-500 hover:bg-gray-100"
                }`}
            >
                <ListIcon /> List
            </button>
            <button
                onClick={() => setMobileView("map")}
                className={`flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold transition-all shadow-sm ${
                    mobileView === "map" 
                    ? "bg-[#4A90E2] text-white" 
                    : "text-gray-500 hover:bg-gray-100"
                }`}
            >
                <MapIcon /> Map
            </button>
        </div>

      </div>
    </div>
  );
}
// app/vet-locator/page.js
"use client";
import { useState, useEffect } from "react";
import { useAuth } from "../auth-provider";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic"; // Import dynamic

// --- Dynamically Import the Map Component ---
// This prevents "window is not defined" errors during build
const VetMap = dynamic(() => import("../components/VetMap"), { 
    ssr: false,
    loading: () => <div className="flex items-center justify-center h-full bg-gray-100 text-gray-500">Loading Map...</div>
});

export default function VetLocatorPage() {
  const { user, userData, loading: authLoading } = useAuth();
  const [radius, setRadius] = useState(5); 
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [coords, setCoords] = useState(null);
  const [usingLiveLocation, setUsingLiveLocation] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState(null); // New state to trigger map interactions
  const router = useRouter();

  // 1. Initial Load
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
            // Default to India Center if no location
            setCoords({ lat: 20.5937, lng: 78.9629 }); 
        }
    }
  }, [user, userData, authLoading, router, coords]);

  // 2. Fetch Vets
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
        if (res.ok) setHospitals(data.hospitals);
    } catch (err) {
        console.error(err);
    } finally {
        setLoading(false);
    }
  };

  // 3. Current Location Handler
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
            console.error("Error getting location:", error.message);
            alert("Unable to retrieve location.");
            setLoading(false);
        }
    );
  };

  // 4. Handle Click on List
  const handleHospitalClick = (vet) => {
      setSelectedHospital(vet); // Triggers effect inside VetMap
  };

  if (authLoading || !coords) {
    return <div className="flex justify-center items-center min-h-screen text-[#4A90E2] font-bold">Loading Locator...</div>;
  }

  return (
    <div className="min-h-screen bg-[#F4F7F9] flex flex-col">
        {/* Header */}
        <div className="bg-white p-4 shadow-md z-10 border-b border-gray-200">
            <div className="max-w-7xl mx-auto flex flex-col lg:flex-row justify-between items-center gap-4">
                <div className="text-center lg:text-left">
                    <h1 className="text-2xl font-extrabold text-[#333333]">🏥 Vet Locator</h1>
                    <p className="text-sm text-gray-500">
                        Searching near: <span className="font-bold text-[#4A90E2]">{usingLiveLocation ? "Live Location" : "Map Center"}</span>
                    </p>
                </div>
                <div className="flex flex-col md:flex-row items-center gap-4 w-full lg:w-auto">
                    <button onClick={handleUseCurrentLocation} className="flex items-center gap-2 bg-blue-50 text-[#4A90E2] border border-[#4A90E2] px-4 py-2 rounded-xl font-bold text-sm hover:bg-[#4A90E2] hover:text-white transition-colors shadow-sm">
                        📍 Use Current Location
                    </button>
                    <div className="flex items-center gap-3 bg-gray-50 p-2 px-4 rounded-xl border border-gray-200 w-full md:w-auto">
                        <label className="font-bold text-gray-700 whitespace-nowrap text-sm">Radius:</label>
                        <input type="range" min="1" max="50" value={radius} onChange={(e) => setRadius(e.target.value)} className="w-full md:w-32 h-2 bg-gray-300 rounded-lg cursor-pointer accent-[#4A90E2]" />
                        <span className="font-bold text-[#4A90E2] min-w-[50px] text-right text-sm">{radius} km</span>
                    </div>
                </div>
            </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col md:flex-row relative overflow-hidden">
            {/* Left List */}
            <div className="w-full md:w-1/3 lg:w-1/4 bg-white overflow-y-auto border-r border-gray-200 p-4 h-[40vh] md:h-auto shadow-lg z-10">
                <h3 className="font-bold text-gray-700 mb-4 sticky top-0 bg-white py-2 border-b flex justify-between">
                    <span>Results</span>
                    <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md text-xs">{loading ? "..." : hospitals.length} Found</span>
                </h3>
                <div className="space-y-3 pb-4">
                    {hospitals.map((vet) => (
                        <div key={vet.id} onClick={() => handleHospitalClick(vet)} className="cursor-pointer p-4 border border-gray-100 rounded-xl shadow-sm hover:shadow-md hover:border-[#4A90E2] hover:bg-blue-50/30 transition-all bg-white group relative overflow-hidden">
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-transparent group-hover:bg-[#4A90E2] transition-colors"></div>
                            <h4 className="font-bold text-[#333333] text-sm group-hover:text-[#4A90E2] transition-colors pr-4">{vet.name}</h4>
                            <p className="text-xs text-gray-500 mt-1 leading-relaxed">📍 {vet.address}</p>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {vet.phone !== "N/A" && <span className="text-[10px] bg-green-50 text-green-700 px-2 py-0.5 rounded border border-green-100 font-semibold">📞 {vet.phone}</span>}
                                <span className="text-[10px] text-[#4A90E2] font-bold ml-auto opacity-0 group-hover:opacity-100 transition-opacity">View on Map →</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right Map (Dynamic) */}
            <div className="flex-1 relative h-[60vh] md:h-auto bg-gray-200">
                <VetMap 
                    coords={coords} 
                    radius={radius} 
                    hospitals={hospitals} 
                    userDataName={userData?.name} 
                    usingLiveLocation={usingLiveLocation}
                    selectedHospital={selectedHospital}
                />
                
                {loading && (
                    <div className="absolute top-4 right-4 bg-white px-4 py-2 rounded-full shadow-xl z-[1000] flex items-center gap-3 border border-gray-100">
                        <div className="w-4 h-4 border-2 border-[#4A90E2] border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-xs font-bold text-gray-700">Finding Vets...</span>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
}
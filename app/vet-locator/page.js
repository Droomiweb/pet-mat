// app/vet-locator/page.js
"use client";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "../auth-provider";
import { useRouter } from "next/navigation";
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// --- Fix for default Leaflet icons in Next.js ---
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

// Custom Icon for Vets (Red)
const vetIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Custom Icon for User (Blue/Default)
const userIcon = new L.Icon({
    iconRetinaUrl: iconRetinaUrl.src,
    iconUrl: iconUrl.src,
    shadowUrl: shadowUrl.src,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

export default function VetLocatorPage() {
  const { user, userData, loading: authLoading } = useAuth();
  const [radius, setRadius] = useState(5); // Default 5km
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [coords, setCoords] = useState(null);
  const [usingLiveLocation, setUsingLiveLocation] = useState(false);
  const router = useRouter();
  
  // --- REFS to control Map and Markers ---
  const mapRef = useRef(null); 
  const markerRefs = useRef({}); 

  // 1. Initial Load: Get User Location from DB or Default
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
            // FIX: Default to Center of India instead of forcing error
            // You can change this to any default lat/lng you prefer
            setCoords({ lat: 20.5937, lng: 78.9629 }); 
        }
    }
  }, [user, userData, authLoading, router, coords]);

  // 2. Fetch Hospitals when Coords or Radius changes
  useEffect(() => {
    if (!coords) return;

    // Debounce to prevent API spam
    const timer = setTimeout(() => {
        fetchVets();
    }, 800);

    return () => clearTimeout(timer);
  }, [coords, radius]);

  const fetchVets = async () => {
    setLoading(true);
    markerRefs.current = {}; // Reset refs
    try {
        const res = await fetch("/api/find-vets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                lat: coords.lat, 
                lng: coords.lng, 
                radius: radius 
            })
        });
        
        const data = await res.json();
        if (res.ok) {
            setHospitals(data.hospitals);
        }
    } catch (err) {
        console.error(err);
    } finally {
        setLoading(false);
    }
  };

  // --- 3. Handle "Use Current Location" Button ---
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
        alert("Geolocation is not supported by your browser");
        return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const { latitude, longitude } = position.coords;
            setCoords({ lat: latitude, lng: longitude });
            setUsingLiveLocation(true);
            
            if (mapRef.current) {
                mapRef.current.flyTo([latitude, longitude], 13, { animate: true, duration: 1.5 });
            }
            setLoading(false);
        },
        (error) => {
            console.error("Error getting location:", error.message); // Improved logging
            alert("Unable to retrieve location. Please allow location access in your browser settings.");
            setLoading(false);
        }
    );
  };

  // --- 4. NEW: Handle Clicking a List Item ---
  const handleHospitalClick = (vet) => {
    // Fly the map to the vet
    if (mapRef.current) {
        mapRef.current.flyTo([vet.lat, vet.lng], 16, {
            animate: true,
            duration: 1.2 
        });
    }
    
    // Open the specific marker popup
    const marker = markerRefs.current[vet.id];
    if (marker) {
        marker.openPopup();
    }
  };

  if (authLoading || !coords) {
    return <div className="flex justify-center items-center min-h-screen text-[#4A90E2] font-bold">Loading Locator...</div>;
  }

  return (
    <div className="min-h-screen bg-[#F4F7F9] flex flex-col">
        
        {/* Header Controls */}
        <div className="bg-white p-4 shadow-md z-10 border-b border-gray-200">
            <div className="max-w-7xl mx-auto flex flex-col lg:flex-row justify-between items-center gap-4">
                <div className="text-center lg:text-left">
                    <h1 className="text-2xl font-extrabold text-[#333333]">🏥 Vet Locator</h1>
                    <p className="text-sm text-gray-500">
                        Searching near: <span className="font-bold text-[#4A90E2]">{usingLiveLocation ? "Live Location" : "Map Center"}</span>
                    </p>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-4 w-full lg:w-auto">
                    <button 
                        onClick={handleUseCurrentLocation}
                        className="flex items-center gap-2 bg-blue-50 text-[#4A90E2] border border-[#4A90E2] px-4 py-2 rounded-xl font-bold text-sm hover:bg-[#4A90E2] hover:text-white transition-colors shadow-sm"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Use Current Location
                    </button>

                    <div className="flex items-center gap-3 bg-gray-50 p-2 px-4 rounded-xl border border-gray-200 w-full md:w-auto">
                        <label className="font-bold text-gray-700 whitespace-nowrap text-sm">Radius:</label>
                        <input 
                            type="range" 
                            min="1" 
                            max="50" 
                            value={radius} 
                            onChange={(e) => setRadius(e.target.value)}
                            className="w-full md:w-32 h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-[#4A90E2]"
                        />
                        <span className="font-bold text-[#4A90E2] min-w-[50px] text-right text-sm">{radius} km</span>
                    </div>
                </div>
            </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col md:flex-row relative overflow-hidden">
            
            {/* LEFT: Hospital List (Now Clickable!) */}
            <div className="w-full md:w-1/3 lg:w-1/4 bg-white overflow-y-auto border-r border-gray-200 p-4 h-[40vh] md:h-auto shadow-lg z-10">
                <h3 className="font-bold text-gray-700 mb-4 sticky top-0 bg-white py-2 border-b flex justify-between items-center">
                    <span>Results</span>
                    <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md text-xs">
                        {loading ? "..." : hospitals.length} Found
                    </span>
                </h3>
                
                <div className="space-y-3 pb-4">
                    {hospitals.length === 0 && !loading && (
                        <div className="text-center py-10">
                            <p className="text-4xl mb-2">🔭</p>
                            <p className="text-gray-500 text-sm">No vets found here.<br/>Try increasing the radius.</p>
                        </div>
                    )}
                    
                    {hospitals.map((vet) => (
                        <div 
                            key={vet.id} 
                            onClick={() => handleHospitalClick(vet)} // <--- CLICK EVENT
                            className="cursor-pointer p-4 border border-gray-100 rounded-xl shadow-sm hover:shadow-md hover:border-[#4A90E2] hover:bg-blue-50/30 transition-all bg-white group relative overflow-hidden"
                        >
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-transparent group-hover:bg-[#4A90E2] transition-colors"></div>
                            <h4 className="font-bold text-[#333333] text-sm group-hover:text-[#4A90E2] transition-colors pr-4">{vet.name}</h4>
                            <p className="text-xs text-gray-500 mt-1 leading-relaxed">📍 {vet.address}</p>
                            
                            <div className="flex flex-wrap gap-2 mt-2">
                                {vet.phone !== "N/A" && (
                                    <span className="text-[10px] bg-green-50 text-green-700 px-2 py-0.5 rounded border border-green-100 font-semibold">
                                        📞 {vet.phone}
                                    </span>
                                )}
                                <span className="text-[10px] text-[#4A90E2] font-bold ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                                    View on Map →
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* RIGHT: Interactive Map */}
            <div className="flex-1 relative h-[60vh] md:h-auto bg-gray-200">
                <MapContainer 
                    center={[coords.lat, coords.lng]} 
                    zoom={13} 
                    style={{ height: "100%", width: "100%" }}
                    ref={mapRef}
                >
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='© OpenStreetMap contributors'
                    />

                    {/* User Location Marker */}
                    <Marker position={[coords.lat, coords.lng]} icon={userIcon}>
                        <Popup>
                            <div className="text-center">
                                <strong>You are here</strong><br/>
                                <span className="text-xs text-gray-500">Search Center</span>
                            </div>
                        </Popup>
                    </Marker>

                    <Circle 
                        center={[coords.lat, coords.lng]}
                        radius={radius * 1000}
                        pathOptions={{ color: '#4A90E2', fillColor: '#4A90E2', fillOpacity: 0.1, weight: 1 }}
                    />

                    {/* Hospital Markers */}
                    {hospitals.map((vet) => (
                        <Marker 
                            key={vet.id} 
                            position={[vet.lat, vet.lng]} 
                            icon={vetIcon}
                            ref={(el) => (markerRefs.current[vet.id] = el)} // <--- REF STORED HERE
                        >
                            <Popup>
                                <div className="min-w-[180px] text-center">
                                    <h4 className="font-bold text-sm text-gray-800 mb-1">{vet.name}</h4>
                                    <hr className="border-gray-200 my-2"/>
                                    <p className="text-xs text-gray-600 mb-2 text-left">{vet.address}</p>
                                    {vet.phone !== "N/A" && <p className="text-xs font-semibold text-green-600 mb-2">📞 {vet.phone}</p>}
                                    
                                    <a 
                                        href={`https://www.google.com/maps/dir/?api=1&destination=${vet.lat},${vet.lng}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block w-full text-center bg-[#4A90E2] text-white text-xs py-2 rounded-md font-bold hover:bg-[#3A75B9] transition-colors shadow-sm mt-2"
                                    >
                                        📍 Get Directions
                                    </a>
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                </MapContainer>
                
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
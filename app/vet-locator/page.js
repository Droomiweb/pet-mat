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
  const router = useRouter();
  const mapRef = useRef(null);

  // 1. Get User Location from DB (userData)
  useEffect(() => {
    if (!authLoading && !user) {
        router.push("/Login");
        return;
    }

    if (userData?.location?.coordinates) {
        // MongoDB stores as [lng, lat], Leaflet needs [lat, lng]
        const [lng, lat] = userData.location.coordinates;
        
        if (lat !== 0 && lng !== 0) {
            setCoords({ lat, lng });
        } else {
            // Fallback to browser geolocation if DB is 0,0
            navigator.geolocation.getCurrentPosition((pos) => {
                setCoords({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude
                });
            }, (err) => alert("Could not determine location. Please update your profile."));
        }
    }
  }, [user, userData, authLoading, router]);

  // 2. Fetch Hospitals when Coords or Radius changes
  useEffect(() => {
    if (!coords) return;

    // Debounce the API call to avoid spamming while sliding
    const timer = setTimeout(() => {
        fetchVets();
    }, 500);

    return () => clearTimeout(timer);
  }, [coords, radius]);

  const fetchVets = async () => {
    setLoading(true);
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

  if (authLoading || !coords) {
    return <div className="flex justify-center items-center min-h-screen text-[#4A90E2] font-bold">Loading Location...</div>;
  }

  return (
    <div className="min-h-screen bg-[#F4F7F9] flex flex-col">
        
        {/* Controls Header */}
        <div className="bg-white p-4 shadow-md z-10 border-b border-gray-200">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold text-[#333333]">🏥 Vet Locator</h1>
                    <p className="text-sm text-gray-500">Find help near your stored location</p>
                </div>

                <div className="flex items-center gap-4 bg-gray-50 p-3 rounded-xl border border-gray-200 w-full md:w-auto">
                    <label className="font-bold text-gray-700 whitespace-nowrap">Search Radius:</label>
                    <input 
                        type="range" 
                        min="1" 
                        max="50" 
                        value={radius} 
                        onChange={(e) => setRadius(e.target.value)}
                        className="w-full md:w-48 h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-[#4A90E2]"
                    />
                    <span className="font-bold text-[#4A90E2] min-w-[60px] text-right">{radius} km</span>
                </div>
            </div>
        </div>

        {/* Main Content Split */}
        <div className="flex-1 flex flex-col md:flex-row relative overflow-hidden">
            
            {/* Left: Hospital List */}
            <div className="w-full md:w-1/3 lg:w-1/4 bg-white overflow-y-auto border-r border-gray-200 p-4 h-[40vh] md:h-auto">
                <h3 className="font-bold text-gray-700 mb-4 sticky top-0 bg-white py-2 border-b">
                    {loading ? "Searching..." : `${hospitals.length} Vets Found`}
                </h3>
                
                <div className="space-y-3">
                    {hospitals.length === 0 && !loading && (
                        <p className="text-gray-500 text-center py-10">No hospitals found in this range. Try increasing the radius.</p>
                    )}
                    
                    {hospitals.map((vet) => (
                        <div key={vet.id} className="p-4 border border-gray-100 rounded-xl shadow-sm hover:shadow-md hover:border-[#4A90E2] transition-all bg-gray-50">
                            <h4 className="font-bold text-[#333333]">{vet.name}</h4>
                            <p className="text-xs text-gray-500 mt-1">📍 {vet.address}</p>
                            {vet.phone !== "N/A" && (
                                <p className="text-xs text-green-600 font-semibold mt-2">📞 {vet.phone}</p>
                            )}
                            {vet.opening_hours && (
                                <p className="text-[10px] text-gray-400 mt-1">🕒 {vet.opening_hours}</p>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Right: Map */}
            <div className="flex-1 relative h-[60vh] md:h-auto bg-gray-200">
                <MapContainer 
                    center={[coords.lat, coords.lng]} 
                    zoom={13} 
                    style={{ height: "100%", width: "100%" }}
                    ref={mapRef}
                >
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; OpenStreetMap contributors'
                    />

                    {/* User Location */}
                    <Marker position={[coords.lat, coords.lng]} icon={userIcon}>
                        <Popup>
                            <strong>You are here</strong><br/>
                            {userData?.name}'s Location
                        </Popup>
                    </Marker>

                    {/* Search Radius Circle */}
                    <Circle 
                        center={[coords.lat, coords.lng]}
                        radius={radius * 1000}
                        pathOptions={{ color: '#4A90E2', fillColor: '#4A90E2', fillOpacity: 0.1 }}
                    />

                    {/* Hospital Markers */}
                    {hospitals.map((vet) => (
                        <Marker 
                            key={vet.id} 
                            position={[vet.lat, vet.lng]} 
                            icon={vetIcon}
                        >
                            <Popup>
                                <div className="min-w-[150px]">
                                    <h4 className="font-bold text-sm">{vet.name}</h4>
                                    <p className="text-xs mt-1">{vet.address}</p>
                                    <a 
                                        href={`https://www.google.com/maps/dir/?api=1&destination=${vet.lat},${vet.lng}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block mt-2 text-center bg-[#4A90E2] text-white text-xs py-1 rounded font-bold"
                                    >
                                        Get Directions
                                    </a>
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                </MapContainer>
                
                {/* Loading Overlay for Map */}
                {loading && (
                    <div className="absolute top-4 right-4 bg-white px-4 py-2 rounded-full shadow-lg z-[1000] flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-[#4A90E2] border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-xs font-bold text-[#4A90E2]">Updating Map...</span>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
}
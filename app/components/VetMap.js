// app/components/VetMap.js
"use client";
import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// --- ICON ASSETS ---
// Fix for Next.js Leaflet asset loading issue
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

// 3. ICON DEFINITIONS
// Red Icon for Vets
const vetIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Blue Icon for User
const userIcon = new L.Icon({
    iconRetinaUrl: iconRetinaUrl.src,
    iconUrl: iconUrl.src,
    shadowUrl: shadowUrl.src,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

// 4. COMPONENT
export default function VetMap({ coords, radius, hospitals, userDataName, usingLiveLocation, selectedHospital }) {
    const mapRef = useRef(null); // Reference to the map instance
    const markerRefs = useRef({}); // Reference to store markers by ID

    // EFFECT: Fly to a specific hospital when clicked in the sidebar list
    useEffect(() => {
        if (selectedHospital && mapRef.current) {
            // Smooth animation to coordinates
            mapRef.current.flyTo([selectedHospital.lat, selectedHospital.lng], 16, {
                animate: true,
                duration: 1.2
            });

            // Programmatically open the popup bubble
            const marker = markerRefs.current[selectedHospital.id];
            if (marker) {
                marker.openPopup();
            }
        }
    }, [selectedHospital]);

    // EFFECT: Re-center map if user's location changes significantly
    useEffect(() => {
        if (coords && mapRef.current) {
             mapRef.current.flyTo([coords.lat, coords.lng], 13, { animate: true, duration: 1.5 });
        }
    }, [coords]);

    // Prevent rendering if we don't have a center point yet
    if (!coords) return null;

    return (
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

            {/* --- USER LOCATION MARKER --- */}
            <Marker position={[coords.lat, coords.lng]} icon={userIcon}>
                <Popup>
                    <div className="text-center">
                        <strong>You are here</strong><br/>
                        <span className="text-xs text-gray-500">
                            {usingLiveLocation ? "Live GPS Location" : `${userDataName || 'User'}'s Saved Location`}
                        </span>
                    </div>
                </Popup>
            </Marker>

            {/* --- RADIUS CIRCLE --- */}
            <Circle 
                center={[coords.lat, coords.lng]}
                radius={radius * 1000} // Convert km to meters
                pathOptions={{ color: '#4A90E2', fillColor: '#4A90E2', fillOpacity: 0.1, weight: 1 }}
            />

            {/* --- VET MARKERS --- */}
            {hospitals.map((vet) => (
                <Marker 
                    key={vet.id} 
                    position={[vet.lat, vet.lng]} 
                    icon={vetIcon}
                    ref={(el) => (markerRefs.current[vet.id] = el)} // Store ref for programmatic access
                >
                    <Popup>
                        <div className="min-w-[180px] text-center">
                            <h4 className="font-bold text-sm text-gray-800 mb-1">{vet.name}</h4>
                            <hr className="border-gray-200 my-2"/>
                            <p className="text-xs text-gray-600 mb-2 text-left">{vet.address}</p>
                            
                            {vet.phone !== "N/A" && (
                                <p className="text-xs font-semibold text-green-600 mb-2">📞 {vet.phone}</p>
                            )}
                            
                            {/* --- URL FIX --- */}
                            {/* Standard Google Maps Direction Intent */}
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
    );
}
// app/components/VetMap.js
"use client";
import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// --- Fix for default Leaflet icons ---
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

// Define Icons INSIDE the component or module scope (safe here because this file is client-only)
const vetIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const userIcon = new L.Icon({
    iconRetinaUrl: iconRetinaUrl.src,
    iconUrl: iconUrl.src,
    shadowUrl: shadowUrl.src,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

export default function VetMap({ coords, radius, hospitals, userDataName, usingLiveLocation, selectedHospital }) {
    const mapRef = useRef(null);
    const markerRefs = useRef({});

    // Handle Flying to Selected Hospital
    useEffect(() => {
        if (selectedHospital && mapRef.current) {
            // 1. Fly to location
            mapRef.current.flyTo([selectedHospital.lat, selectedHospital.lng], 16, {
                animate: true,
                duration: 1.2
            });

            // 2. Open Popup
            const marker = markerRefs.current[selectedHospital.id];
            if (marker) {
                marker.openPopup();
            }
        }
    }, [selectedHospital]);

    // Handle Flying to User Location when it changes
    useEffect(() => {
        if (coords && mapRef.current) {
             mapRef.current.flyTo([coords.lat, coords.lng], 13, { animate: true, duration: 1.5 });
        }
    }, [coords]);

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
                attribution='&copy; OpenStreetMap contributors'
            />

            {/* User Location */}
            <Marker position={[coords.lat, coords.lng]} icon={userIcon}>
                <Popup>
                    <div className="text-center">
                        <strong>You are here</strong><br/>
                        <span className="text-xs text-gray-500">
                            {usingLiveLocation ? "Live GPS Location" : `${userDataName}'s Saved Address`}
                        </span>
                    </div>
                </Popup>
            </Marker>

            {/* Search Radius Circle */}
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
                    ref={(el) => (markerRefs.current[vet.id] = el)}
                >
                    <Popup>
                        <div className="min-w-[180px] text-center">
                            <h4 className="font-bold text-sm text-gray-800 mb-1">{vet.name}</h4>
                            <hr className="border-gray-200 my-2"/>
                            <p className="text-xs text-gray-600 mb-2 text-left">{vet.address}</p>
                            {vet.phone !== "N/A" && <p className="text-xs font-semibold text-green-600 mb-2">📞 {vet.phone}</p>}
                            
                            <a 
                                href={`http://googleusercontent.com/maps.google.com/?q=${vet.lat},${vet.lng}`}
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
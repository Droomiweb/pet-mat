// app/components/MapDisplay.js
"use client";

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { useRouter } from 'next/navigation';

// Fix for default Leaflet icon not showing up in Next.js
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
    iconRetinaUrl: iconRetinaUrl.src,
    iconUrl: iconUrl.src,
    shadowUrl: shadowUrl.src,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;
// End of icon fix

export default function MapDisplay({ pets }) {
    const router = useRouter();

    // Default center (e.g., center of India)
    // In a real app, you'd get the *current user's* location
    const defaultCenter = [20.5937, 78.9629]; 

    // Filter pets that have valid coordinates
    const petsWithCoords = pets.filter(
        pet => pet.location?.coordinates && pet.location.coordinates.length === 2
    );

    // Use the first pet's location as the center, or default
    const mapCenter = petsWithCoords.length > 0 
        ? [petsWithCoords[0].location.coordinates[1], petsWithCoords[0].location.coordinates[0]] // [lat, lng]
        : defaultCenter;

    return (
        <MapContainer center={mapCenter} zoom={8} style={{ height: '100%', width: '100%' }}>
            <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            
            {petsWithCoords.map(pet => (
                <Marker 
                    key={pet._id}
                    // IMPORTANT: Leaflet uses [lat, lng], but we store as [lng, lat]
                    position={[pet.location.coordinates[1], pet.location.coordinates[0]]}
                >
                    <Popup>
                        <div className="w-40">
                            <img src={pet.imageUrls[0]} alt={pet.name} className="w-full h-24 object-cover rounded-md mb-2" />
                            <h3 className="font-bold text-lg">{pet.name}</h3>
                            <p className="text-sm">{pet.breed}</p>
                            <button 
                                onClick={() => router.push(`/pet/${pet._id}`)}
                                className="w-full mt-2 text-center bg-[#4A90E2] text-white text-sm font-semibold py-1 rounded-lg hover:bg-[#3A75B9]"
                            >
                                View Profile
                            </button>
                        </div>
                    </Popup>
                </Marker>
            ))}
        </MapContainer>
    );
}
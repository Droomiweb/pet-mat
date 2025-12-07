// app/components/MapDisplay.js

// 1. DIRECTIVE
// Leaflet relies heavily on the 'window' object, so it must run on the client side.
"use client";

// 2. IMPORTS
// We import the map components from the React wrapper for Leaflet.
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
// We need the core 'L' library to fix the icon issue manually.
import L from 'leaflet';
// Standard Next.js CSS import for Leaflet (must be imported globally or here)
import 'leaflet/dist/leaflet.css';
import { useRouter } from 'next/navigation';

// --- LEAFLET ICON FIX START ---
// By default, Leaflet's marker icons are broken in Next.js/Webpack builds.
// We import the image assets explicitly so Next.js handles the paths correctly.
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';
// --- LEAFLET ICON FIX END ---

export default function MapDisplay({ pets }) {
    const router = useRouter();

    // 3. ICON CONFIGURATION
    // We create a custom Icon object using the imported image sources (.src).
    // This overrides Leaflet's default logic which tries to guess the image path and fails.
    const DefaultIcon = L.icon({
        iconRetinaUrl: iconRetinaUrl.src,
        iconUrl: iconUrl.src,
        shadowUrl: shadowUrl.src,
        iconSize: [25, 41],      // Size of the icon
        iconAnchor: [12, 41],    // Point of the icon which corresponds to marker's location
        popupAnchor: [1, -34],   // Point from which the popup should open relative to the iconAnchor
        shadowSize: [41, 41],    // Size of the shadow
    });

    // 4. MAP CENTER LOGIC
    // Default fallback center (Center of India) if no pets have location data.
    const defaultCenter = [20.5937, 78.9629]; 

    // Filter out pets that don't have valid GeoJSON coordinates
    const petsWithCoords = pets.filter(
        pet => pet.location?.coordinates && pet.location.coordinates.length === 2
    );

    // If we have pets, center the map on the first one. Otherwise, use default.
    // Note: MongoDB stores [Lng, Lat], Leaflet needs [Lat, Lng].
    const mapCenter = petsWithCoords.length > 0 
        ? [petsWithCoords[0].location.coordinates[1], petsWithCoords[0].location.coordinates[0]] 
        : defaultCenter;

    // 5. RENDER MAP
    return (
        <MapContainer 
            center={mapCenter} 
            zoom={5} 
            scrollWheelZoom={false} // Disable scroll zoom so it doesn't trap the user while scrolling the page
            style={{ height: '100%', width: '100%', borderRadius: '1rem', zIndex: 0 }}
        >
            {/* The Map Tiles (The visual map images) - Using OpenStreetMap (Free) */}
            <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            
            {/* Render a Marker for each pet */}
            {petsWithCoords.map(pet => (
                <Marker 
                    key={pet._id}
                    // CRITICAL: Flip coordinates from MongoDB [Lng, Lat] to Leaflet [Lat, Lng]
                    position={[pet.location.coordinates[1], pet.location.coordinates[0]]}
                    
                    // Apply our fixed icon
                    icon={DefaultIcon}
                >
                    {/* The bubble that appears when you click a marker */}
                    <Popup>
                        <div className="w-40 flex flex-col items-center text-center">
                            {/* Pet Image */}
                            <div className="w-full h-24 mb-2 rounded-md overflow-hidden relative">
                                <img 
                                    src={pet.imageUrls[0]} 
                                    alt={pet.name} 
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            
                            {/* Pet Info */}
                            <h3 className="font-bold text-lg text-gray-800 m-0">{pet.name}</h3>
                            <p className="text-sm text-gray-500 m-0 mb-2">{pet.breed}</p>
                            
                            {/* Action Button */}
                            <button 
                                onClick={() => router.push(`/pet/${pet._id}`)}
                                className="w-full bg-[#4A90E2] text-white text-xs font-bold py-2 px-4 rounded-full hover:bg-[#3A75B9] transition-colors"
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
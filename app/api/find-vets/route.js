// app/api/find-vets/route.js
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { lat, lng, radius } = await req.json();

    if (!lat || !lng) {
      return NextResponse.json({ error: "Location required" }, { status: 400 });
    }

    // Radius in meters (default 5000m)
    const radiusMeters = (radius || 5) * 1000;

    // Construct Overpass QL query
    const query = `
      [out:json][timeout:25];
      (
        node["amenity"="veterinary"](around:${radiusMeters},${lat},${lng});
        way["amenity"="veterinary"](around:${radiusMeters},${lat},${lng});
        relation["amenity"="veterinary"](around:${radiusMeters},${lat},${lng});
      );
      out center;
    `;

    // List of Overpass API instances (Main + Backup)
    const servers = [
      "https://overpass-api.de/api/interpreter",       // Primary (Germany)
      "https://interpret.openstreetmap.fr/overpass/api/interpreter" // Backup (France)
    ];

    let data = null;
    let fetchError = null;

    // Try servers one by one
    for (const endpoint of servers) {
      try {
        console.log(`Attempting fetch from: ${endpoint}`);
        const response = await fetch(endpoint, {
          method: "POST",
          body: `data=${encodeURIComponent(query)}`, // Form-encoded body is safer for some endpoints
          headers: {
            "Content-Type": "application/x-www-form-urlencoded"
          }
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.warn(`Server ${endpoint} failed: ${response.status} - ${errorText}`);
          continue; // Try next server
        }

        data = await response.json();
        break; // Success! Exit loop
      } catch (err) {
        console.error(`Connection error with ${endpoint}:`, err.message);
        fetchError = err;
      }
    }

    if (!data) {
      throw new Error("All mapping servers failed. Please try again later.");
    }

    // Transform Data
    const hospitals = data.elements.map((place) => {
        const pLat = place.lat || place.center?.lat;
        const pLng = place.lon || place.center?.lon;
        
        return {
            id: place.id,
            name: place.tags.name || "Unnamed Vet Clinic",
            address: place.tags['addr:street'] || place.tags['addr:city'] || "Address not listed",
            phone: place.tags.phone || place.tags['contact:phone'] || "N/A",
            lat: pLat,
            lng: pLng,
            website: place.tags.website || null,
            opening_hours: place.tags.opening_hours || null
        };
    }).filter(h => h.lat && h.lng);

    return NextResponse.json({ hospitals });

  } catch (error) {
    console.error("Vet Search Final Error:", error);
    // Return a user-friendly error so the frontend doesn't crash
    return NextResponse.json({ error: "Could not fetch vet data.", details: error.message }, { status: 500 });
  }
}
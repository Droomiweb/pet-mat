// app/api/find-vets/route.js

// Standard imports
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    // Parse location data
    const { lat, lng, radius } = await req.json();

    // Validate coordinates
    if (!lat || !lng) {
      return NextResponse.json({ error: "Location required" }, { status: 400 });
    }

    // Convert to meters
    const radiusMeters = (radius || 5) * 1000;

    // Build map query
    const query = `
      [out:json][timeout:25];
      (
        node["amenity"="veterinary"](around:${radiusMeters},${lat},${lng});
        way["amenity"="veterinary"](around:${radiusMeters},${lat},${lng});
        relation["amenity"="veterinary"](around:${radiusMeters},${lat},${lng});
      );
      out center;
    `;

    // List API servers
    const servers = [
      "https://overpass-api.de/api/interpreter",          // Primary (Germany)
      "https://interpret.openstreetmap.fr/overpass/api/interpreter" // Backup (France)
    ];

    let data = null;

    // Fetch with failover
    for (const endpoint of servers) {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          // Send query data
          body: `data=${encodeURIComponent(query)}`,
          headers: { "Content-Type": "application/x-www-form-urlencoded" }
        });

        if (response.ok) {
          data = await response.json();
          break; // Stop on success
        }
      } catch (err) {
        console.error(`Connection error with ${endpoint}:`, err.message);
        // Continue to next
      }
    }

    // Handle API failure
    if (!data) {
      throw new Error("All mapping servers failed. Please try again later.");
    }

    // Format vet data
    const hospitals = data.elements.map((place) => {
        // Get raw coordinates
        const pLat = place.lat || place.center?.lat;
        const pLng = place.lon || place.center?.lon;
        const tags = place.tags || {};

        // Determine address format
        
        // Check street address
        let displayAddress = tags['addr:street'] 
            ? `${tags['addr:street']} ${tags['addr:housenumber'] || ''}`
            : null;

        // Check city name
        if (!displayAddress) {
            const area = tags['addr:city'] || tags['addr:town'] || tags['addr:village'] || tags['addr:hamlet'];
            if (area) displayAddress = `${area} (Exact street not listed)`;
        }

        // Set generic fallback
        if (!displayAddress) {
             displayAddress = "View map for exact location";
        }
        
        return {
            id: place.id,
            name: tags.name || "Unnamed Vet Clinic",
            address: displayAddress,
            // Check phone numbers
            phone: tags.phone || tags['contact:phone'] || "No Phone",
            lat: pLat,
            lng: pLng,
            website: tags.website || null,
            opening_hours: tags.opening_hours || null
        };
    }).filter(h => h.lat && h.lng); // Filter invalid locations

    // Return vet list
    return NextResponse.json({ hospitals });

  } catch (error) {
    console.error("Vet Search Final Error:", error);
    return NextResponse.json({ error: "Could not fetch vet data.", details: error.message }, { status: 500 });
  }
}
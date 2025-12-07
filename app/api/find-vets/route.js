// app/api/find-vets/route.js

// 1. IMPORTS
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    // 2. PARSE REQUEST
    // We expect the user's current GPS coordinates and a search radius (in km).
    const { lat, lng, radius } = await req.json();

    if (!lat || !lng) {
      return NextResponse.json({ error: "Location required" }, { status: 400 });
    }

    // Convert radius from KM to Meters (default to 5000m / 5km if not provided)
    const radiusMeters = (radius || 5) * 1000;

    // 3. CONSTRUCT OVERPASS QL QUERY
    // This is the query language for OpenStreetMap.
    // We ask for nodes, ways (buildings), and relations tagged with "amenity=veterinary".
    // "around:X,Y,Z" filters results within X meters of lat Y and lng Z.
    const query = `
      [out:json][timeout:25];
      (
        node["amenity"="veterinary"](around:${radiusMeters},${lat},${lng});
        way["amenity"="veterinary"](around:${radiusMeters},${lat},${lng});
        relation["amenity"="veterinary"](around:${radiusMeters},${lat},${lng});
      );
      out center;
    `;

    // 4. SERVER FALLBACK LIST
    // Public Overpass instances can get overloaded. We define a primary and a backup.
    const servers = [
      "https://overpass-api.de/api/interpreter",          // Primary (Germany)
      "https://interpret.openstreetmap.fr/overpass/api/interpreter" // Backup (France)
    ];

    let data = null;

    // 5. FETCH DATA (With Failover)
    // Loop through servers. If the first works, break. If it fails, try the next.
    for (const endpoint of servers) {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          // Overpass expects the query in the body parameter 'data'
          body: `data=${encodeURIComponent(query)}`,
          headers: { "Content-Type": "application/x-www-form-urlencoded" }
        });

        if (response.ok) {
          data = await response.json();
          break; // Success! Stop looping.
        }
      } catch (err) {
        console.error(`Connection error with ${endpoint}:`, err.message);
        // Loop continues to the next server...
      }
    }

    if (!data) {
      throw new Error("All mapping servers failed. Please try again later.");
    }

    // 6. TRANSFORM & NORMALIZE DATA
    // Raw OSM data is messy. We map it into a clean 'Hospital' object for our frontend.
    const hospitals = data.elements.map((place) => {
        // Handle different geometry types (Node vs Way)
        const pLat = place.lat || place.center?.lat;
        const pLng = place.lon || place.center?.lon;
        const tags = place.tags || {};

        // --- INTELLIGENT ADDRESS FALLBACK ---
        
        // Priority 1: Specific Street Address
        let displayAddress = tags['addr:street'] 
            ? `${tags['addr:street']} ${tags['addr:housenumber'] || ''}`
            : null;

        // Priority 2: City/Area Name
        if (!displayAddress) {
            const area = tags['addr:city'] || tags['addr:town'] || tags['addr:village'] || tags['addr:hamlet'];
            if (area) displayAddress = `${area} (Exact street not listed)`;
        }

        // Priority 3: Generic Fallback
        if (!displayAddress) {
             displayAddress = "View map for exact location";
        }
        
        return {
            id: place.id,
            name: tags.name || "Unnamed Vet Clinic",
            address: displayAddress,
            // Check multiple phone tag variations
            phone: tags.phone || tags['contact:phone'] || "No Phone",
            lat: pLat,
            lng: pLng,
            website: tags.website || null,
            opening_hours: tags.opening_hours || null
        };
    }).filter(h => h.lat && h.lng); // Remove entries without valid coordinates

    // 7. SUCCESS RESPONSE
    return NextResponse.json({ hospitals });

  } catch (error) {
    console.error("Vet Search Final Error:", error);
    return NextResponse.json({ error: "Could not fetch vet data.", details: error.message }, { status: 500 });
  }
}
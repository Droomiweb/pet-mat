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

    // Convert to meters (default 5km)
    const radiusMeters = (radius || 5) * 1000;

    // Build map query (Optimized Overpass QL)
    // [timeout:25] -> Increased to 25s to handle larger radii (e.g. 20km)
    const query = `
      [out:json][timeout:25];
      (
        node["amenity"="veterinary"](around:${radiusMeters},${lat},${lng});
        way["amenity"="veterinary"](around:${radiusMeters},${lat},${lng});
        relation["amenity"="veterinary"](around:${radiusMeters},${lat},${lng});
      );
      out center;
    `;

    // List of API servers (Mirrors) to try in order
    // 1. Kumi Systems (Fast)
    // 2. OpenStreetMap.fr (Reliable)
    // 3. Main Overpass API (Often busy, revert to last)
    const servers = [
      "https://overpass.kumi.systems/api/interpreter",
      "https://interpret.openstreetmap.fr/overpass/api/interpreter", 
      "https://overpass-api.de/api/interpreter"
    ];

    let data = null;
    let lastError = null;

    // Fetch with failover
    for (const endpoint of servers) {
      try {
        console.log(`Trying Vet API Mirror: ${endpoint}`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s fetch timeout

        const response = await fetch(endpoint, {
          method: "POST",
          body: `data=${encodeURIComponent(query)}`,
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (response.ok) {
          const result = await response.json();
          if (result && result.elements) {
              data = result;
              console.log(`Success with ${endpoint}`);
              break; // Stop on success
          }
        } else {
            throw new Error(`Status ${response.status}`);
        }
      } catch (err) {
        console.warn(`Failed ${endpoint}:`, err.message);
        lastError = err;
        // Continue to next mirror
      }
    }

    // Handle Total Failure
    if (!data) {
        console.error("All Vet API mirrors failed.");
        // Return 200 with empty list instead of 500 to prevent UI crash, 
        // using a flag to indicate upstream failure if needed
        return NextResponse.json({ 
            hospitals: [], 
            warning: "Map services are currently busy. Please try again later." 
        });
    }

    // Format vet data
    const hospitals = data.elements.map((place) => {
        // Get raw coordinates
        const pLat = place.lat || place.center?.lat;
        const pLng = place.lon || place.center?.lon;
        const tags = place.tags || {};

        // Determine address format
        let displayAddress = "";
        
        if (tags['addr:street']) {
             displayAddress = `${tags['addr:street']} ${tags['addr:housenumber'] || ''}`.trim();
             if (tags['addr:city']) displayAddress += `, ${tags['addr:city']}`;
        } else {
             const area = tags['addr:city'] || tags['addr:town'] || tags['addr:village'] || tags['addr:suburb'];
             if (area) displayAddress = `${area} (Approximate)`;
             else displayAddress = "Address details not available";
        }

        return {
            id: place.id,
            name: tags.name || tags.alt_name || "Veterinary Clinic",
            address: displayAddress,
            phone: tags.phone || tags['contact:phone'] || tags['contact:mobile'] || "No Phone",
            lat: pLat,
            lng: pLng,
            website: tags.website || tags['contact:website'] || null,
            email: tags.email || tags['contact:email'] || null,
            opening_hours: tags.opening_hours || null,
            emergency: tags.emergency === 'yes'
        };
    }).filter(h => h.lat && h.lng && h.name); // Strict filter

    // Return vet list
    return NextResponse.json({ hospitals });

  } catch (error) {
    console.error("Vet Search Final Error:", error);
    // Return empty list on crash to keep UI stable
    return NextResponse.json({ hospitals: [], error: "Internal Server Error" }, { status: 200 });
  }
}
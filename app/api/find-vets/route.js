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

    const servers = [
      "https://overpass-api.de/api/interpreter",
      "https://interpret.openstreetmap.fr/overpass/api/interpreter"
    ];

    let data = null;

    for (const endpoint of servers) {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          body: `data=${encodeURIComponent(query)}`,
          headers: { "Content-Type": "application/x-www-form-urlencoded" }
        });

        if (response.ok) {
          data = await response.json();
          break;
        }
      } catch (err) {
        console.error(`Connection error with ${endpoint}:`, err.message);
      }
    }

    if (!data) {
      throw new Error("All mapping servers failed. Please try again later.");
    }

    // Transform Data with INTELLIGENT ADDRESS FALLBACK
    const hospitals = data.elements.map((place) => {
        const pLat = place.lat || place.center?.lat;
        const pLng = place.lon || place.center?.lon;
        const tags = place.tags || {};

        // 1. Try specific address tags
        let displayAddress = tags['addr:street'] 
            ? `${tags['addr:street']} ${tags['addr:housenumber'] || ''}`
            : null;

        // 2. If no street, try "place" or "city" or "village"
        if (!displayAddress) {
            const area = tags['addr:city'] || tags['addr:town'] || tags['addr:village'] || tags['addr:hamlet'];
            if (area) displayAddress = `${area} (Exact street not listed)`;
        }

        // 3. If still nothing, use a generic fallback based on coordinates
        if (!displayAddress) {
             displayAddress = "View map for exact location";
        }
        
        return {
            id: place.id,
            name: tags.name || "Unnamed Vet Clinic",
            address: displayAddress,
            phone: tags.phone || tags['contact:phone'] || "No Phone",
            lat: pLat,
            lng: pLng,
            website: tags.website || null,
            opening_hours: tags.opening_hours || null
        };
    }).filter(h => h.lat && h.lng);

    return NextResponse.json({ hospitals });

  } catch (error) {
    console.error("Vet Search Final Error:", error);
    return NextResponse.json({ error: "Could not fetch vet data.", details: error.message }, { status: 500 });
  }
}
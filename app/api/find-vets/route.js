// app/api/find-vets/route.js
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { lat, lng, radius } = await req.json();

    if (!lat || !lng) {
      return NextResponse.json({ error: "Location required" }, { status: 400 });
    }

    // Radius in meters (default 5000m if not provided)
    const radiusMeters = (radius || 5) * 1000;

    // Construct Overpass QL query
    // We look for nodes, ways, and relations with amenity=veterinary
    const query = `
      [out:json][timeout:25];
      (
        node["amenity"="veterinary"](around:${radiusMeters},${lat},${lng});
        way["amenity"="veterinary"](around:${radiusMeters},${lat},${lng});
        relation["amenity"="veterinary"](around:${radiusMeters},${lat},${lng});
      );
      out center;
    `;

    const endpoint = "https://overpass-api.de/api/interpreter";
    
    const response = await fetch(endpoint, {
      method: "POST",
      body: query,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded" // Overpass expects raw body or form
      }
    });

    if (!response.ok) {
      throw new Error("Failed to fetch from mapping service");
    }

    const data = await response.json();

    // Transform Overpass data into a cleaner format
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
    }).filter(h => h.lat && h.lng); // Ensure valid coordinates

    return NextResponse.json({ hospitals });

  } catch (error) {
    console.error("Vet Search Error:", error);
    return NextResponse.json({ error: "Failed to find hospitals" }, { status: 500 });
  }
}
// app/api/pet/report-lost/route.js
import connectDB from "../../../lib/mongodb";
import Pet from "../../../models/PetModel";
import User from "../../../models/User";
import { sendWhatsAppText } from "../../../lib/greenApi";

export async function POST(req) {
  try {
    await connectDB();
    const { petId, userId, lastSeenLat, lastSeenLng, status } = await req.json();

    const pet = await Pet.findById(petId);
    if (!pet) return new Response(JSON.stringify({ error: "Pet not found" }), { status: 404 });
    
    // Security check
    if (pet.ownerId !== userId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 403 });

    // Toggle Status
    const isLost = status === true;
    pet.isLost = isLost;
    
    if (isLost) {
        pet.lastSeenDate = new Date();
        // Update location if provided
        if (lastSeenLat && lastSeenLng) {
            pet.lastSeenLocation = { type: 'Point', coordinates: [lastSeenLng, lastSeenLat] };
        } else {
            // Fallback to owner's home location
            const owner = await User.findOne({ firebaseUid: userId });
            if (owner?.location?.coordinates) {
                pet.lastSeenLocation = owner.location;
            }
        }
    }

    await pet.save();

    // If marking as LOST, send alerts to neighbors
    let notifiedCount = 0;
    if (isLost) {
        const nearbyUsers = await User.find({
          location: {
            $near: {
              $geometry: pet.lastSeenLocation,
              $maxDistance: 5000 // 5km Radius
            }
          },
          firebaseUid: { $ne: userId } // Don't alert self
        }).limit(50);

        const alertMessage = `🚨 *LOST PET ALERT* 🚨\n\nHELP! "${pet.name}" (${pet.breed}) was just reported lost near you.\n\nPLEASE KEEP A LOOKOUT.\nView Profile: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/pet/${petId}`;

        // Send in background
        (async () => {
            for (const user of nearbyUsers) {
                if (user.phone) {
                    try {
                        await sendWhatsAppText(`91${user.phone}`, alertMessage);
                    } catch (e) { console.error(`Failed to alert ${user.name}`); }
                }
            }
        })();
        notifiedCount = nearbyUsers.length;
    }

    return new Response(JSON.stringify({ 
        message: isLost ? `Alert activated! ${notifiedCount} neighbors notified.` : "Pet marked as found! Alert removed.",
        pet 
    }), { status: 200 });

  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
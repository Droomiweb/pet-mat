// app/api/pet/report-lost/route.js

// 1. IMPORTS
import connectDB from "../../../lib/mongodb";
import Pet from "../../../models/PetModel";
import User from "../../../models/User";
import { sendWhatsAppText } from "../../../lib/greenApi";
// Firebase imports for creating System Alerts in the chat inbox
import { db } from "../../../lib/firebase"; 
import { collection, addDoc, serverTimestamp, doc, setDoc, increment } from "firebase/firestore";

// 2. POST HANDLER
export async function POST(req) {
  try {
    await connectDB();
    
    // Parse the request: Who is the pet, who is the owner, and where was it lost?
    const { petId, userId, lastSeenLat, lastSeenLng, status } = await req.json();

    const pet = await Pet.findById(petId);
    if (!pet) return new Response(JSON.stringify({ error: "Pet not found" }), { status: 404 });
    
    // 3. SECURITY CHECK
    // Only the actual owner is allowed to trigger a community alert.
    if (pet.ownerId !== userId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 403 });

    // 4. TOGGLE STATUS
    // status: true (LOST), status: false (FOUND)
    const isLost = status === true;
    pet.isLost = isLost;
    
    if (isLost) {
        pet.lastSeenDate = new Date();
        
        // LOCATION LOGIC:
        // Priority 1: User pinned a specific spot on the map (lastSeenLat/Lng).
        if (lastSeenLat && lastSeenLng) {
            pet.lastSeenLocation = { type: 'Point', coordinates: [lastSeenLng, lastSeenLat] };
        } else {
            // Priority 2: Fallback to the owner's registered home address.
            const owner = await User.findOne({ firebaseUid: userId });
            if (owner?.location?.coordinates) {
                pet.lastSeenLocation = owner.location;
            }
        }
    }

    // Save the status change to MongoDB
    await pet.save();

    // 5. ALERT SYSTEM (Only runs if pet is marked LOST)
    let notifiedCount = 0;
    
    if (isLost) {
        // GEOSPATIAL QUERY: Find neighbors within 5km
        const nearbyUsers = await User.find({
          location: {
            $near: {
              $geometry: pet.lastSeenLocation,
              $maxDistance: 5000 // 5000 meters = 5km
            }
          },
          firebaseUid: { $ne: userId } // Exclude the owner from their own alert
        }).limit(50); // Cap at 50 to prevent spam/timeout

        const petProfileUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/pet/${petId}`;
        
        // Define Alert Messages
        const alertMessage = `🚨 *LOST PET ALERT* 🚨\n\nHELP! "${pet.name}" (${pet.breed}) was just reported lost near you.\n\nPLEASE KEEP A LOOKOUT.\nView Profile: ${petProfileUrl}`;
        
        const internalChatMessage = `🚨 LOST PET ALERT! \n\n"${pet.name}" is missing nearby. Please check their profile and help us find them.\n\nView Profile: ${petProfileUrl}`;

        // 6. BROADCAST NOTIFICATIONS
        // Use Promise.all to send parallel requests for speed.
        await Promise.all(nearbyUsers.map(async (user) => {
            console.log(`[LostPet] Preparing alert for User: ${user.username} | Phone: ${user.phone}`);

            // CHANNEL A: WhatsApp
            if (user.phone) {
                try {
                    // Send via Green API
                    await sendWhatsAppText(`91${user.phone}`, alertMessage);
                    console.log(`[WhatsApp] Sent successfully to ${user.username}`);
                } catch (e) { 
                    // Log error but DO NOT throw, so other messages continue
                    console.error(`[WhatsApp] Failed to send to ${user.username}:`, e.message); 
                }
            }

            // CHANNEL B: Internal Website Chat (System Injection)
            try {
                // Create a unique conversation ID for this specific alert
                const conversationId = `${petId}_system_${user.firebaseUid}`;

                // 1. Add the message to Firestore
                await addDoc(collection(db, "conversations", conversationId, "messages"), {
                    senderId: "system", // Special ID for the system bot
                    senderName: "🚨 PetLink Alert",
                    text: internalChatMessage,
                    createdAt: serverTimestamp(),
                    read: false
                });

                // 2. Update metadata to trigger the unread badge
                await setDoc(doc(db, "conversations", conversationId), {
                    petId: petId,
                    participants: ["system", user.firebaseUid],
                    lastMessage: "🚨 LOST PET ALERT!",
                    updatedAt: serverTimestamp(),
                    unreadCounts: {
                        [user.firebaseUid]: increment(1) // Force unread count up
                    }
                }, { merge: true });

                console.log(`[InternalChat] Sent alert to ${user.username}`);

            } catch (err) {
                console.error(`[InternalChat] Failed to message ${user.username}:`, err.message);
            }

        }));

        notifiedCount = nearbyUsers.length;
        console.log(`[LostPet] Total neighbors targeted: ${notifiedCount}`);
    }

    // 7. SUCCESS RESPONSE
    return new Response(JSON.stringify({ 
        message: isLost ? `Alert activated! ${notifiedCount} neighbors notified via WhatsApp & Chat.` : "Pet marked as found! Alert removed.",
        pet 
    }), { status: 200 });

  } catch (err) {
    console.error("[LostPet] Critical Error in Route:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
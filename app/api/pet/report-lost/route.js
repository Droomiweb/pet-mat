// app/api/pet/report-lost/route.js
import connectDB from "../../../lib/mongodb";
import Pet from "../../../models/PetModel";
import User from "../../../models/User";
import { sendWhatsAppText } from "../../../lib/greenApi";
import { db } from "../../../lib/firebase"; 
import { collection, addDoc, serverTimestamp, doc, setDoc, increment } from "firebase/firestore";

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

        const petProfileUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/pet/${petId}`;
        
        const alertMessage = `🚨 *LOST PET ALERT* 🚨\n\nHELP! "${pet.name}" (${pet.breed}) was just reported lost near you.\n\nPLEASE KEEP A LOOKOUT.\nView Profile: ${petProfileUrl}`;
        
        const internalChatMessage = `🚨 LOST PET ALERT! \n\n"${pet.name}" is missing nearby. Please check their profile and help us find them.\n\nView Profile: ${petProfileUrl}`;

        // Process notifications in parallel (using Promise.all for speed, but handling errors individually)
        await Promise.all(nearbyUsers.map(async (user) => {
            // LOGGING: Numbers and Usernames
            console.log(`[LostPet] Preparing alert for User: ${user.username} | Phone: ${user.phone}`);

            // 1. Send WhatsApp
            if (user.phone) {
                try {
                    await sendWhatsAppText(`91${user.phone}`, alertMessage);
                    console.log(`[WhatsApp] Sent successfully to ${user.username} (${user.phone})`);
                } catch (e) { 
                    console.error(`[WhatsApp] Failed to send to ${user.username} (${user.phone}):`, e.message); 
                }
            } else {
                console.log(`[WhatsApp] Skipped ${user.username} (No phone number)`);
            }

            // 2. Send Internal Website Chat (System Message)
            try {
                // Construct a stable Conversation ID for "System -> User" about this specific Pet
                // Format: petId_system_userUID
                const conversationId = `${petId}_system_${user.firebaseUid}`;

                // A. Create the Message
                await addDoc(collection(db, "conversations", conversationId, "messages"), {
                    senderId: "system",
                    senderName: "🚨 PetLink Alert",
                    text: internalChatMessage,
                    createdAt: serverTimestamp(),
                    read: false
                });

                // B. Update/Create Conversation Metadata
                await setDoc(doc(db, "conversations", conversationId), {
                    petId: petId,
                    participants: ["system", user.firebaseUid],
                    lastMessage: "🚨 LOST PET ALERT!",
                    updatedAt: serverTimestamp(),
                    unreadCounts: {
                        [user.firebaseUid]: increment(1)
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

    return new Response(JSON.stringify({ 
        message: isLost ? `Alert activated! ${notifiedCount} neighbors notified via WhatsApp & Chat.` : "Pet marked as found! Alert removed.",
        pet 
    }), { status: 200 });

  } catch (err) {
    console.error("[LostPet] Critical Error in Route:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
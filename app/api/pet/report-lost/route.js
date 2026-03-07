// app/api/pet/report-lost/route.js

// Standard imports
import connectDB from "../../../lib/mongodb";
import Pet from "../../../models/PetModel";
import User from "../../../models/User";
import { sendWhatsAppText } from "../../../lib/greenApi";
// Firebase Admin import
import admin from "../../../lib/firebaseAdmin";

// POST request handler
export async function POST(req) {
  try {
    await connectDB();
    
    // Parse request data
    const { petId, userId, lastSeenLat, lastSeenLng, status } = await req.json();

    const pet = await Pet.findById(petId);
    if (!pet) return new Response(JSON.stringify({ error: "Pet not found" }), { status: 404 });
    
    // Check ownership
    if (pet.ownerId !== userId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 403 });

    // Set lost state
    const isLost = status === true;
    pet.isLost = isLost;
    
    if (isLost) {
        pet.lastSeenDate = new Date();
        
        // Determine location
        // Check pinned location
        if (lastSeenLat && lastSeenLng) {
            pet.lastSeenLocation = { type: 'Point', coordinates: [lastSeenLng, lastSeenLat] };
        } else {
            // Fallback to home
            const owner = await User.findOne({ firebaseUid: userId });
            if (owner?.location?.coordinates) {
                pet.lastSeenLocation = owner.location;
            }
        }
    }

    // Save pet changes
    await pet.save();

    // Trigger alert system
    let notifiedCount = 0;
    
    if (isLost) {
        // Find nearby users
        const nearbyUsers = await User.find({
          location: {
            $near: {
              $geometry: pet.lastSeenLocation,
              $maxDistance: 50000 // Increased to 50km radius for better coverage
            }
          },
          firebaseUid: { $ne: userId } // Exclude owner
        }).limit(50); // Limit results

        console.log(`[LostPet] Found ${nearbyUsers.length} nearby users within 50km.`);

        const petProfileUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/pet/${petId}`;
        
        // Prepare alert messages
        const alertMessage = `🚨 *LOST PET ALERT* 🚨\n\nHELP! "${pet.name}" (${pet.breed}) was just reported lost near you.\n\nPLEASE KEEP A LOOKOUT.\nView Profile: ${petProfileUrl}`;
        
        const internalChatMessage = `🚨 LOST PET ALERT! \n\n"${pet.name}" is missing nearby. Please check their profile and help us find them.\n\nView Profile: ${petProfileUrl}`;

        // Initialize Firestore Admin
        const db = admin.firestore();

        // Broadcast notifications
        await Promise.all(nearbyUsers.map(async (user) => {
            console.log(`[LostPet] Preparing alert for User: ${user.username} | Phone: ${user.phone}`);

            // Send WhatsApp alert
            if (user.phone) {
                try {
                    const cleanPhone = String(user.phone).replace(/\D/g, "");
                    const fullPhoneNumber = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
                    await sendWhatsAppText(fullPhoneNumber, alertMessage);
                    console.log(`[WhatsApp] Sent successfully to ${user.username}`);
                } catch (e) { 
                    console.error(`[WhatsApp] Failed to send to ${user.username}:`, e.message); 
                }
            }

            // Send in-app alert via Firebase Admin
            try {
                // Generate conversation ID
                const conversationId = `${petId}_system_${user.firebaseUid}`;

                // Add system message
                await db.collection("conversations").doc(conversationId).collection("messages").add({
                    senderId: "system", // Bot sender
                    senderName: "🚨 PetLink Alert",
                    text: internalChatMessage,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    read: false
                });

                // Update chat metadata
                await db.collection("conversations").doc(conversationId).set({
                    petId: petId,
                    participants: ["system", user.firebaseUid],
                    lastMessage: "🚨 LOST PET ALERT!",
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    unreadCounts: {
                        [user.firebaseUid]: admin.firestore.FieldValue.increment(1)
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

    // Return success response
    return new Response(JSON.stringify({ 
        message: isLost ? `Alert activated! ${notifiedCount} neighbors notified via WhatsApp & Chat.` : "Pet marked as found! Alert removed.",
        pet 
    }), { status: 200 });

  } catch (err) {
    console.error("[LostPet] Critical Error in Route:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
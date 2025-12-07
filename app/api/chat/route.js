// app/api/chat/route.js

// 1. IMPORTS
import { db } from "../../lib/firebase"; 
// Firestore methods for adding documents and updating counters atomically
import { collection, addDoc, serverTimestamp, doc, setDoc, increment } from "firebase/firestore";
import connectDB from "../../lib/mongodb";
import Pet from "../../models/PetModel";
import { v2 as cloudinary } from "cloudinary";

// 2. CONFIGURATION
// Setup Cloudinary to handle image/video uploads
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req) {
  try {
    // 3. PARSE REQUEST
    // conversationId is usually constructed as: petId_user1_user2 (sorted alphabetically)
    const { petId, senderId, senderName, text, conversationId, mediaBase64, mediaType } = await req.json();

    // 4. VALIDATION
    // Ensure we have a valid conversation target and at least ONE form of content (text or media)
    if (!petId || !senderId || !senderName || !conversationId || (!text && !mediaBase64)) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
    }

    let mediaUrl = null;
    let finalMediaType = null;

    // 5. MEDIA UPLOAD (Cloudinary)
    // If the user attached a file, we must upload it first to get a URL.
    if (mediaBase64 && mediaType) {
        try {
            // Determine if it's a video or image based on the MIME type string
            const resourceType = mediaType.startsWith('video') ? 'video' : 'image';
            
            const uploadRes = await cloudinary.uploader.upload(mediaBase64, {
                folder: "chat_media", // Organize uploads in a specific folder
                resource_type: resourceType, 
            });
            mediaUrl = uploadRes.secure_url;
            finalMediaType = resourceType;
        } catch (uploadErr) {
            console.error("Chat Media Upload Error:", uploadErr);
            return new Response(JSON.stringify({ error: "Failed to upload media" }), { status: 500 });
        }
    }

    // 6. FIRESTORE: ADD MESSAGE
    // This goes into the subcollection 'messages' inside the specific conversation document.
    const messageData = {
      senderId, 
      senderName, 
      createdAt: serverTimestamp(), // Use server time for consistency across timezones
      read: false, // Default state
    };

    // Add content conditionally (handling text-only, media-only, or mixed messages)
    if (text) messageData.text = text;
    if (mediaUrl) {
        messageData.mediaUrl = mediaUrl;
        messageData.mediaType = finalMediaType;
    }

    await addDoc(collection(db, "conversations", conversationId, "messages"), messageData);

    // 7. FIRESTORE: UPDATE METADATA (The "Inbox" View)
    // We update the parent document so the list of conversations shows the latest snippet.
    
    // Logic: Split ID "petID_uidA_uidB" to find who the Other Person is
    const parts = conversationId.split('_');
    const recipientId = parts.slice(1).find(uid => uid !== senderId);

    // Create a preview snippet for the inbox list
    let snippet = text || "Media message";
    if (mediaUrl && !text) snippet = finalMediaType === 'video' ? "🎥 Video" : "📷 Photo";
    else if (mediaUrl && text) snippet = `📷 ${text}`;

    const docData = {
        petId, 
        lastMessage: snippet, 
        updatedAt: serverTimestamp(), // Moves this conversation to the top of the list
        participants: parts.slice(1) // Ensure participants array is always fresh
    };

    // 8. UNREAD COUNT LOGIC
    // We use a Map called 'unreadCounts'.
    // We atomically increment ONLY the recipient's counter.
    if (recipientId) {
        docData.unreadCounts = {
            [recipientId]: increment(1)
        };
    }

    // Perform the update with { merge: true } so we don't overwrite existing fields (like the other user's unread count)
    await setDoc(doc(db, "conversations", conversationId), docData, { merge: true }); 

    // 9. MONGODB SYNC (Backup/Analytics)
    // We fire this asynchronously using an IIFE so the user gets a "Message Sent" response immediately,
    // without waiting for the slower MongoDB write.
    (async () => {
        try {
            await connectDB();
            // We just store a simple record in the Pet model for history tracking
            const mongoMsg = { 
                senderId, 
                senderName, 
                text: snippet, 
                sentAt: new Date() 
            };
            // $push adds to the messages array
            await Pet.findByIdAndUpdate(petId, { $push: { messages: mongoMsg } });
        } catch (mongoErr) {
            console.error("MongoDB Sync Error (Non-fatal):", mongoErr);
            // We do NOT throw here, as the primary chat (Firebase) succeeded.
        }
    })();

    // 10. SUCCESS RESPONSE
    return new Response(JSON.stringify({ message: "Message sent!" }), { status: 201 });

  } catch (err) {
    console.error("Error sending message:", err);
    return new Response(JSON.stringify({ error: "Failed to send message" }), { status: 500 });
  }
}
// app/api/chat/route.js
import { db } from "../../lib/firebase"; 
import { collection, addDoc, serverTimestamp, doc, setDoc, increment } from "firebase/firestore";
import connectDB from "../../lib/mongodb";
import Pet from "../../models/PetModel";
import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req) {
  try {
    const { petId, senderId, senderName, text, conversationId, mediaBase64, mediaType } = await req.json();

    // Basic Validation
    if (!petId || !senderId || !senderName || !conversationId || (!text && !mediaBase64)) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
    }

    let mediaUrl = null;
    let finalMediaType = null;

    // --- 1. Handle Media Upload (If present) ---
    if (mediaBase64 && mediaType) {
        try {
            // Determine resource type (image or video)
            const resourceType = mediaType.startsWith('video') ? 'video' : 'image';
            
            const uploadRes = await cloudinary.uploader.upload(mediaBase64, {
                folder: "chat_media",
                resource_type: resourceType, 
            });
            mediaUrl = uploadRes.secure_url;
            finalMediaType = resourceType;
        } catch (uploadErr) {
            console.error("Chat Media Upload Error:", uploadErr);
            return new Response(JSON.stringify({ error: "Failed to upload media" }), { status: 500 });
        }
    }

    // --- 2. Write Message to Firebase Subcollection ---
    const messageData = {
      senderId, 
      senderName, 
      createdAt: serverTimestamp(),
      read: false, // <--- Important: Initialize as unread
    };

    // Add content conditionally
    if (text) messageData.text = text;
    if (mediaUrl) {
        messageData.mediaUrl = mediaUrl;
        messageData.mediaType = finalMediaType;
    }

    await addDoc(collection(db, "conversations", conversationId, "messages"), messageData);

    // --- 3. Update Conversation Metadata & Unread Counts ---
    const parts = conversationId.split('_');
    
    // Find the recipient (The participant who is NOT the sender)
    // conversationId format: petId_uid1_uid2
    const recipientId = parts.slice(1).find(uid => uid !== senderId);

    // Determine snippet text for the list view
    let snippet = text || "Media message";
    if (mediaUrl && !text) snippet = finalMediaType === 'video' ? "🎥 Video" : "📷 Photo";
    else if (mediaUrl && text) snippet = `📷 ${text}`;

    const docData = {
        petId, 
        lastMessage: snippet, 
        updatedAt: serverTimestamp(),
        participants: parts.slice(1) 
    };

    // --- FIX: Use Nested Object for Unread Count ---
    // This ensures Firestore treats 'unreadCounts' as a Map and merges correctly
    if (recipientId) {
        docData.unreadCounts = {
            [recipientId]: increment(1)
        };
    }

    // Merge updates into the conversation document
    await setDoc(doc(db, "conversations", conversationId), docData, { merge: true }); 

    // --- 4. Sync to MongoDB (Backup) ---
    // We perform this asynchronously to not block the chat response
    (async () => {
        try {
            await connectDB();
            const mongoMsg = { 
                senderId, 
                senderName, 
                text: snippet, // Store snippet as text summary
                sentAt: new Date() 
            };
            await Pet.findByIdAndUpdate(petId, { $push: { messages: mongoMsg } });
        } catch (mongoErr) {
            console.error("MongoDB Sync Error (Non-fatal):", mongoErr);
        }
    })();

    return new Response(JSON.stringify({ message: "Message sent!" }), { status: 201 });

  } catch (err) {
    console.error("Error sending message:", err);
    return new Response(JSON.stringify({ error: "Failed to send message" }), { status: 500 });
  }
}
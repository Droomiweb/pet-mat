// app/api/chat/route.js

import { db } from "../../lib/firebase"; 
import { collection, addDoc, serverTimestamp, doc, setDoc, increment, getDoc, deleteDoc, getDocs, writeBatch } from "firebase/firestore";
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
    // Parse request data
    const { petId, senderId, senderName, text, conversationId, mediaBase64, mediaType } = await req.json();

    // Validate input fields
    if (!petId || !senderId || !senderName || !conversationId || (!text && !mediaBase64)) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
    }

    let mediaUrl = null;
    let finalMediaType = null;

    // Upload media files
    if (mediaBase64 && mediaType) {
        try {
            // Determine resource type
            const resourceType = mediaType.startsWith('video') ? 'video' : 'image';
            
            const uploadRes = await cloudinary.uploader.upload(mediaBase64, {
                folder: "chat_media", // Organize uploads
                resource_type: resourceType, 
            });
            mediaUrl = uploadRes.secure_url;
            finalMediaType = resourceType;
        } catch (uploadErr) {
            console.error("Chat Media Upload Error:", uploadErr);
            return new Response(JSON.stringify({ error: "Failed to upload media" }), { status: 500 });
        }
    }

    // Prepare message data
    const messageData = {
      senderId, 
      senderName, 
      createdAt: serverTimestamp(), // Use server time
      read: false, // Default status
    };

    // Attach message content
    if (text) messageData.text = text;
    if (mediaUrl) {
        messageData.mediaUrl = mediaUrl;
        messageData.mediaType = finalMediaType;
    }

    // Save to Firestore
    await addDoc(collection(db, "conversations", conversationId, "messages"), messageData);

    // Update conversation metadata
    
    // Identify recipient
    const parts = conversationId.split('_');
    const recipientId = parts.slice(1).find(uid => uid !== senderId);

    // Create snippet preview
    let snippet = text || "Media message";
    if (mediaUrl && !text) snippet = finalMediaType === 'video' ? "🎥 Video" : "📷 Photo";
    else if (mediaUrl && text) snippet = `📷 ${text}`;

    const docData = {
        petId, 
        lastMessage: snippet, 
        updatedAt: serverTimestamp(), // Update timestamp
        participants: parts.slice(1) // Update participants
    };

    // Increment unread count
    if (recipientId) {
        docData.unreadCounts = {
            [recipientId]: increment(1)
        };
    }

    // Update parent document
    await setDoc(doc(db, "conversations", conversationId), docData, { merge: true }); 

    // Sync to MongoDB
    (async () => {
        try {
            await connectDB();
            // Store message log
            const mongoMsg = { 
                senderId, 
                senderName, 
                text: snippet, 
                sentAt: new Date() 
            };
            // Append to pet
            await Pet.findByIdAndUpdate(petId, { $push: { messages: mongoMsg } });
        } catch (mongoErr) {
            console.error("MongoDB Sync Error (Non-fatal):", mongoErr);
            // Ignore sync errors
        }
    })();

    // Return success message
    return new Response(JSON.stringify({ message: "Message sent!" }), { status: 201 });

  } catch (err) {
    console.error("Error sending message:", err);
    return new Response(JSON.stringify({ error: "Failed to send message" }), { status: 500 });
  }
}

// --- NEW DELETE METHOD ---
export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get("conversationId");
    const userId = searchParams.get("userId");

    if (!conversationId || !userId) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
    }

    // 1. Verify ownership (Optional but recommended)
    const convRef = doc(db, "conversations", conversationId);
    const convSnap = await getDoc(convRef);

    if (convSnap.exists()) {
        const data = convSnap.data();
        if (!data.participants || !data.participants.includes(userId)) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 403 });
        }
    } else {
        return new Response(JSON.stringify({ error: "Conversation not found" }), { status: 404 });
    }

    // 2. Delete all messages in subcollection
    // Firestore requires deleting documents individually or in batches
    const messagesRef = collection(db, "conversations", conversationId, "messages");
    const messagesSnap = await getDocs(messagesRef);

    const batch = writeBatch(db);
    messagesSnap.docs.forEach((doc) => {
        batch.delete(doc.ref);
    });

    // 3. Delete the conversation document itself
    batch.delete(convRef);

    // Commit changes
    await batch.commit();

    return new Response(JSON.stringify({ success: true, message: "Conversation deleted" }), { status: 200 });

  } catch (error) {
    console.error("Delete Chat Error:", error);
    return new Response(JSON.stringify({ error: "Failed to delete chat" }), { status: 500 });
  }
}
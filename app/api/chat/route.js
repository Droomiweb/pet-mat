// app/api/chat/route.js

// Standard imports
import { db } from "../../lib/firebase"; 
// Firestore methods
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
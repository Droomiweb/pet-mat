// app/api/chat/route.js
import { db } from "../../lib/firebase"; 
import { collection, addDoc, serverTimestamp, doc, setDoc } from "firebase/firestore";
import connectDB from "../../lib/mongodb";
import Pet from "../../models/PetModel";

export async function POST(req) {
  try {
    const { petId, senderId, senderName, text, conversationId } = await req.json();

    if (!petId || !senderId || !senderName || !text || !conversationId) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
    }

    // 1. Write to Firebase (Real-time)
    await addDoc(collection(db, "conversations", conversationId, "messages"), {
      senderId, senderName, text, createdAt: serverTimestamp(),
    });

    // --- FIX: Handle participants safely ---
    const parts = conversationId.split('_');
    
    // Prepare the data object
    const docData = {
        petId, 
        lastMessage: text, 
        updatedAt: serverTimestamp()
    };

    // Only add participants if the conversationId is in the correct format (petId_uid1_uid2)
    // This prevents the "Unsupported field value: undefined" error
    if (parts.length >= 3 && parts[1] && parts[2]) {
        docData.participants = [parts[1], parts[2]];
    }

    await setDoc(doc(db, "conversations", conversationId), docData, { merge: true }); 
    // --- END FIX ---

    // 2. Sync to MongoDB (For Dashboard View)
    await connectDB();
    await Pet.findByIdAndUpdate(petId, {
      $push: { messages: { senderId, senderName, text, sentAt: new Date() } }
    });

    return new Response(JSON.stringify({ message: "Message sent and synced!" }), { status: 201 });
  } catch (err) {
    console.error("Error sending message:", err);
    return new Response(JSON.stringify({ error: "Failed to send message" }), { status: 500 });
  }
}
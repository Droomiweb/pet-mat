// app/api/chat/route.js
import { db } from "../../lib/firebase"; // Use our new db export
import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, setDoc } from "firebase/firestore";
import connectDB from "../../lib/mongodb";
import Pet from "../../models/PetModel";

// This function creates a new message in a Firestore conversation
export async function POST(req) {
  try {
    const { petId, senderId, senderName, text } = await req.json();

    if (!petId || !senderId || !senderName || !text) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
    }

    // Connect to MongoDB to get pet owner
    await connectDB();
    const pet = await Pet.findById(petId).lean();
    if (!pet) {
      return new Response(JSON.stringify({ error: "Pet not found" }), { status: 404 });
    }

    const petOwnerId = pet.ownerId;
    
    // A conversation ID is a combination of the pet ID and the requester ID
    // This ensures the chat is unique for this specific interaction.
    const conversationId = `${petId}_${senderId === petOwnerId ? 'owner' : senderId}`;

    // Create a reference to the 'messages' subcollection
    const messagesColRef = collection(db, "conversations", conversationId, "messages");

    // Add the new message
    await addDoc(messagesColRef, {
      senderId: senderId,
      senderName: senderName,
      text: text,
      createdAt: serverTimestamp(), // Use Firestore's timestamp
    });

    // Also create/update the parent conversation doc for easy querying
    const convoDocRef = doc(db, "conversations", conversationId);
    await setDoc(convoDocRef, {
        petId: petId,
        petName: pet.name,
        petOwnerId: petOwnerId,
        requesterId: senderId === petOwnerId ? 'unknown' : senderId, // This logic could be improved
        participants: [petOwnerId, senderId],
        lastMessage: text,
        updatedAt: serverTimestamp()
    }, { merge: true }); // Merge to avoid overwriting

    return new Response(JSON.stringify({ message: "Message sent!" }), { status: 201 });

  } catch (err) {
    console.error("Error sending message:", err);
    return new Response(JSON.stringify({ error: "Failed to send message" }), { status: 500 });
  }
}
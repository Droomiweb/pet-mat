// app/api/chat/route.js
import { db } from "../../lib/firebase"; // Use our new db export
import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, setDoc } from "firebase/firestore";
import connectDB from "../../lib/mongodb";
import Pet from "../../models/PetModel";

// This function creates a new message in a Firestore conversation
export async function POST(req) {
  try {
    // --- V V V THIS IS THE FIX V V V ---
    // We now read `conversationId` from the body
    const { petId, senderId, senderName, text, conversationId } = await req.json();

    if (!petId || !senderId || !senderName || !text || !conversationId) {
    // --- ^ ^ ^ END OF FIX ^ ^ ^ ---
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
    }

    // Connect to MongoDB to get pet owner (still useful for the convo doc)
    await connectDB();
    const pet = await Pet.findById(petId).lean();
    if (!pet) {
      return new Response(JSON.stringify({ error: "Pet not found" }), { status: 404 });
    }
    const petOwnerId = pet.ownerId;
    
    // --- V V V THIS IS THE FIX V V V ---
    // We NO LONGER calculate the conversationId. We use the one from the client.
    // const conversationId = `${petId}_${senderId === petOwnerId ? 'owner' : senderId}`; // <-- DELETED
    // --- ^ ^ ^ END OF FIX ^ ^ ^ ---

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
    
    // Find the 'requesterId' (the person who is NOT the owner)
    const requesterId = conversationId.replace(petId, "").replace("_", "");
    
    await setDoc(convoDocRef, {
        petId: petId,
        petName: pet.name,
        petOwnerId: petOwnerId,
        requesterId: requesterId, // Set the correct requesterId
        participants: [petOwnerId, requesterId],
        lastMessage: text,
        updatedAt: serverTimestamp()
    }, { merge: true }); // Merge to avoid overwriting

    return new Response(JSON.stringify({ message: "Message sent!" }), { status: 201 });

  } catch (err) {
    console.error("Error sending message:", err);
    return new Response(JSON.stringify({ error: "Failed to send message" }), { status: 500 });
  }
}
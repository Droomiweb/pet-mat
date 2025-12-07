// app/api/message/route.js

// 1. IMPORTS
import connectDB from "../../lib/mongodb";
import Pet from "../../models/PetModel";
import User from "../../models/User";

// 2. POST HANDLER
// Handles sending a new direct message from one user to another regarding a specific pet.
export async function POST(req) {
  try {
    await connectDB();
    
    // Parse request body
    const { senderId, senderName, receiverId, petId, text } = await req.json();

    // 3. VALIDATION
    if (!senderId || !senderName || !receiverId || !text) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
    }

    // --- STEP 1: DELIVER TO RECEIVER ---
    // We attach the message to the specific pet profile the sender was looking at.
    // This organizes the receiver's inbox by Pet (e.g., "Messages for Rex").
    const receiverPet = await Pet.findById(petId);
    
    if (!receiverPet) {
      return new Response(JSON.stringify({ error: "Pet not found" }), { status: 404 });
    }
    
    // Add the new message to the receiver's pet's messages array
    receiverPet.messages.push({
      senderId: senderId,
      senderName: senderName,
      text: text,
      sentAt: new Date(),
    });
    
    await receiverPet.save();

    // --- STEP 2: SAVE TO SENDER'S HISTORY ---
    // We need a place to store the "Sent Items" for the sender.
    // Instead of a separate Chat Schema, we utilize the existing Pet Schema.
    // We look for a special "System" pet owned by the sender called "Chat Messages".
    let senderChatPet = await Pet.findOne({ ownerId: senderId, name: "Chat Messages" });

    // If this is the user's first time sending a message, create their "Inbox Pet".
    if (!senderChatPet) {
      senderChatPet = new Pet({
        name: "Chat Messages", // Special identifier
        type: "System",        // Mark as system type to filter out of marketplace/mating lists
        age: 0,
        breed: "N/A",
        imageUrls: [],
        ownerId: senderId,
        isBanned: false,
        verificationStatus: 'verified',
        messages: []
      });
      await senderChatPet.save();
    }
    
    // Add the "Sent" message to the sender's history.
    // We modify the text slightly to indicate who it was sent TO.
    senderChatPet.messages.push({
      senderId: senderId,
      senderName: senderName, // Alternatively, you could store 'Me' or the receiver's name here
      text: `TO: ${receiverPet.name} - ${text}`,
      sentAt: new Date(),
    });
    
    await senderChatPet.save();

    // 4. SUCCESS RESPONSE
    return new Response(JSON.stringify({ message: "Message sent successfully" }), { status: 200 });

  } catch (err) {
    console.error("Error sending message:", err);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }
}
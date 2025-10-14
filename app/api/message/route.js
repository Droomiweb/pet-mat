// app/api/message/route.js
import connectDB from "../../lib/mongodb";
import Pet from "../../models/PetModel";
import User from "../../models/User";

// POST a new direct message
export async function POST(req) {
  try {
    await connectDB();
    const { senderId, senderName, receiverId, petId, text } = await req.json();

    if (!senderId || !senderName || !receiverId || !text) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
    }

    // Step 1: Add message to the receiver's pet (the pet being viewed)
    // Find the pet document for the pet being viewed
    const receiverPet = await Pet.findById(petId);
    if (!receiverPet) {
      return new Response(JSON.stringify({ error: "Pet not found" }), { status: 404 });
    }
    
    // Add the new message to the pet's messages array
    receiverPet.messages.push({
      senderId: senderId,
      senderName: senderName,
      text: text,
      sentAt: new Date(),
    });
    await receiverPet.save();

    // Step 2: Add a copy of the sent message to the sender's own "chat pet"
    // This allows the sender to see their sent messages in their own message section
    // We'll create a special "chat pet" for each user if it doesn't exist
    // to store messages not directly related to a specific mating pet.
    let senderChatPet = await Pet.findOne({ ownerId: senderId, name: "Chat Messages" });

    if (!senderChatPet) {
      senderChatPet = new Pet({
        name: "Chat Messages", // A special pet to track conversations
        type: "System",
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
    
    // Add the sent message to the sender's chat pet, along with a reference to the recipient pet
    senderChatPet.messages.push({
      senderId: senderId,
      senderName: senderName,
      text: `TO: ${receiverPet.name} - ${text}`,
      sentAt: new Date(),
    });
    await senderChatPet.save();

    return new Response(JSON.stringify({ message: "Message sent successfully" }), { status: 200 });
  } catch (err) {
    console.error("Error sending message:", err);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }
}
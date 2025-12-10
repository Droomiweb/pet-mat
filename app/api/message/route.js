// app/api/message/route.js

// Standard imports
import connectDB from "../../lib/mongodb";
import Pet from "../../models/PetModel";
import User from "../../models/User";

// POST request handler
export async function POST(req) {
  try {
    // Connect to database
    await connectDB();
    
    // Parse request data
    const { senderId, senderName, receiverId, petId, text } = await req.json();

    // Validate required fields
    if (!senderId || !senderName || !receiverId || !text) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
    }

    // Find receiver pet
    const receiverPet = await Pet.findById(petId);
    
    if (!receiverPet) {
      return new Response(JSON.stringify({ error: "Pet not found" }), { status: 404 });
    }
    
    // Save receiver message
    receiverPet.messages.push({
      senderId: senderId,
      senderName: senderName,
      text: text,
      sentAt: new Date(),
    });
    
    await receiverPet.save();

    // Find sender history
    let senderChatPet = await Pet.findOne({ ownerId: senderId, name: "Chat Messages" });

    // Create history log
    if (!senderChatPet) {
      senderChatPet = new Pet({
        name: "Chat Messages", // System identifier
        type: "System",        // Hidden type
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
    
    // Save sender log
    senderChatPet.messages.push({
      senderId: senderId,
      senderName: senderName, // Sender name
      text: `TO: ${receiverPet.name} - ${text}`,
      sentAt: new Date(),
    });
    
    await senderChatPet.save();

    // Return success message
    return new Response(JSON.stringify({ message: "Message sent successfully" }), { status: 200 });

  } catch (err) {
    // Handle server errors
    console.error("Error sending message:", err);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }
}
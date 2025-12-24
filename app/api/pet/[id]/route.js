// app/api/pet/[id]/route.js

// Standard imports
import connectDB from "../../../lib/mongodb";
import Pet from "../../../models/PetModel";
import User from "../../../models/User"; 
import cloudinary from "../../../lib/cloudinary";
// Firebase imports
import { db } from "../../../lib/firebase"; 
import { collection, addDoc, serverTimestamp, doc, setDoc } from "firebase/firestore";
// WhatsApp helper
import { sendWhatsAppText } from "../../../lib/greenApi"; 

// Generate conversation ID
const createConversationId = (petId, uid1, uid2) => {
    const sortedUIDs = [uid1, uid2].sort();
    return `${petId}_${sortedUIDs[0]}_${sortedUIDs[1]}`;
};

// GET request handler
export async function GET(req, context) {
  try {
    await connectDB();
    const { id } = await context.params;
    
    // Fetch pet data
    const pet = await Pet.findById(id).lean();
    if (!pet) return new Response(JSON.stringify({ error: "Pet not found" }), { status: 404 });

    // Fetch owner location
    const owner = await User.findOne({ firebaseUid: pet.ownerId }).select("location").lean();

    const responseData = {
      ...pet,
      // Merge location data
      ownerLocation: owner ? owner.location : pet.location || null, 
    };

    return new Response(JSON.stringify(responseData), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (err) {
    console.error("Error fetching pet:", err);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }
}

// PATCH request handler
export async function PATCH(req, context) {
  try {
    await connectDB();
    const { id } = await context.params;
    
    // Parse request body
    const body = await req.json();
    const { 
      action, 
      requesterId, 
      requesterName, 
      requesterPetId, 
      requesterPetName, 
      messageText,
      answers, // Questionnaire answers
      
      // For Update Certificate
      certificateImage, // Base64 string
      vaccineName,
      vaccinationDate,
      expiryDate
    } = body;

    // Validate user
    if (!requesterId) {
        return new Response(JSON.stringify({ error: "Authentication data missing." }), { status: 401 });
    }
    
    const pet = await Pet.findById(id);
    if (!pet) return new Response(JSON.stringify({ error: "Pet not found" }), { status: 404 });

    // --- HANDLE: TRANSFER TO ADOPTION ---
    if (action === "transferToAdoption") {
        if (pet.ownerId !== requesterId) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 403 });
        }
        
        pet.listingType = "Adoption";
        // Optionally, you could reset mating-specific fields here if desired, 
        // but keeping history is usually better.
        
        await pet.save();
        return new Response(JSON.stringify({ message: "Pet listing changed to Adoption successfully!" }), { status: 200 });
    }

    // --- HANDLE: UPDATE CERTIFICATE & VACCINATION ---
    if (action === "updateCertificate") {
        if (pet.ownerId !== requesterId) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 403 });
        }

        try {
            // 1. Upload to Cloudinary
            const uploadRes = await cloudinary.uploader.upload(certificateImage, {
                folder: "pet_certificates",
            });

            // 2. Create Vaccination Record
            const newVaccine = {
                vaccineName,
                vaccinationDate: new Date(vaccinationDate),
                expiryDate: new Date(expiryDate),
                status: 'active'
            };

            // 3. Update Pet Fields
            pet.certificateUrl = uploadRes.secure_url;
            pet.vaccinationHistory.push(newVaccine);
            pet.verificationStatus = "pending"; // Reset status for admin review
            
            // Clear previous rejection reason if any
            if (pet.certificateAnalysis) {
                pet.certificateAnalysis.reason = null;
                pet.certificateAnalysis.status = "pending";
            }

            // 4. Log to Medical History
            const logEntry = `\n[${new Date().toLocaleDateString()}] Certificate updated. Added ${vaccineName} (Exp: ${new Date(expiryDate).toLocaleDateString()}).`;
            pet.medicalHistoryLog = (pet.medicalHistoryLog || "") + logEntry;

            await pet.save();
            return new Response(JSON.stringify({ message: "Health record updated successfully!" }), { status: 200 });

        } catch (error) {
            console.error("Certificate update error:", error);
            return new Response(JSON.stringify({ error: "Failed to upload certificate" }), { status: 500 });
        }
    }

    // Handle mating request
    if (action === "matingRequest") {
      if (!requesterPetId || !requesterPetName) {
         return new Response(JSON.stringify({ error: "Requester pet details are required." }), { status: 400 });
      }

      // Add history log
      const newMatingRequest = { 
        requesterId, 
        requesterName, 
        requesterPetId, 
        requesterPetName,
        status: "pending", 
        requestedAt: new Date() 
      };
      pet.matingHistory.push(newMatingRequest);

      // Sync Firestore chat
      if (messageText) {
        // Legacy message log
        pet.messages.push({ 
            senderId: requesterId, 
            senderName: requesterName, 
            text: `REQUEST: ${messageText}`, 
            sentAt: new Date() 
        });

        try {
            const conversationId = createConversationId(pet._id.toString(), requesterId, pet.ownerId);
            // Add initial message
            await addDoc(collection(db, "conversations", conversationId, "messages"), {
                senderId: requesterId,
                senderName: requesterName,
                text: `Mating Request: ${messageText}`,
                createdAt: serverTimestamp(),
            });
            // Update conversation metadata
            await setDoc(doc(db, "conversations", conversationId), {
                petId: pet._id.toString(),
                participants: [requesterId, pet.ownerId],
                lastMessage: `Mating Request: ${messageText}`,
                updatedAt: serverTimestamp()
            }, { merge: true });
        } catch (fsError) {
            console.error("Error syncing request message to Firestore:", fsError);
        }
      }
      
      // Send WhatsApp alert
      try {
        const ownerUser = await User.findOne({ firebaseUid: pet.ownerId }).select('phone name').lean();
        if (ownerUser && ownerUser.phone) {
            const petProfileLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/pet/${pet._id}`;
            const whatsappMessage = `🔔 NEW MATING REQUEST for ${pet.name}! Check PetLink to respond. ${petProfileLink}`;
            const fullPhoneNumber = `91${ownerUser.phone}`;
            await sendWhatsAppText(fullPhoneNumber, whatsappMessage);
        }
      } catch (waError) { console.error("Error sending WhatsApp notification:", waError); }

      await pet.save();
      return new Response(JSON.stringify({ message: "Mating request sent!" }), { status: 200 });
    }

    // Handle legacy message
    if (action === "addMessage") {
      if (!messageText) return new Response(JSON.stringify({ error: "Message text is required" }), { status: 400 });
      
      pet.messages.push({ 
        senderId: requesterId, 
        senderName: requesterName, 
        text: messageText, 
        sentAt: new Date() 
      });
      
      await pet.save();
      return new Response(JSON.stringify({ message: "Message added!" }), { status: 200 });
    }

    // Handle adoption request
    if (action === "adoptionRequest") {
      if (!messageText) return new Response(JSON.stringify({ error: "Reason for adoption required." }), { status: 400 });

      // Check duplicate requests
      const existingRequest = pet.adoptionRequests.find(
        (req) => req.requesterId === requesterId && req.status === "pending"
      );
      if (existingRequest) return new Response(JSON.stringify({ error: "Request already pending." }), { status: 400 });

      // Save adoption application
      pet.adoptionRequests.push({
        requesterId,
        requesterName,
        message: messageText, 
        answers: answers || [], // Save answers
        status: "pending",
        requestedAt: new Date()
      });
      
      // Log system message
      pet.messages.push({
        senderId: "system",
        senderName: "System",
        text: `New adoption application from ${requesterName}: "${messageText}"`,
        sentAt: new Date()
      });

      // Initialize chat session
      try {
        const conversationId = createConversationId(pet._id.toString(), requesterId, pet.ownerId);
        await addDoc(collection(db, "conversations", conversationId, "messages"), {
            senderId: requesterId,
            senderName: requesterName,
            text: `ADOPTION INQUIRY: ${messageText}`,
            createdAt: serverTimestamp(),
        });
        await setDoc(doc(db, "conversations", conversationId), {
            petId: pet._id.toString(),
            participants: [requesterId, pet.ownerId],
            lastMessage: `ADOPTION INQUIRY: ${messageText}`,
            updatedAt: serverTimestamp()
        }, { merge: true });
      } catch (fsError) {
        console.error("Error creating adoption chat:", fsError);
      }

      // Notify owner WhatsApp
      try {
        const ownerUser = await User.findOne({ firebaseUid: pet.ownerId }).select('phone name').lean();
        if (ownerUser && ownerUser.phone) {
            const chatLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/messages`;
            const whatsappMessage = `🔔 NEW ADOPTION REQUEST for ${pet.name} from ${requesterName}!\n\nReason: "${messageText}"\n\nChat with them here: ${chatLink}`;
            const fullPhoneNumber = `91${ownerUser.phone}`;
            await sendWhatsAppText(fullPhoneNumber, whatsappMessage);
        }
      } catch (waError) { console.error("Error sending WhatsApp adoption notification:", waError); }

      await pet.save();
      return new Response(JSON.stringify({ message: "Adoption application submitted!" }), { status: 200 });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400 });

  } catch (err) {
    console.error("Error in PATCH /api/pet/[id]:", err);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }
}

// DELETE request handler
export async function DELETE(req, context) {
    try {
        await connectDB();
        const { id } = await context.params;
        
        const deleted = await Pet.findByIdAndDelete(id);
        if (!deleted) return new Response(JSON.stringify({ error: "Pet not found" }), { status: 404 });

        // Note: Delete Cloudinary images here
        
        return new Response(JSON.stringify({ message: "Pet deleted successfully" }), { status: 200 });
    } catch (err) {
        console.error("Error deleting pet:", err);
        return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
    }
}
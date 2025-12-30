// app/api/pet/[id]/route.js

// Standard imports
import connectDB from "../../../lib/mongodb";
import Pet from "../../../models/PetModel";
import User from "../../../models/User";
import cloudinary from "../../../lib/cloudinary";
import { findMatches } from "../../../lib/matchLogic"; // Import shared logic
import { verifyAuth } from "../../../lib/auth-middleware";

// Firebase imports
import { db } from "../../../lib/firebase";
import { collection, addDoc, serverTimestamp, doc, setDoc, increment } from "firebase/firestore";
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
      expiryDate,

      // For Listing Change
      newType
    } = body;

    // Validate user
    let decodedToken;
    try {
      decodedToken = await verifyAuth(req);
    } catch (authError) {
      return new Response(JSON.stringify({ error: authError.message }), { status: 401 });
    }

    if (!requesterId || decodedToken.uid !== requesterId) {
      return new Response(JSON.stringify({ error: "Authentication failed or mismatch." }), { status: 403 });
    }

    const pet = await Pet.findById(id);
    if (!pet) return new Response(JSON.stringify({ error: "Pet not found" }), { status: 404 });

    // --- HANDLE: CHANGE LISTING TYPE (Mating ↔ Adoption ↔ None) ---
    if (action === "changeListingType") {
      if (pet.ownerId !== requesterId) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 403 });
      }

      const validTypes = ['Mating', 'Adoption', 'None'];
      if (!validTypes.includes(newType)) {
        return new Response(JSON.stringify({ error: "Invalid listing type" }), { status: 400 });
      }

      pet.listingType = newType;

      // Optional: If switching to Adoption, you might want to reset mating fields, 
      // but generally preserving history is safer.

      await pet.save();
      return new Response(JSON.stringify({ message: `Listing changed to ${newType} successfully!` }), { status: 200 });
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

      // --- NEW: VALIDATE MATCH ---
      try {
        // Check if my pet (requesterPetId) considers the target pet (id) a valid match
        // We assume findMatches(requesterPetId) returns valid matches FOR requesterPetId
        const myMatches = await findMatches(requesterPetId);
        const isMatch = myMatches.some(m => m._id.toString() === id);

        // Alternately, check if the target pet considers me a match? 
        // Ideally it should be symmetric.

        if (!isMatch) {
          return new Response(JSON.stringify({ error: "Only matched pets can send requests." }), { status: 403 });
        }
      } catch (matchErr) {
        console.error("Match validation failed:", matchErr);
        // Fallback: If AI fails, maybe allow basic breed match? 
        // For strictness, we might return error, but let's just log and continue if critical failure, 
        // OR fail safe. Plan said "Enforce Match Only", so let's fail if we can't verify.
        // However, findMatches handles errors gracefully by returning DB matches. 
        // If it throws, it's a real error.
        return new Response(JSON.stringify({ error: "Could not verify match status." }), { status: 500 });
      }
      // ----------------------------

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

      // --- FORMATTED MESSAGE WITH LINKS ---
      // "[PetA](/pet/ID_A) sent mating request to [PetB](/pet/ID_B)"
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
      // We use relative paths for internal links in markdown usually, but let's stick to simple markdown 
      // formatted text that our frontend parser will handle.
      const formattedMessageText = `[${requesterPetName}](/pet/${requesterPetId}) sent mating request to [${pet.name}](/pet/${pet._id})`;
      // ------------------------------------

      // Sync Firestore chat
      if (messageText || formattedMessageText) {
        // Legacy message log (storing formatted system message)
        pet.messages.push({
          senderId: "system", // Mark as system to prevent impersonation? Or use requesterId but with special formatting?
          // User requested: "must show petAA send mating request to PetBB (in this message petAA and PetBB is inside link tag)"
          // Usually this is a system notification "on behalf" of the user.
          senderName: requesterName,
          text: formattedMessageText,
          sentAt: new Date()
        });

        try {
          const conversationId = createConversationId(pet._id.toString(), requesterId, pet.ownerId);
          // Add initial message
          await addDoc(collection(db, "conversations", conversationId, "messages"), {
            senderId: requesterId,
            senderName: requesterName,
            text: formattedMessageText, // Send the rich text
            createdAt: serverTimestamp(),
          });

          // If user added a personal note, send that too
          if (messageText) {
            await addDoc(collection(db, "conversations", conversationId, "messages"), {
              senderId: requesterId,
              senderName: requesterName,
              text: messageText,
              createdAt: serverTimestamp(),
            });
          }

          // Update conversation metadata & increment unread count for owner
          await setDoc(doc(db, "conversations", conversationId), {
            petId: pet._id.toString(),
            participants: [requesterId, pet.ownerId],
            lastMessage: formattedMessageText,
            updatedAt: serverTimestamp(),
            [`unreadCounts.${pet.ownerId}`]: increment(1)
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
          const whatsappMessage = `🔔 NEW MATING REQUEST for ${pet.name}! ${requesterPetName} is interested. Check PetLink: ${petProfileLink}`;
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

    // Verify Auth
    let decodedToken;
    try {
      decodedToken = await verifyAuth(req);
    } catch (authError) {
      return new Response(JSON.stringify({ error: authError.message }), { status: 401 });
    }

    const pet = await Pet.findById(id);
    if (!pet) return new Response(JSON.stringify({ error: "Pet not found" }), { status: 404 });

    // Verify Ownership
    if (pet.ownerId !== decodedToken.uid) {
      return new Response(JSON.stringify({ error: "Unauthorized: You do not own this pet." }), { status: 403 });
    }

    await Pet.findByIdAndDelete(id);

    // Note: Delete Cloudinary images here

    return new Response(JSON.stringify({ message: "Pet deleted successfully" }), { status: 200 });
  } catch (err) {
    console.error("Error deleting pet:", err);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }
}
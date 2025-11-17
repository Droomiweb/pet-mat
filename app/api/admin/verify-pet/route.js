// app/api/admin/verify-pet/route.js
import connectDB from "../../../lib/mongodb";
import Pet from "../../../models/PetModel";
import User from "../../../models/User"; // We need this to check if the user is an admin
// You may need a firebase-admin setup for secure backend auth checks
// import { auth } from "../../../lib/firebase-admin"; 

export async function POST(req) {
  try {
    await connectDB();

    // 1. Get the new status and petId from the request body
    const { petId, newStatus, firebaseUid } = await req.json();

    if (!petId || !newStatus || !firebaseUid) {
      return new Response(JSON.stringify({ error: "petId, newStatus, and firebaseUid are required" }), { status: 400 });
    }

    // 2. Validate the new status
    const validStatuses = ['verified', 'rejected', 'pending'];
    if (!validStatuses.includes(newStatus)) {
      return new Response(JSON.stringify({ error: "Invalid status provided." }), { status: 400 });
    }
    
    // 3. Check if the user is an admin
    // We fetch the user from our DB to check their admin status
    const user = await User.findOne({ firebaseUid: firebaseUid });
    if (!user || !user.isAdmin) {
       return new Response(JSON.stringify({ error: "Unauthorized: Not an admin" }), { status: 403 });
    }

    // 4. Find the pet and update it
    const updatedPet = await Pet.findByIdAndUpdate(
      petId,
      { 
        $set: { 
          verificationStatus: newStatus,
          // We also update the aiStatus to show an admin override
          'verificationAnalysis.aiStatus': newStatus === 'verified' ? 'admin-verified' : newStatus === 'rejected' ? 'admin-rejected' : 'pending'
        } 
      },
      { new: true } // Return the updated document
    );

    if (!updatedPet) {
      return new Response(JSON.stringify({ error: "Pet not found" }), { status: 404 });
    }

    return new Response(JSON.stringify({ message: "Pet verification status updated successfully", pet: updatedPet }), { status: 200 });

  } catch (err) {
    console.error("Error in admin pet verification:", err);
    return new Response(JSON.stringify({ error: "Server error: " + err.message }), { status: 500 });
  }
}
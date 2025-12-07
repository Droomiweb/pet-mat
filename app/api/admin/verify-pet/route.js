// app/api/admin/verify-pet/route.js

// 1. IMPORTS
// Standard imports for DB connection and Mongoose models.
import connectDB from "../../../lib/mongodb";
import Pet from "../../../models/PetModel";
import User from "../../../models/User"; 

export async function POST(req) {
  try {
    // Ensure database connection is active.
    await connectDB();

    // 2. PARSE REQUEST BODY
    // We expect the ID of the pet to update, the status to apply, 
    // and the UID of the user attempting the action (for authorization).
    const { petId, newStatus, firebaseUid } = await req.json();

    // 3. INPUT VALIDATION
    // Fail fast if any required data is missing.
    if (!petId || !newStatus || !firebaseUid) {
      return new Response(JSON.stringify({ error: "petId, newStatus, and firebaseUid are required" }), { status: 400 });
    }

    // 4. STATUS VALIDATION
    // Ensure the status is one of the allowed string values in your Schema.
    const validStatuses = ['verified', 'rejected', 'pending'];
    if (!validStatuses.includes(newStatus)) {
      return new Response(JSON.stringify({ error: "Invalid status provided." }), { status: 400 });
    }
    
    // 5. ADMIN AUTHORIZATION CHECK
    // Security Step: Look up the user by their UID to ensure they are actually an Admin.
    const user = await User.findOne({ firebaseUid: firebaseUid });
    
    // If user doesn't exist or isAdmin is false/null, deny access.
    if (!user || !user.isAdmin) {
       return new Response(JSON.stringify({ error: "Unauthorized: Not an admin" }), { status: 403 });
    }

    // 6. UPDATE THE PET
    // We use findByIdAndUpdate to perform the change atomically.
    const updatedPet = await Pet.findByIdAndUpdate(
      petId,
      { 
        $set: { 
          // Update the main status displayed to users
          verificationStatus: newStatus,
          
          // Update the internal analysis status.
          // This creates an audit trail indicating a human admin overrode the AI.
          'verificationAnalysis.aiStatus': 
              newStatus === 'verified' ? 'admin-verified' : 
              newStatus === 'rejected' ? 'admin-rejected' : 
              'pending'
        } 
      },
      { new: true } // Option: Return the *updated* document (not the old one)
    );

    // 7. HANDLE NOT FOUND
    if (!updatedPet) {
      return new Response(JSON.stringify({ error: "Pet not found" }), { status: 404 });
    }

    // 8. SUCCESS RESPONSE
    return new Response(JSON.stringify({ 
      message: "Pet verification status updated successfully", 
      pet: updatedPet 
    }), { status: 200 });

  } catch (err) {
    // 9. ERROR HANDLING
    console.error("Error in admin pet verification:", err);
    return new Response(JSON.stringify({ error: "Server error: " + err.message }), { status: 500 });
  }
}
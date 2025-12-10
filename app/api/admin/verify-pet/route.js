// app/api/admin/verify-pet/route.js

// Standard imports
import connectDB from "../../../lib/mongodb";
import Pet from "../../../models/PetModel";
import User from "../../../models/User"; 

export async function POST(req) {
  try {
    // Connect to database
    await connectDB();

    // Parse request data
    const { petId, newStatus, firebaseUid } = await req.json();

    // Validate required fields
    if (!petId || !newStatus || !firebaseUid) {
      return new Response(JSON.stringify({ error: "petId, newStatus, and firebaseUid are required" }), { status: 400 });
    }

    // Validate status type
    const validStatuses = ['verified', 'rejected', 'pending'];
    if (!validStatuses.includes(newStatus)) {
      return new Response(JSON.stringify({ error: "Invalid status provided." }), { status: 400 });
    }
    
    // Check admin access
    const user = await User.findOne({ firebaseUid: firebaseUid });
    
    // Verify admin permissions
    if (!user || !user.isAdmin) {
       return new Response(JSON.stringify({ error: "Unauthorized: Not an admin" }), { status: 403 });
    }

    // Update pet status
    const updatedPet = await Pet.findByIdAndUpdate(
      petId,
      { 
        $set: { 
          // Set visible status
          verificationStatus: newStatus,
          
          // Update analysis trail
          'verificationAnalysis.aiStatus': 
              newStatus === 'verified' ? 'admin-verified' : 
              newStatus === 'rejected' ? 'admin-rejected' : 
              'pending'
        } 
      },
      { new: true } // Return updated document
    );

    // Handle missing pet
    if (!updatedPet) {
      return new Response(JSON.stringify({ error: "Pet not found" }), { status: 404 });
    }

    // Return success response
    return new Response(JSON.stringify({ 
      message: "Pet verification status updated successfully", 
      pet: updatedPet 
    }), { status: 200 });

  } catch (err) {
    // Log server errors
    console.error("Error in admin pet verification:", err);
    return new Response(JSON.stringify({ error: "Server error: " + err.message }), { status: 500 });
  }
}
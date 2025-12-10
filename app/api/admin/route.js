// app/api/admin/route.js

// Standard imports
import connectDB from "../../lib/mongodb";
import Pet from "../../models/PetModel"; 
import User from "../../models/User";
import Product from "../../models/ProductModel";
import admin from "../../lib/firebaseAdmin"; // Import Firebase Admin

// GET request handler
export async function GET(req) {
  try {
    await connectDB();
    
    // Fetch all entities
    const pets = await Pet.find({}).lean();
    const users = await User.find({}).lean();
    const products = await Product.find({}).lean();

    // Aggregate mating requests
    const acceptedMatingRequests = await Pet.aggregate([
      { $unwind: "$matingHistory" },
      { $match: { "matingHistory.status": "accepted" } },
      // Link Sire details
      { $addFields: { requesterPetObjId: { $toObjectId: "$matingHistory.requesterPetId" } } },
      { $lookup: { from: "pets", localField: "requesterPetObjId", foreignField: "_id", as: "sireDetails" } },
      { $unwind: "$sireDetails" },
      // Format output
      { $project: { 
          _id: 0, 
          damPet: { _id: "$_id", name: "$name", ownerId: "$ownerId", type: "$type", breed: "$breed" }, 
          sirePet: { _id: "$sireDetails._id", name: "$sireDetails.name", ownerId: "$sireDetails.ownerId" }, 
          matingRequest: "$matingHistory" 
      } }
    ]);
    
    // Fetch pending reviews
    const pendingVerificationPets = await Pet.find({ 
      verificationStatus: { $in: ['pending', 'needs-review'] } 
    }).lean();

    // Return dashboard data
    return new Response(JSON.stringify({ 
      pets, 
      users, 
      products, 
      acceptedMatingRequests,
      pendingVerificationPets
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Admin Dashboard Error:", err);
    return new Response(JSON.stringify({ error: "Failed to fetch data" }), { status: 500 });
  }
}

// PATCH request handler
export async function PATCH(req) {
  try {
    await connectDB();
    
    // Parse action data
    const { action, petId, status, userId, makeAdmin, targetUid } = await req.json();

    // Update pet status
    if (action === "updatePetStatus") {
      if (!petId || !status) return new Response(JSON.stringify({ error: "Invalid data" }), { status: 400 });
      
      const updatedPet = await Pet.findByIdAndUpdate(
        petId, 
        { verificationStatus: status, isBanned: status === 'rejected' }, 
        { new: true }
      );
      
      return new Response(JSON.stringify({ message: "Pet updated", pet: updatedPet }), { status: 200 });

    // Ban user
    } else if (action === "banUser") {
      if (!userId) return new Response(JSON.stringify({ error: "Invalid userId" }), { status: 400 });
      
      const updatedUser = await User.findByIdAndUpdate(userId, { isBanned: true }, { new: true });
      return new Response(JSON.stringify({ message: "User banned", user: updatedUser }), { status: 200 });
    
    // Toggle admin role
    } else if (action === "toggleAdminStatus") {
      if (!userId) return new Response(JSON.stringify({ error: "Invalid userId" }), { status: 400 });
      
      const updatedUser = await User.findByIdAndUpdate(userId, { isAdmin: makeAdmin }, { new: true });
      return new Response(JSON.stringify({ message: "Admin status updated", user: updatedUser }), { status: 200 });
    
    // Delete user completely
    } else if (action === "removeUser") {
        if (!targetUid || typeof targetUid !== 'string') {
            return new Response(JSON.stringify({ error: "Target UID required" }), { status: 400 });
        }
        
        console.log(`[Admin PATCH] Deleting user: ${targetUid}`);

        // Direct Firebase deletion
        try {
            await admin.auth().deleteUser(targetUid);
        } catch (fbError) {
            // Ignore if missing
            if (fbError.code !== 'auth/user-not-found') {
                console.error("Firebase Delete Error:", fbError);
                throw new Error("Failed to delete user from Auth");
            }
        }

        // Direct Database deletion
        await User.findOneAndDelete({ firebaseUid: targetUid });
        
        return new Response(JSON.stringify({ message: "User permanently deleted" }), { status: 200 });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400 });

  } catch (err) {
    console.error("Admin Action Error:", err);
    return new Response(JSON.stringify({ error: err.message || "Action failed" }), { status: 500 });
  }
}

// DELETE request handler (Products)
export async function DELETE(req) {
  try {
    await connectDB();
    const { productId } = await req.json();
    
    // Delete product document
    const deletedProduct = await Product.findByIdAndDelete(productId);
    
    if (!deletedProduct) { return new Response(JSON.stringify({ error: "Product not found" }), { status: 404 }); }
    
    // Return success message
    return new Response(JSON.stringify({ message: "Product deleted successfully" }), { status: 200 });
  } catch (err) {
    console.error("Error deleting product:", err);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }
}
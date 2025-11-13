// app/api/admin/route.js
import connectDB from "../../lib/mongodb";
import Pet from "../../models/PetModel"; 
import User from "../../models/User";
import Product from "../../models/ProductModel";
import mongoose from 'mongoose'; 

// GET all pets, users, products, etc.
export async function GET(req) {
  try {
    await connectDB();
    
    const pets = await Pet.find({}).lean();
    const users = await User.find({}).lean();
    const products = await Product.find({}).lean();

    // --- Fetch Accepted Mating Requests ---
    const acceptedMatingRequests = await Pet.aggregate([
      { $unwind: "$matingHistory" },
      { $match: { "matingHistory.status": "accepted" } },
      { $addFields: { requesterPetObjId: { $toObjectId: "$matingHistory.requesterPetId" } } },
      { $lookup: { from: "pets", localField: "requesterPetObjId", foreignField: "_id", as: "sireDetails" } },
      { $unwind: "$sireDetails" },
      { $project: { _id: 0, damPet: { _id: "$_id", name: "$name", ownerId: "$ownerId" }, sirePet: { _id: "$sireDetails._id", name: "$sireDetails.name", ownerId: "$sireDetails.ownerId" }, matingRequest: "$matingHistory" } }
    ]);
    
    // --- UPDATED: Fetch Pending *Verification* Requests ---
    // This is more useful for admins now
    const pendingVerificationPets = await Pet.find({ 
      verificationStatus: { $in: ['pending', 'needs-review'] } 
    }).lean();
    
    // (We removed the pendingAdoptionRequests fetch as admins no longer handle it)

    return new Response(JSON.stringify({ 
      pets, 
      users, 
      products, 
      acceptedMatingRequests,
      pendingVerificationPets // <-- Return new data
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error fetching all data for admin:", err);
    return new Response(JSON.stringify({ error: "Failed to fetch data", details: err.message }), { status: 500 });
  }
}

// PATCH for admin actions
export async function PATCH(req) {
  try {
    await connectDB();
    // Added 'targetUid' for removeUser action
    const { action, petId, status, userId, makeAdmin, targetUid } = await req.json();

    if (action === "updatePetStatus") {
      // Admin can manually override verification
      if (!petId || !['verified', 'rejected', 'pending'].includes(status)) {
        return new Response(JSON.stringify({ error: "Invalid status or petId" }), { status: 400 });
      }
      const updatedPet = await Pet.findByIdAndUpdate(petId, { verificationStatus: status, isBanned: status === 'rejected' }, { new: true });
      if (!updatedPet) { return new Response(JSON.stringify({ error: "Pet not found" }), { status: 404 }); }
      return new Response(JSON.stringify({ message: "Pet status updated", pet: updatedPet }), { status: 200 });

    } else if (action === "banUser") {
      if (!userId) { return new Response(JSON.stringify({ error: "Invalid userId" }), { status: 400 }); }
      // This just 'bans' (soft delete), does not remove
      const updatedUser = await User.findByIdAndUpdate(userId, { isBanned: true }, { new: true });
      if (!updatedUser) { return new Response(JSON.stringify({ error: "User not found" }), { status: 404 }); }
      return new Response(JSON.stringify({ message: "User banned", user: updatedUser }), { status: 200 });
    
    } else if (action === "toggleAdminStatus") {
      if (!userId || typeof makeAdmin !== 'boolean') { return new Response(JSON.stringify({ error: "Invalid userId or admin status" }), { status: 400 }); }
      const updatedUser = await User.findByIdAndUpdate(userId, { isAdmin: makeAdmin }, { new: true });
      if (!updatedUser) { return new Response(JSON.stringify({ error: "User not found" }), { status: 404 }); }
      return new Response(JSON.stringify({ message: "User admin status updated", user: updatedUser }), { status: 200 });
    
    // --- NEW: Remove User Action ---
    } else if (action === "removeUser") {
        if (!targetUid) {
            return new Response(JSON.stringify({ error: "Invalid targetUid provided" }), { status: 400 });
        }
        
        // Get Base URL for internal API call
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        
        // We call our new dedicated DELETE endpoint
        const deleteResponse = await fetch(`${baseUrl}/api/admin/user/${targetUid}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                // TODO: Add admin auth token here for security
            }
        });
        
        if (!deleteResponse.ok) {
            const errorData = await deleteResponse.json();
            throw new Error(errorData.error || 'Failed to delete user');
        }
        
        const data = await deleteResponse.json();
        return new Response(JSON.stringify({ message: data.message }), { status: 200 });
    
    // --- REMOVED: Adoption Status Action ---
    // } else if (action === "updateAdoptionStatus") { ... }
    // (This logic is now in /api/pet/requests)

    }

    return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400 });
  } catch (err) {
    console.error("Error in admin PATCH:", err);
    return new Response(JSON.stringify({ error: "Internal Server Error", details: err.message }), { status: 500 });
  }
}

// DELETE a product (unchanged)
export async function DELETE(req) {
  try {
    await connectDB();
    const { productId } = await req.json();
    const deletedProduct = await Product.findByIdAndDelete(productId);
    if (!deletedProduct) { return new Response(JSON.stringify({ error: "Product not found" }), { status: 404 }); }
    // ... (cloudinary delete logic) ...
    return new Response(JSON.stringify({ message: "Product deleted successfully" }), { status: 200 });
  } catch (err) {
    console.error("Error deleting product:", err);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }
}
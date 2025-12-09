// app/api/admin/route.js

// 1. IMPORTS
import connectDB from "../../lib/mongodb";
import Pet from "../../models/PetModel"; 
import User from "../../models/User";
import Product from "../../models/ProductModel";
import mongoose from 'mongoose'; 

// 2. GET HANDLER
// Fetches the "Big Picture" state for the Admin Dashboard.
// Returns lists of pets, users, products, and specific action items like mating requests.
export async function GET(req) {
  try {
    await connectDB();
    
    // Fetch raw lists of all main entities (using .lean() for performance since we don't need Mongoose methods).
    const pets = await Pet.find({}).lean();
    const users = await User.find({}).lean();
    const products = await Product.find({}).lean();

    // --- FETCH ACCEPTED MATING REQUESTS ---
    // Complex Aggregation:
    // 1. Unwind: Split the 'matingHistory' array so every request is its own document.
    // 2. Match: Filter only for requests where status is 'accepted' (needs Admin confirmation).
    // 3. Lookup: "Join" with the Pet collection to get the Sire's (Father's) details using 'requesterPetId'.
    // 4. Project: Format the output cleanly so the frontend gets a simple { damPet, sirePet, request } object.
    const acceptedMatingRequests = await Pet.aggregate([
      { $unwind: "$matingHistory" },
      { $match: { "matingHistory.status": "accepted" } },
      // Convert string ID to ObjectId for the lookup to work
      { $addFields: { requesterPetObjId: { $toObjectId: "$matingHistory.requesterPetId" } } },
      { $lookup: { from: "pets", localField: "requesterPetObjId", foreignField: "_id", as: "sireDetails" } },
      { $unwind: "$sireDetails" },
      { $project: { 
          _id: 0, 
          damPet: { _id: "$_id", name: "$name", ownerId: "$ownerId", type: "$type", breed: "$breed" }, 
          sirePet: { _id: "$sireDetails._id", name: "$sireDetails.name", ownerId: "$sireDetails.ownerId" }, 
          matingRequest: "$matingHistory" 
      } }
    ]);
    
    // --- FETCH PENDING VERIFICATIONS ---
    // Focus the admin's attention on pets that specifically need review.
    // 'pending': New uploads waiting for AI or Human check.
    // 'needs-review': AI was unsure and flagged for human intervention.
    const pendingVerificationPets = await Pet.find({ 
      verificationStatus: { $in: ['pending', 'needs-review'] } 
    }).lean();

    // Return the aggregated dashboard data
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
    console.error("Error fetching all data for admin:", err);
    return new Response(JSON.stringify({ error: "Failed to fetch data", details: err.message }), { status: 500 });
  }
}

// 3. PATCH HANDLER
// Handles various Admin actions via a switch-like structure based on the 'action' field.
export async function PATCH(req) {
  try {
    await connectDB();
    
    // Extract parameters. 'action' determines what logic to run.
    const { action, petId, status, userId, makeAdmin, targetUid } = await req.json();

    // --- ACTION: UPDATE PET STATUS ---
    // Manually verifying or rejecting a pet listing.
    
    if (action === "updatePetStatus") {
      if (!petId || !['verified', 'rejected', 'pending'].includes(status)) {
        return new Response(JSON.stringify({ error: "Invalid status or petId" }), { status: 400 });
      }
      
      const updatedPet = await Pet.findByIdAndUpdate(
        petId, 
        { 
            verificationStatus: status, 
            isBanned: status === 'rejected' // Auto-ban if rejected by admin
        }, 
        { new: true }
      );
      
      if (!updatedPet) { return new Response(JSON.stringify({ error: "Pet not found" }), { status: 404 }); }
      return new Response(JSON.stringify({ message: "Pet status updated", pet: updatedPet }), { status: 200 });

    // --- ACTION: BAN USER ---
    // Soft ban (sets a flag), preventing login or actions without deleting data.
    } else if (action === "banUser") {
      if (!userId) { return new Response(JSON.stringify({ error: "Invalid userId" }), { status: 400 }); }
      
      const updatedUser = await User.findByIdAndUpdate(userId, { isBanned: true }, { new: true });
      if (!updatedUser) { return new Response(JSON.stringify({ error: "User not found" }), { status: 404 }); }
      return new Response(JSON.stringify({ message: "User banned", user: updatedUser }), { status: 200 });
    
    // --- ACTION: TOGGLE ADMIN ---
    // Promote or demote a user to/from Admin status.
    } else if (action === "toggleAdminStatus") {
      if (!userId || typeof makeAdmin !== 'boolean') { return new Response(JSON.stringify({ error: "Invalid userId or admin status" }), { status: 400 }); }
      
      const updatedUser = await User.findByIdAndUpdate(userId, { isAdmin: makeAdmin }, { new: true });
      if (!updatedUser) { return new Response(JSON.stringify({ error: "User not found" }), { status: 404 }); }
      return new Response(JSON.stringify({ message: "User admin status updated", user: updatedUser }), { status: 200 });
    
    // --- ACTION: REMOVE USER (DESTRUCTIVE) ---
    // Calls the dedicated deletion endpoint to ensure full cleanup (DB + Cloudinary + Firebase).
    } else if (action === "removeUser") {
        if (!targetUid) {
            return new Response(JSON.stringify({ error: "Invalid targetUid provided" }), { status: 400 });
        }
        
        // Construct the internal API URL. 
        // process.env.NEXT_PUBLIC_APP_URL is ideal for production, localhost for dev.
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        
        // Call the endpoint we created: /api/admin/user/[uid]
        const deleteResponse =await fetch(`${baseUrl}/api/admin/user/${targetUid}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                // Note: In production, you should pass the current admin's auth token here
                // to protect the deletion route.
            }
        });
        
        // Handle failure of the deletion sub-routine
        if (!deleteResponse.ok) {
            const errorData = await deleteResponse.json();
            throw new Error(errorData.error || 'Failed to delete user');
        }
        
        const data = await deleteResponse.json();
        return new Response(JSON.stringify({ message: data.message }), { status: 200 });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400 });

  } catch (err) {
    console.error("Error in admin PATCH:", err);
    return new Response(JSON.stringify({ error: "Internal Server Error", details: err.message }), { status: 500 });
  }
}

// 4. DELETE HANDLER (Products)
// Simple direct deletion for marketplace products.
export async function DELETE(req) {
  try {
    await connectDB();
    const { productId } = await req.json();
    
    // Find and remove product
    const deletedProduct = await Product.findByIdAndDelete(productId);
    
    if (!deletedProduct) { return new Response(JSON.stringify({ error: "Product not found" }), { status: 404 }); }
    
    // Note: If Products have images in Cloudinary, add image cleanup logic here 
    // similar to how we did it for User deletion.

    return new Response(JSON.stringify({ message: "Product deleted successfully" }), { status: 200 });
  } catch (err) {
    console.error("Error deleting product:", err);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }
}
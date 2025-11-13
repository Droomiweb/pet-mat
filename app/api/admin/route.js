// app/api/admin/route.js
import connectDB from "../../lib/mongodb";
import Pet from "../../models/PetModel"; // Make sure to import Pet
import User from "../../models/User";
import Product from "../../models/ProductModel";
import cloudinary from "../../lib/cloudinary";
import mongoose from 'mongoose'; // Import mongoose for ObjectId

// GET all pets, users, products, AND accepted requests
export async function GET(req) {
  try {
    await connectDB();
    
    // Fetch existing data
    const pets = await Pet.find({}).lean();
    const users = await User.find({}).lean();
    const products = await Product.find({}).lean();

    // --- Fetch Accepted Mating Requests ---
    const acceptedMatingRequests = await Pet.aggregate([
      // ... (your existing aggregation logic for mating)
      { $unwind: "$matingHistory" },
      { $match: { "matingHistory.status": "accepted" } },
      { $addFields: { requesterPetObjId: { $toObjectId: "$matingHistory.requesterPetId" } } },
      { $lookup: { from: "pets", localField: "requesterPetObjId", foreignField: "_id", as: "sireDetails" } },
      { $unwind: "$sireDetails" },
      { $project: { _id: 0, damPet: { _id: "$_id", name: "$name", ownerId: "$ownerId" }, sirePet: { _id: "$sireDetails._id", name: "$sireDetails.name", ownerId: "$sireDetails.ownerId" }, matingRequest: "$matingHistory" } }
    ]);
    // --- END Mating ---

    // --- *** NEW: Fetch Pending Adoption Requests *** ---
    const pendingAdoptionRequests = await Pet.aggregate([
      // 1. Deconstruct the adoptionRequests array
      { $unwind: "$adoptionRequests" },
      // 2. Filter for only "pending" requests
      { $match: { "adoptionRequests.status": "pending" } },
      // 3. Project the data we need for the admin panel
      {
        $project: {
          _id: 0, // Exclude the default _id
          pet: { // The pet being requested
            _id: "$_id",
            name: "$name",
            ownerId: "$ownerId"
          },
          request: "$adoptionRequests" // The specific request object
        }
      }
    ]);
    // --- *** END NEW *** ---


    return new Response(JSON.stringify({ 
      pets, 
      users, 
      products, 
      acceptedMatingRequests,
      pendingAdoptionRequests // <-- Return the new data
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error fetching all pets, users, and products for admin:", err);
    return new Response(JSON.stringify({ error: "Failed to fetch data", details: err.message }), { status: 500 });
  }
}

// PATCH to update a pet's verification status, ban a user, or change a user's admin status
export async function PATCH(req) {
  try {
    await connectDB();
    const { action, petId, status, userId, makeAdmin, requestId, newStatus } = await req.json();

    if (action === "updatePetStatus") {
      // ... (your existing updatePetStatus logic)
      if (!petId || !['verified', 'rejected'].includes(status)) {
        return new Response(JSON.stringify({ error: "Invalid status or petId provided" }), { status: 400 });
      }
      const updatedPet = await Pet.findByIdAndUpdate(petId, { verificationStatus: status, isBanned: status === 'rejected' }, { new: true });
      if (!updatedPet) { return new Response(JSON.stringify({ error: "Pet not found" }), { status: 404 }); }
      return new Response(JSON.stringify({ message: "Pet status updated successfully!", pet: updatedPet }), { status: 200 });

    } else if (action === "banUser") {
      // ... (your existing banUser logic)
      if (!userId) { return new Response(JSON.stringify({ error: "Invalid userId provided" }), { status: 400 }); }
      const updatedUser = await User.findByIdAndUpdate(userId, { isBanned: true }, { new: true });
      if (!updatedUser) { return new Response(JSON.stringify({ error: "User not found" }), { status: 404 }); }
      return new Response(JSON.stringify({ message: "User banned successfully!", user: updatedUser }), { status: 200 });
    
    } else if (action === "toggleAdminStatus") {
      // ... (your existing toggleAdminStatus logic)
      if (!userId || typeof makeAdmin !== 'boolean') { return new Response(JSON.stringify({ error: "Invalid userId or admin status provided" }), { status: 400 }); }
      const updatedUser = await User.findByIdAndUpdate(userId, { isAdmin: makeAdmin }, { new: true });
      if (!updatedUser) { return new Response(JSON.stringify({ error: "User not found" }), { status: 404 }); }
      return new Response(JSON.stringify({ message: `User admin status updated to ${makeAdmin}`, user: updatedUser }), { status: 200 });
    
    // --- *** NEW: UPDATE ADOPTION REQUEST STATUS ACTION *** ---
    } else if (action === "updateAdoptionStatus") {
        if (!petId || !requestId || !['approved', 'rejected'].includes(newStatus)) {
            return new Response(JSON.stringify({ error: "Invalid petId, requestId, or newStatus provided" }), { status: 400 });
        }

        const pet = await Pet.findById(petId);
        if (!pet) {
            return new Response(JSON.stringify({ error: "Pet not found" }), { status: 404 });
        }

        const request = pet.adoptionRequests.id(requestId);
        if (!request) {
            return new Response(JSON.stringify({ error: "Adoption request not found" }), { status: 404 });
        }

        request.status = newStatus;
        
        // If approved, you could optionally reject all other pending requests
        if (newStatus === 'approved') {
            pet.adoptionRequests.forEach(req => {
                if (req.id !== requestId && req.status === 'pending') {
                    req.status = 'rejected';
                }
            });
            // You could also change the pet's ownerId here if you have the requester's new ownerId
            // pet.ownerId = request.requesterId;
        }

        await pet.save();
        return new Response(JSON.stringify({ message: `Adoption request ${newStatus}` }), { status: 200 });
    // --- *** END NEW ACTION *** ---
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400 });
  } catch (err) {
    console.error("Error updating status:", err);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }
}

// DELETE a product
export async function DELETE(req) {
  // ... (your existing DELETE logic)
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
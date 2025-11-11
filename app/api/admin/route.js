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

    // --- NEW: Fetch Accepted Mating Requests ---
    // This is an aggregation pipeline to find accepted requests and join parent data
    const acceptedMatingRequests = await Pet.aggregate([
      // 1. Deconstruct the matingHistory array
      { $unwind: "$matingHistory" },
      
      // 2. Filter for only "accepted" requests
      { $match: { "matingHistory.status": "accepted" } },
      
      // 3. Convert requesterPetId string to ObjectId for lookup
      {
        $addFields: {
          requesterPetObjId: { $toObjectId: "$matingHistory.requesterPetId" }
        }
      },
      
      // 4. Join with the pets collection to get the Sire's (father's) details
      {
        $lookup: {
          from: "pets", // The name of the collection (usually lowercase plural)
          localField: "requesterPetObjId",
          foreignField: "_id",
          as: "sireDetails"
        }
      },
      
      // 5. Deconstruct the (single item) sireDetails array
      { $unwind: "$sireDetails" },
      
      // 6. Project the data we need for the admin panel
      {
        $project: {
          _id: 0, // Exclude the default _id
          damPet: { // Mother's details
            _id: "$_id",
            name: "$name",
            ownerId: "$ownerId"
          },
          sirePet: { // Father's details
            _id: "$sireDetails._id",
            name: "$sireDetails.name",
            ownerId: "$sireDetails.ownerId"
          },
          matingRequest: "$matingHistory" // The specific request object
        }
      }
    ]);
    // --- END NEW ---

    return new Response(JSON.stringify({ 
      pets, 
      users, 
      products, 
      acceptedMatingRequests // Return the new data
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error fetching all pets, users, and products for admin:", err);
    return new Response(JSON.stringify({ error: "Failed to fetch data", details: err.message }), { status: 500 });
  }
}

// ... (PATCH and DELETE functions remain the same) ...
// PATCH to update a pet's verification status, ban a user, or change a user's admin status
export async function PATCH(req) {
  try {
    await connectDB();
    const { action, petId, status, userId, makeAdmin } = await req.json();

    if (action === "updatePetStatus") {
      if (!petId || !['verified', 'rejected'].includes(status)) {
        return new Response(JSON.stringify({ error: "Invalid status or petId provided" }), { status: 400 });
      }

      const updatedPet = await Pet.findByIdAndUpdate(
        petId,
        { verificationStatus: status, isBanned: status === 'rejected' },
        { new: true }
      );

      if (!updatedPet) {
        return new Response(JSON.stringify({ error: "Pet not found" }), { status: 404 });
      }
      return new Response(JSON.stringify({ message: "Pet status updated successfully!", pet: updatedPet }), { status: 200 });

    } else if (action === "banUser") {
      if (!userId) {
        return new Response(JSON.stringify({ error: "Invalid userId provided" }), { status: 400 });
      }

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { isBanned: true },
        { new: true }
      );

      if (!updatedUser) {
        return new Response(JSON.stringify({ error: "User not found" }), { status: 404 });
      }
      return new Response(JSON.stringify({ message: "User banned successfully!", user: updatedUser }), { status: 200 });
    }
    
    else if (action === "toggleAdminStatus") {
      if (!userId || typeof makeAdmin !== 'boolean') {
        return new Response(JSON.stringify({ error: "Invalid userId or admin status provided" }), { status: 400 });
      }
      
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { isAdmin: makeAdmin },
        { new: true }
      );

      if (!updatedUser) {
        return new Response(JSON.stringify({ error: "User not found" }), { status: 404 });
      }
      return new Response(JSON.stringify({ message: `User admin status updated to ${makeAdmin}`, user: updatedUser }), { status: 200 });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400 });
  } catch (err) {
    console.error("Error updating status:", err);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }
}

// DELETE a product
export async function DELETE(req) {
  try {
    await connectDB();
    const { productId } = await req.json();

    const deletedProduct = await Product.findByIdAndDelete(productId);

    if (!deletedProduct) {
      return new Response(JSON.stringify({ error: "Product not found" }), { status: 404 });
    }

    if (deletedProduct.images?.length > 0) {
      for (const imageUrl of deletedProduct.images) {
        const publicId = `products/${deletedProduct.ownerId}/${imageUrl.split('/').pop().split('.')[0]}`;
        await cloudinary.uploader.destroy(publicId);
      }
    }

    return new Response(JSON.stringify({ message: "Product deleted successfully" }), { status: 200 });
  } catch (err) {
    console.error("Error deleting product:", err);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }
}
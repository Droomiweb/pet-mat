// app/api/admin/route.js
import connectDB from "../../lib/mongodb";
import Pet from "../../models/PetModel";
import User from "../../models/User";
import Product from "../../models/ProductModel";
import cloudinary from "../../lib/cloudinary";

// GET all pets, users, and products for the admin panel
export async function GET(req) {
  try {
    await connectDB();
    const pets = await Pet.find({}).lean();
    const users = await User.find({}).lean();
    const products = await Product.find({}).lean();

    return new Response(JSON.stringify({ pets, users, products }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error fetching all pets, users, and products for admin:", err);
    return new Response(JSON.stringify({ error: "Failed to fetch data" }), { status: 500 });
  }
}

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
    
    // NEW: Action to make or remove a user as admin
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

    // NEW: Delete images from Cloudinary
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
// app/api/admin/user/[uid]/route.js
import connectDB from "../../../../lib/mongodb"; // <-- FIXED
import Pet from "../../../../models/PetModel"; // <-- FIXED
import User from "../../../../models/User"; // <-- FIXED
import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});


// DELETE a user and all their pets and assets
export async function DELETE(req, context) {
  try {
    await connectDB();
    const { uid } = context.params;

    if (!uid) {
      return new Response(JSON.stringify({ error: "User UID is required" }), { status: 400 });
    }

    // 1. Find the user to be deleted
    const user = await User.findOne({ firebaseUid: uid });
    if (!user) {
      return new Response(JSON.stringify({ error: "User not found" }), { status: 404 });
    }

    // 2. Find all pets owned by this user
    const pets = await Pet.find({ ownerId: uid });

    // 3. Delete all Cloudinary assets for these pets
    // Note: This is a best-effort delete.
    try {
        await cloudinary.api.delete_folder(`certificates/${uid}`);
        await cloudinary.api.delete_folder(`pets/${uid}`);
    } catch(cldError) {
        console.warn(`Cloudinary folder deletion for user ${uid} may have failed:`, cldError.message);
    }
    
    // 4. Delete all pets from MongoDB
    await Pet.deleteMany({ ownerId: uid });
    
    // 5. Delete the user from MongoDB
    await User.findOneAndDelete({ firebaseUid: uid });
    
    // 6. TODO: Delete user from Firebase Auth
    //    This requires the Firebase Admin SDK (server-side)
    //    Example: await admin.auth().deleteUser(uid);
    //    (Skipping this for now as it requires new setup)

    return new Response(JSON.stringify({ message: `User ${uid} and ${pets.length} pets have been deleted.` }), { status: 200 });

  } catch (err) {
    console.error("Error deleting user:", err);
    return new Response(JSON.stringify({ error: "Failed to delete user", details: err.message }), { status: 500 });
  }
}
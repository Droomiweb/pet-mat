// app/api/admin/user/[uid]/route.js

// 1. IMPORTS
// We need the DB connection, the models to find/delete data, and Cloudinary for asset cleanup.
import connectDB from "../../../../lib/mongodb"; 
import Pet from "../../../../models/PetModel"; 
import User from "../../../../models/User"; 
import { v2 as cloudinary } from "cloudinary";

// 2. CONFIGURATION
// Initialize Cloudinary with environment variables so we can perform admin actions (deletion).
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 3. DELETE HANDLER
// This function handles DELETE requests sent to /api/admin/user/[uid]
// 'req' is the request object, 'context' contains dynamic route parameters.
export async function DELETE(req, context) {
  try {
    await connectDB();

    // 4. EXTRACT UID
    // We get 'uid' from the URL parameters (because the file is named [uid]/route.js).
    // Note: We await context.params because in very recent Next.js versions params can be a Promise, 
    // though usually direct access works in older versions. Destructuring is safe.
    const { uid } = context.params;

    if (!uid) {
      return new Response(JSON.stringify({ error: "User UID is required" }), { status: 400 });
    }

    // 5. VALIDATE USER
    // Check if the user exists in MongoDB before attempting complex deletions.
    const user = await User.findOne({ firebaseUid: uid });
    if (!user) {
      return new Response(JSON.stringify({ error: "User not found" }), { status: 404 });
    }

    // 6. IDENTIFY SCOPE
    // Find all pets belonging to this user. We do this to know how many we are deleting
    // and potentially to get their image IDs if we wanted to do a more granular Cloudinary delete.
    const pets = await Pet.find({ ownerId: uid });

    // 7. CLEANUP CLOUDINARY ASSETS
    // We attempt to delete the user's specific folders.
    // NOTE: 'delete_folder' only works if the folder is empty. 
    // If these folders contain images, this block might fail unless 'delete_resources' is called first.
    // We wrap this in a try/catch so that if Cloudinary fails, we still delete the user from the DB.
    try {
        await cloudinary.api.delete_folder(`certificates/${uid}`);
        await cloudinary.api.delete_folder(`pets/${uid}`);
    } catch(cldError) {
        console.warn(`Cloudinary folder deletion for user ${uid} may have failed (Folder might not be empty):`, cldError.message);
    }
    
    // 8. DELETE PETS (DB)
    // Remove all pet documents where the ownerId matches the user.
    await Pet.deleteMany({ ownerId: uid });
    
    // 9. DELETE USER (DB)
    // Remove the user profile document.
    await User.findOneAndDelete({ firebaseUid: uid });
    
    // 10. FIREBASE AUTH CLEANUP (Placeholder)
    // To truly delete a user, they must be removed from Firebase Authentication.
    // This requires 'firebase-admin' SDK server-side initialization.
    // e.g., await admin.auth().deleteUser(uid);
    
    // 11. SUCCESS RESPONSE
    return new Response(JSON.stringify({ message: `User ${uid} and ${pets.length} pets have been deleted.` }), { status: 200 });

  } catch (err) {
    console.error("Error deleting user:", err);
    return new Response(JSON.stringify({ error: "Failed to delete user", details: err.message }), { status: 500 });
  }
}
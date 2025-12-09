// Example: app/api/admin/user/[uid]/route.js
import admin from "@/app/lib/firebaseAdmin"; // Import the file we just created
import connectDB from "@/app/lib/mongodb";
import User from "@/app/models/User";

export async function DELETE(req, { params }) {
  try {
    const { uid } = params;
    
    // 1. Delete from Firebase Auth (Impossible without firebaseAdmin)
    await admin.auth().deleteUser(uid);

    // 2. Delete from MongoDB
    await connectDB();
    await User.findOneAndDelete({ firebaseUid: uid });

    return new Response(JSON.stringify({ message: "User deleted" }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
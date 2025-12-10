// app/api/admin/user/[uid]/route.js

// Standard imports
import admin from "@/app/lib/firebaseAdmin"; 
import connectDB from "@/app/lib/mongodb";
import User from "@/app/models/User";

export async function DELETE(req, props) {
  try {
    // Await params promise
    const params = await props.params;
    const uid = params.uid;

    // Validate User ID
    if (!uid || typeof uid !== 'string' || uid.trim() === "") {
        return new Response(JSON.stringify({ error: "Invalid User ID" }), { status: 400 });
    }

    // Delete from Firebase
    try {
        await admin.auth().deleteUser(uid);
    } catch (fbError) {
        // Ignore if missing
        if (fbError.code !== 'auth/user-not-found') {
             throw new Error(`Firebase Error: ${fbError.message}`);
        }
    }

    // Connect to database
    await connectDB();
    
    // Delete from MongoDB
    await User.findOneAndDelete({ firebaseUid: uid });

    // Return success message
    return new Response(JSON.stringify({ message: "User deleted" }), { status: 200 });

  } catch (err) {
    console.error("Delete User Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
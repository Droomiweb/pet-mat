// app/lib/firebaseAdmin.js
import admin from "firebase-admin";

// We check if the app is already initialized to avoid "App already exists" errors
// in Next.js hot-reloading environments.
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Handle newline characters in private key correctly for Vercel/Env variables
      privateKey: process.env.FIREBASE_PRIVATE_KEY
        ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        : undefined,
    }),
  });
}

export default admin;
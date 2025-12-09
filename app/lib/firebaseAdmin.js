// app/lib/firebaseAdmin.js
import admin from "firebase-admin";

if (!admin.apps.length) {
  // Only initialize if we have a private key
  if (process.env.FIREBASE_PRIVATE_KEY) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
  } else {
    console.warn("⚠️ Firebase Admin not initialized: Missing Private Key");
  }
}

export default admin;
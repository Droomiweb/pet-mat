import admin from "./firebaseAdmin";

/**
 * Verifies the Firebase ID Token from the Authorization header.
 * @param {Request} req - The Next.js API Request object
 * @returns {Promise<Object>} - The decoded token object if valid
 * @throws {Error} - If token is missing or invalid
 */
export async function verifyAuth(req) {
  const authHeader = req.headers.get("Authorization");
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Unauthorized: Missing or invalid Authorization header");
  }

  const token = authHeader.split("Bearer ")[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    console.error("Token verification failed:", error);
    throw new Error("Forbidden: Invalid or expired token");
  }
}

"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { auth } from "./lib/firebase"; // Your firebase.js
import { onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        try {
          const res = await fetch(`/api/user/${user.uid}`);
          
          if (res.ok) {
            // --- This part is correct ---
            const data = await res.json();
            setUserData(data);
            setIsAdmin(data.isAdmin);
          } else {
            // --- THIS IS THE FIX ---
            // This block runs when res.ok is false (e.g., a 404 error)
            console.error("User not found in database (404) or API error. Logging out.");
            setUserData(null); // Ensure userData is null
            setIsAdmin(false);
            await firebaseSignOut(auth); // Sign out the user
            // --- END FIX ---
          }
        } catch (error) {
          // --- THIS IS ALSO A FIX ---
          // This catches network errors
          console.error("Auth: Error fetching user data:", error);
          setUserData(null);
          setIsAdmin(false);
          await firebaseSignOut(auth); // Sign out on any error
          // --- END FIX ---
        } finally {
          setLoading(false);
        }
      } else {
        setUser(null);
        setUserData(null);
        setIsAdmin(false);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const signOut = async () => {
    await firebaseSignOut(auth);
    // onAuthStateChanged will handle setting states to null
  };

  return (
    <AuthContext.Provider value={{ user, userData, isAdmin, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
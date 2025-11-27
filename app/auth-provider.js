// app/auth-provider.js
"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { auth } from "./lib/firebase"; 
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
            const data = await res.json();
            setUserData(data);
            setIsAdmin(data.isAdmin);
          } else {
            // Log as warning instead of Error to prevent console spam during cleanup
            console.warn("User profile not found in database. Initializing or Deleted. Signing out.");
            setUserData(null);
            setIsAdmin(false);
            await firebaseSignOut(auth); 
          }
        } catch (error) {
          console.error("Auth: Error fetching user data:", error);
          setUserData(null);
          setIsAdmin(false);
          await firebaseSignOut(auth);
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
  };

  return (
    <AuthContext.Provider value={{ user, userData, isAdmin, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
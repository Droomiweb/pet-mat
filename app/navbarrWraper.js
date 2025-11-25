// app/navbarrWraper.js
"use client";

import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuth } from "./auth-provider";
import Navbarr from "./nav";
import MaintenancePage from "./Maintenance";
import { db } from "./lib/firebase"; 
import { collection, query, where, onSnapshot } from "firebase/firestore"; 

// --- Reminder Helpers ---
const getStartOfDay = (date) => {
    const d = new Date(date);
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};

const calculateReminderCount = (pets) => {
    let count = 0;
    const now = new Date();
    const today = getStartOfDay(now);
    
    pets.forEach(pet => {
        if (pet.vaccinationHistory) {
            pet.vaccinationHistory.forEach(vax => {
                const expiry = getStartOfDay(vax.expiryDate);
                if (isNaN(expiry.getTime())) return;
                
                if (expiry < today) {
                    count++;
                } else {
                    const diffTime = expiry.getTime() - today.getTime();
                    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)); 
                    if (diffDays <= 30) count++;
                }
            });
        }
    });
    return count;
};

// --- Main Component ---
export default function NavbarrWrapper({ children, isMaintenanceMode }) {
  const pathname = usePathname();
  const { user, userData, loading: authLoading } = useAuth();
  const [reminderCount, setReminderCount] = useState(0);
  const [messageCount, setMessageCount] = useState(0);

  const isAuthPage = pathname === "/Login" || pathname === "/Signup";
  
  // --- MAINTENANCE LOGIC ---
  // Allow access if: 
  // 1. Maintenance is OFF
  // 2. User is Admin
  // 3. User is on Login/Admin pages (so they can log in to turn it off!)
  const isBypassRoute = pathname.startsWith("/admin") || pathname === "/Login" || pathname.startsWith("/api");
  const isAdmin = userData?.isAdmin;
  
  // Show maintenance screen if mode is ON, user is NOT admin, and NOT on a bypass route
  const showMaintenanceScreen = isMaintenanceMode && !isAdmin && !isBypassRoute;

  // --- EFFECT 1: Fetch Reminders ---
  useEffect(() => {
    if (authLoading || !user) return;

    const fetchReminders = async () => {
        try {
            const timestamp = new Date().getTime();
            const res = await fetch(`/api/pet/user/${user.uid}?t=${timestamp}`, { cache: 'no-store' });
            if (res.ok) {
                const pets = await res.json();
                setReminderCount(calculateReminderCount(pets));
            }
        } catch (err) {
            console.error("Error fetching pet data for reminders:", err);
            setReminderCount(0);
        }
    };

    fetchReminders();
    const interval = setInterval(fetchReminders, 3600000); 
    return () => clearInterval(interval);
  }, [user, authLoading]);

  // --- EFFECT 2: Fetch Messages ---
  useEffect(() => {
    if (authLoading || !user) {
        setMessageCount(0);
        return;
    }
    
    const q = query(
        collection(db, "conversations"),
        where("participants", "array-contains", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
        setMessageCount(snapshot.docs.length); 
    }, (error) => {
        console.error("Firestore Message Count Error:", error);
        setMessageCount(0);
    });

    return () => unsubscribe();
  }, [user, authLoading]);

  // --- RENDER BLOCKING ---
  if (showMaintenanceScreen) {
      return <MaintenancePage />;
  }

  // --- RENDER NORMAL ---
  if (isAuthPage) {
      return <>{children}</>;
  }
  
  return (
    <>
        <Navbarr reminderCount={reminderCount} unreadMessageCount={messageCount} />
        
        {/* Maintenance Banner for Admin */}
        {isMaintenanceMode && isAdmin && (
            <div className="fixed top-20 left-0 w-full bg-red-500 text-white text-center text-xs font-bold py-1 z-[100] shadow-md">
                ⚠️ MAINTENANCE MODE IS ACTIVE (Visible only to Admins) ⚠️
            </div>
        )}

        <main className={`pt-24 min-h-screen ${isMaintenanceMode && isAdmin ? 'mt-6' : ''}`}>
            {children}
        </main>
    </>
  );
}
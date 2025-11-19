// app/navbarrWrapper.js
"use client";

import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuth } from "./auth-provider";
import Navbarr from "./nav";
import { db } from "./lib/firebase"; // <-- Import Firestore DB
import { collection, query, where, onSnapshot } from "firebase/firestore"; // <-- Import Firestore functions

// --- Reminder Helpers (Unchanged) ---
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

                if (isNaN(expiry.getTime())) {
                    return;
                }
                
                if (expiry < today) {
                    count++;
                } else {
                    const diffTime = expiry.getTime() - today.getTime();
                    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)); 
                    
                    if (diffDays <= 30) { 
                        count++;
                    }
                }
            });
        }
    });
    return count;
};
// --- End Reminder Helpers ---


export default function NavbarrWrapper() {
  const pathname = usePathname();
  const { user, loading: authLoading } = useAuth();
  const [reminderCount, setReminderCount] = useState(0);
  const [messageCount, setMessageCount] = useState(0); // <-- NEW STATE

  // --- EFFECT 1: Fetch Reminders (Unchanged) ---
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


  // --- EFFECT 2: Fetch Active Message Count (NEW) ---
  useEffect(() => {
    if (authLoading || !user) {
        setMessageCount(0);
        return;
    }
    
    // Query Firestore for conversations where the current user is a participant
    // This counts ALL active conversations, serving as a message notification
    const q = query(
        collection(db, "conversations"),
        where("participants", "array-contains", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
        // The message count is simply the number of documents found
        setMessageCount(snapshot.docs.length); 
    }, (error) => {
        console.error("Firestore Message Count Error:", error);
        setMessageCount(0);
    });

    return () => unsubscribe(); // Cleanup subscription on unmount/user change

  }, [user, authLoading]);


  if (pathname === "/Login" || pathname === "/Signup") return null;
  
  // Pass BOTH counts to the Navbar
  return <Navbarr reminderCount={reminderCount} unreadMessageCount={messageCount} />;
}
// app/navbarrWrapper.js
"use client";

import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuth } from "./auth-provider"; // Import useAuth
import Navbarr from "./nav";

// --- CRITICAL FIX: UTC-Safe Start of Day ---
const getStartOfDay = (date) => {
    const d = new Date(date);
    // Use Date.UTC to create a new Date object representing midnight UTC
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};


// Helper function to calculate reminders
const calculateReminderCount = (pets) => {
    let count = 0;
    const now = new Date();
    const today = getStartOfDay(now); // Today at midnight UTC
    
    pets.forEach(pet => {
        if (pet.vaccinationHistory) {
            pet.vaccinationHistory.forEach(vax => {
                const expiry = getStartOfDay(vax.expiryDate); // Expiry date at midnight UTC

                if (isNaN(expiry.getTime())) {
                    return; // Ignore invalid dates
                }
                
                // --- FIXED LOGIC START ---
                if (expiry < today) {
                    // 1. Count expired reminders
                    count++;
                } else {
                    // Calculate difference in days (0 for today, 1 for tomorrow, etc.)
                    const diffTime = expiry.getTime() - today.getTime();
                    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)); 
                    
                    // 2. Count upcoming reminders (within 30 days, inclusive of today)
                    if (diffDays <= 30) { 
                        count++;
                    }
                }
                // --- FIXED LOGIC END ---
            });
        }
    });
    return count;
};


export default function NavbarrWrapper() {
  const pathname = usePathname();
  const { user, loading: authLoading } = useAuth(); // Use auth
  const [reminderCount, setReminderCount] = useState(0);

  // Fetch pet data to calculate reminders
  useEffect(() => {
    if (authLoading || !user) return;

    const fetchReminders = async () => {
        try {
            const timestamp = new Date().getTime();
            // Use no-store cache control for fresh data
            const res = await fetch(`/api/pet/user/${user.uid}?t=${timestamp}`, { cache: 'no-store' });
            if (res.ok) {
                const pets = await res.json();
                // Pass the raw pets data to the helper for calculation
                setReminderCount(calculateReminderCount(pets));
            }
        } catch (err) {
            console.error("Error fetching pet data for reminders:", err);
            setReminderCount(0);
        }
    };

    fetchReminders();
    // Re-fetch every hour or on status changes if you implement push updates
    const interval = setInterval(fetchReminders, 3600000); // Check hourly
    return () => clearInterval(interval);

  }, [user, authLoading]);


  if (pathname === "/Login" || pathname === "/Signup") return null;
  
  // Pass the reminder count to the Navbar
  return <Navbarr reminderCount={reminderCount} />;
}
// app/reminders/page.js
"use client";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../auth-provider";
import { useRouter } from "next/navigation";
import Link from "next/link";

// --- Timer Helper Component (NEW) ---
const TimerBadge = ({ expiryDate, status }) => {
    // This component will re-render if the parent state changes, keeping the time calculation fresh.
    const now = new Date();
    
    // --- CRITICAL FIX: UTC-Safe Start of Day (Copied from parent scope) ---
    const getStartOfDay = (date) => {
        const d = new Date(date);
        return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    };
    const today = getStartOfDay(now);
    const expiry = getStartOfDay(expiryDate);
    
    // Calculate difference in days
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)); 
    
    let text = status.toUpperCase();
    let bgColor = '';
    
    if (status === 'expired') {
        // Display how long ago it expired
        const expiredDays = Math.abs(diffDays);
        text = `EXPIRED ${expiredDays} DAY${expiredDays !== 1 ? 'S' : ''} AGO`;
        bgColor = 'bg-red-500';
    } else if (status === 'upcoming' && diffDays >= 0) {
        // Display time remaining for upcoming
        const days = diffDays;
        text = `EXPIRES IN ${days} DAY${days !== 1 ? 'S' : ''}`;
        bgColor = 'bg-orange-500';
    } else if (status === 'needs-review') {
        text = 'REVIEW REQUIRED';
        bgColor = 'bg-gray-500';
    } else {
        // Default catch (shouldn't happen with activeReminders array)
        return null;
    }

    return (
        <span className={`px-3 py-1 text-xs font-bold text-white rounded-full shadow-md ${bgColor}`}>
            {text}
        </span>
    );
};
// --- END Timer Helper Component ---


export default function RemindersPage() {
  const { user, loading: authLoading } = useAuth();
  // State to hold all pet data fetched from the API
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // --- CRITICAL FIX: UTC-Safe Start of Day (Required for date calculations) ---
  const getStartOfDay = (date) => {
    const d = new Date(date);
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  };
  
  // --- This useEffect is needed to force the TimerBadge component to re-render daily ---
  // It recalculates the 'now' date every 12 hours so the countdown timer is updated.
  useEffect(() => {
    const timer = setInterval(() => {
        // By changing state, we force the component (and TimerBadge) to re-render.
        setPets(prev => [...prev]); 
    }, 12 * 60 * 60 * 1000); // Recalculate every 12 hours
    return () => clearInterval(timer);
  }, []);

  // --- 1. FETCH DETAILS FROM THE DATABASE (VIA API) ---
  const fetchPetReminders = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const timestamp = new Date().getTime();
      const res = await fetch(`/api/pet/user/${user.uid}?t=${timestamp}`, { cache: 'no-store' });
      
      if (res.ok) {
        const data = await res.json();
        const petsWithVax = data.filter(p => p.vaccinationHistory?.length > 0);
        setPets(petsWithVax);
      } else {
        console.error("Failed to fetch pet data for reminders.");
      }
    } catch (error) {
      console.error("Error fetching pets for reminders:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/Login");
    } else if (user) {
      fetchPetReminders();
    }
  }, [authLoading, user, router, fetchPetReminders]);

  // --- 2. AGGREGATE AND PROCESS THE FETCHED DATA FOR DISPLAY (Production Logic) ---
  const allReminders = pets.flatMap(pet => 
    (pet.vaccinationHistory || []).map(vax => {
        // --- DATE CALCULATION FOR STATUS ---
        const now = new Date();
        const today = getStartOfDay(now); // Today at midnight UTC
        const expiry = getStartOfDay(vax.expiryDate); // Expiry date at midnight UTC
        
        let status;
        
        if (isNaN(expiry.getTime())) {
             status = 'needs-review';
        } else if (expiry < today) {
            status = 'expired';
        } else {
            const diffTime = expiry.getTime() - today.getTime();
            const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)); 
            
            if (diffDays <= 30) {
                status = 'upcoming';
            } else {
                status = 'active'; // Not an actionable reminder
            }
        }
        // --- END DATE CALCULATION ---
        
        return {
            ...vax,
            petName: pet.name,
            petId: pet._id,
            status: status // Use the recalculated status
        };
    })
  ).sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));


  // Filter for reminders that should be displayed (Expired or Upcoming)
  const activeReminders = allReminders.filter(r => 
      r.status === 'upcoming' || r.status === 'expired'
  );


  if (authLoading || loading) {
    return <div className="flex justify-center items-center min-h-screen"><div className="loader">Loading Reminders...</div></div>;
  }

  if (activeReminders.length === 0) {
    return (
      <div className="min-h-screen bg-[#F4F7F9] p-4 md:p-10">
        <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-2xl p-8 border-t-8 border-blue-500 text-center">
            <h1 className="text-3xl font-bold text-gray-800 mb-4">🔔 Vaccination Reminders</h1>
            <p className="text-xl text-gray-600 mt-4">All clear! No actionable vaccination reminders found.</p>
            <Link href="/Profile" className="text-blue-500 font-semibold mt-4 block hover:underline">
                View My Pets
            </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F7F9] p-4 md:p-10">
      <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-2xl p-6 md:p-10 border-t-8 border-[#4A90E2]">
        <h1 className="text-3xl font-extrabold text-[#333333] mb-8 border-b pb-3 border-gray-100">
            🔔 Vaccination Reminders ({activeReminders.length})
        </h1>
        
        <div className="space-y-6">
          {activeReminders.map((reminder, index) => { 
            const isExpired = reminder.status === 'expired';
            const isUpcoming = reminder.status === 'upcoming' || reminder.status === 'needs-review';
            
            // UI Styling based on status
            const bgColor = isExpired ? 'bg-red-50 border-red-300' : isUpcoming ? 'bg-orange-50 border-orange-300' : 'bg-gray-50 border-gray-300';
            const hoverColor = isExpired ? 'hover:border-red-500' : isUpcoming ? 'hover:border-orange-500' : 'hover:border-gray-500';
            const accentColor = isExpired ? 'border-red-500' : isUpcoming ? 'border-orange-500' : 'border-gray-500';


            return (
              <div 
                key={`${reminder.petId}-${reminder.vaccineName}-${index}`} 
                className={`p-5 rounded-2xl border-l-4 shadow-lg transition-all duration-300 ${bgColor} ${hoverColor}`}
                style={{ borderColor: accentColor }} 
              >
                <div className="flex justify-between items-start mb-3">
                    <h3 className="text-xl font-bold text-[#333333]">{reminder.vaccineName} for {reminder.petName}</h3>
                    <Link href={`/pet/${reminder.petId}`} className="text-sm text-blue-600 hover:underline font-semibold whitespace-nowrap">
                        View Pet & Profile
                    </Link>
                </div>

                {/* --- TIMER/STATUS BADGE (NEW) --- */}
                <div className="mb-3">
                    <TimerBadge 
                        expiryDate={reminder.expiryDate} 
                        status={reminder.status}
                    />
                </div>
                {/* --- END TIMER/STATUS BADGE --- */}

                <div className="flex flex-col md:flex-row md:justify-between text-sm text-gray-600">
                    <p className="font-medium">
                        Vaccination Date: {new Date(reminder.vaccinationDate).toLocaleDateString()}
                    </p>
                    <p className="font-medium mt-1 md:mt-0">
                        Expiry Date: {new Date(reminder.expiryDate).toLocaleDateString()}
                    </p>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
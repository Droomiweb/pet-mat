// app/reminders/page.js
"use client";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../auth-provider";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

// --- ICONS ---
const SyringeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" /></svg>;
const CalendarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" /></svg>;
const LocationIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>;
const CheckCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-12 h-12 text-green-500"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;

// --- HELPER: DATE CALCULATIONS ---
const getReminderStatus = (expiryDate) => {
    const d = new Date(expiryDate);
    // UTC Safe start of day
    const expiry = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    
    if (isNaN(expiry.getTime())) return { status: 'unknown', days: 0, label: 'Unknown' };

    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
        return { status: 'expired', days: Math.abs(diffDays), label: `Overdue by ${Math.abs(diffDays)} days` };
    } else if (diffDays <= 30) {
        return { status: 'upcoming', days: diffDays, label: `Due in ${diffDays} days` };
    } else {
        return { status: 'good', days: diffDays, label: 'Up to date' };
    }
};

// --- COMPONENT: REMINDER CARD ---
const ReminderCard = ({ reminder }) => {
    const { status, label } = getReminderStatus(reminder.expiryDate);
    
    // Dynamic Styles based on status
    const styles = {
        expired: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', iconBg: 'bg-red-100', badge: 'bg-red-500' },
        upcoming: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', iconBg: 'bg-orange-100', badge: 'bg-orange-500' },
        good: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', iconBg: 'bg-green-100', badge: 'bg-green-500' },
        unknown: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700', iconBg: 'bg-gray-100', badge: 'bg-gray-500' }
    }[status] || styles.unknown;

    return (
        <div className={`flex items-center p-4 rounded-xl border ${styles.bg} ${styles.border} mb-3 transition-transform hover:scale-[1.01]`}>
            {/* Icon */}
            <div className={`p-3 rounded-full ${styles.iconBg} mr-4`}>
                <SyringeIcon />
            </div>
            
            {/* Info */}
            <div className="flex-1">
                <h4 className={`font-bold ${styles.text} text-base`}>{reminder.vaccineName}</h4>
                <div className="flex items-center gap-4 mt-1 text-xs font-medium text-gray-500">
                    <span className="flex items-center gap-1">
                        <CalendarIcon /> Expiry: {new Date(reminder.expiryDate).toLocaleDateString()}
                    </span>
                </div>
            </div>

            {/* Badge */}
            <div className="flex flex-col items-end gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold text-white shadow-sm ${styles.badge}`}>
                    {label}
                </span>
                {status === 'expired' && (
                    <Link href="/vet-locator" className="text-xs font-bold text-[#4A90E2] hover:underline flex items-center gap-1">
                        <LocationIcon /> Find Vet
                    </Link>
                )}
            </div>
        </div>
    );
};

// --- COMPONENT: PET SECTION ---
const PetSection = ({ pet }) => {
    // Filter relevant reminders
    const reminders = (pet.vaccinationHistory || []).map(vax => ({
        ...vax,
        ...getReminderStatus(vax.expiryDate) // Pre-calculate to sort
    })).filter(r => r.status === 'expired' || r.status === 'upcoming')
      .sort((a, b) => a.days - b.days); // Sort by urgency

    // If pet has no urgent reminders, show "All Good" state
    const isHealthy = reminders.length === 0;

    return (
        <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-lg border border-white p-6 mb-8 relative overflow-hidden">
            {/* Decorative Background Blob */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-100 to-purple-100 rounded-bl-full opacity-50 pointer-events-none"></div>

            <div className="flex flex-col md:flex-row md:items-center gap-6 mb-6 relative z-10">
                {/* Pet Avatar */}
                <div className="relative w-20 h-20 rounded-full border-4 border-white shadow-md overflow-hidden shrink-0">
                    <Image 
                        src={pet.imageUrls?.[0] || "/imgs/dog.jpg"} 
                        alt={pet.name} 
                        fill 
                        className="object-cover"
                    />
                </div>
                
                {/* Pet Details */}
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-extrabold text-gray-800">{pet.name}</h2>
                        {isHealthy ? (
                            <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full border border-green-200">
                                ✅ All Good
                            </span>
                        ) : (
                            <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-full border border-red-200 animate-pulse">
                                ⚠️ {reminders.length} Attention Needed
                            </span>
                        )}
                    </div>
                    <p className="text-gray-500 text-sm">{pet.breed} • {pet.age} Years Old</p>
                </div>

                {/* Action Button */}
                <Link 
                    href={`/pet/${pet._id}`}
                    className="px-5 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-50 hover:text-[#4A90E2] hover:border-[#4A90E2] transition-all shadow-sm"
                >
                    Update History
                </Link>
            </div>

            {/* Reminders List */}
            <div className="space-y-1">
                {isHealthy ? (
                    <div className="p-6 bg-green-50/50 rounded-2xl border border-green-100 flex flex-col items-center justify-center text-center">
                        <CheckCircleIcon />
                        <p className="text-green-800 font-bold mt-2">Vaccinations Up-to-Date!</p>
                        <p className="text-green-600 text-xs">Great job keeping {pet.name} healthy.</p>
                    </div>
                ) : (
                    reminders.map((reminder, idx) => (
                        <ReminderCard key={idx} reminder={reminder} />
                    ))
                )}
            </div>
        </div>
    );
};

export default function RemindersPage() {
  const { user, loading: authLoading } = useAuth();
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchPetReminders = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const timestamp = new Date().getTime();
      const res = await fetch(`/api/pet/user/${user.uid}?t=${timestamp}`, { cache: 'no-store' });
      
      if (res.ok) {
        const data = await res.json();
        // We want ALL pets to show their status, not just ones with issues
        setPets(data);
      }
    } catch (error) {
      console.error("Error fetching pets:", error);
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

  // --- LOADING STATE ---
  if (authLoading || loading) {
    return (
        <div className="min-h-screen bg-[#F4F7F9] flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 border-4 border-[#4A90E2] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[#4A90E2] font-bold animate-pulse">Checking Health Records...</p>
        </div>
    );
  }

  // --- EMPTY STATE ---
  if (pets.length === 0) {
    return (
      <div className="min-h-screen bg-[#F4F7F9] p-8 flex flex-col items-center justify-center text-center">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md">
            <div className="text-6xl mb-4">🐾</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">No Pets Found</h2>
            <p className="text-gray-500 mb-6">Add your first pet to start tracking their vaccinations and health reminders.</p>
            <Link href="/Addpet" className="btn-primary block w-full text-center">
                Add a Pet
            </Link>
        </div>
      </div>
    );
  }

  // --- MAIN UI ---
  return (
    <div className="min-h-screen bg-[#F4F7F9] p-4 md:p-10">
      <div className="max-w-4xl mx-auto">
        
        {/* Page Header */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-8 border-b-2 border-gray-200 pb-4 gap-4">
            <div>
                <h1 className="text-4xl font-extrabold text-[#333333] mb-2">
                    Health Dashboard
                </h1>
                <p className="text-gray-500 font-medium">
                    Track vaccinations and upcoming vet visits for your furry family.
                </p>
            </div>
            <Link href="/vet-locator" className="bg-white text-[#4A90E2] border-2 border-[#4A90E2] px-6 py-2 rounded-xl font-bold hover:bg-[#4A90E2] hover:text-white transition-colors shadow-sm flex items-center gap-2">
                <LocationIcon /> Find Vet Nearby
            </Link>
        </div>
        
        {/* Render Pet Sections */}
        <div className="space-y-6">
          {pets.map((pet) => (
            <PetSection key={pet._id} pet={pet} />
          ))}
        </div>

      </div>
    </div>
  );
}
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../auth-provider";
import Link from "next/link";

export default function LostPetAlert() {
  const [lostPets, setLostPets] = useState([]);
  const { userData, authLoading } = useAuth();

  useEffect(() => {
    const fetchLostPets = async () => {
      try {
        // We fetch all lost pets globally for the top banner
        // But we could prioritize by city if we want.
        const res = await fetch("/api/pet?isLost=true");
        if (res.ok) {
          const data = await res.json();
          setLostPets(data);
        }
      } catch (e) {
        console.error("Error fetching lost pets for banner:", e);
      }
    };

    fetchLostPets();
    // Refresh every 5 minutes to keep it updated
    const interval = setInterval(fetchLostPets, 300000);
    return () => clearInterval(interval);
  }, []);

  if (lostPets.length === 0) return null;

  return (
    <div className="fixed top-0 left-0 w-full z-[9999] bg-red-600 text-white overflow-hidden shadow-2xl border-b border-red-700">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 overflow-hidden">
          <span className="text-xl animate-pulse shrink-0">🚨</span>
          <div className="flex flex-col truncate">
            <h3 className="text-sm font-black uppercase tracking-tighter leading-none">
              Emergency: {lostPets.length > 1 ? `${lostPets.length} Pets Missing Nearby` : "Pet Missing Nearby"}
            </h3>
            <div className="flex gap-2 items-center mt-0.5">
               {lostPets.slice(0, 3).map((pet, idx) => (
                 <Link 
                   key={pet._id} 
                   href={`/pet/${pet._id}`}
                   className="text-[10px] font-bold bg-white/20 hover:bg-white/40 px-2 py-0.5 rounded transition whitespace-nowrap"
                 >
                   Help Find {pet.name}
                 </Link>
               ))}
               {lostPets.length > 3 && (
                 <span className="text-[10px] font-bold opacity-80">+ {lostPets.length - 3} more</span>
               )}
            </div>
          </div>
        </div>
        
        <div className="hidden sm:flex shrink-0">
          <Link 
            href="/community" 
            className="text-[11px] font-black underline decoration-2 underline-offset-2 hover:opacity-80 transition"
          >
            VIEW ALL ALERTS
          </Link>
        </div>
      </div>
    </div>
  );
}

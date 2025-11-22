// app/pregnancy-tracker/[petId]/page.js
"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "../../auth-provider";
import Link from "next/link";

export default function PregnancyTracker() {
  const { petId } = useParams();
  const { user, loading: authLoading } = useAuth();
  const [pet, setPet] = useState(null);
  const [todayPlan, setTodayPlan] = useState(null);
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Helper to calculate days passed
  const getDaysPassed = (startDate) => {
    const start = new Date(startDate);
    const today = new Date();
    const diffTime = Math.abs(today - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    return diffDays; 
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) return router.push("/Login");

    const fetchPetData = async () => {
      try {
        const res = await fetch(`/api/pet/${petId}`);
        if (res.ok) {
          const data = await res.json();
          if (!data.isPregnant || !data.pregnancyPlan || data.pregnancyPlan.length === 0) {
             // If not pregnant or plan missing, go back to profile
             alert("Pregnancy data not found.");
             router.push(`/pet/${petId}`);
             return;
          }
          setPet(data);
          
          // Calculate which day it is
          const daysPassed = getDaysPassed(data.pregnancyStartDate);
          
          // Ensure we don't go out of bounds if pregnancy is overdue
          const dayIndex = Math.min(daysPassed, data.pregnancyPlan.length) - 1;
          const safeIndex = Math.max(0, dayIndex); // Ensure not negative
          
          setCurrentDayIndex(safeIndex);
          setTodayPlan(data.pregnancyPlan[safeIndex]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPetData();
  }, [user, authLoading, petId, router]);

  if (loading || !pet) {
    return <div className="flex justify-center items-center min-h-screen text-[#4A90E2] font-bold text-xl">Loading Mother & Baby Data...</div>;
  }

  // Calculate progress percentage
  const progress = ((currentDayIndex + 1) / pet.pregnancyPlan.length) * 100;

  return (
    <div className="min-h-screen bg-[#FDF6F6] p-4 md:p-10"> {/* Pinkish background for care theme */}
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="bg-white rounded-3xl shadow-xl p-8 mb-8 border-t-8 border-pink-400 relative overflow-hidden">
           <div className="absolute top-0 right-0 p-4 opacity-10">
               <span className="text-9xl">🐾</span>
           </div>
           
           <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
               <img src={pet.imageUrls[0]} alt={pet.name} className="w-24 h-24 rounded-full object-cover border-4 border-pink-200 shadow-md" />
               <div>
                   <h1 className="text-3xl font-extrabold text-gray-800">Pregnancy Tracker</h1>
                   <p className="text-pink-500 font-bold text-lg">Mom-to-be: {pet.name}</p>
                   <p className="text-gray-500">Day {todayPlan?.day} of {pet.pregnancyPlan.length}</p>
               </div>
           </div>

           {/* Progress Bar */}
           <div className="mt-8">
               <div className="flex justify-between text-xs font-bold text-gray-400 mb-1">
                   <span>Conception</span>
                   <span>Delivery</span>
               </div>
               <div className="w-full bg-gray-200 rounded-full h-4">
                   <div className="bg-pink-400 h-4 rounded-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
               </div>
           </div>
        </div>

        {/* --- TODAY'S PLAN --- */}
        {todayPlan && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Main Card: Food & Activity */}
                <div className="bg-white p-6 rounded-2xl shadow-lg border border-pink-100">
                    <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                        📅 Day {todayPlan.day} Recommendations
                    </h2>
                    
                    <div className="mb-6">
                        <h3 className="text-sm font-bold text-pink-500 uppercase tracking-wide mb-2">🍎 Nutrition</h3>
                        <p className="text-gray-700 bg-pink-50 p-3 rounded-xl border border-pink-100 leading-relaxed">
                            {todayPlan.food}
                        </p>
                    </div>

                    <div>
                        <h3 className="text-sm font-bold text-blue-500 uppercase tracking-wide mb-2">🏃‍♀️ Activity</h3>
                        <p className="text-gray-700 bg-blue-50 p-3 rounded-xl border border-blue-100 leading-relaxed">
                            {todayPlan.activity}
                        </p>
                    </div>
                </div>

                {/* Side Card: Care & Warnings */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-2xl shadow-lg border-l-4 border-purple-400">
                        <h3 className="font-bold text-purple-600 mb-2 flex items-center gap-2">
                            <span>🛁</span> Care Tips
                        </h3>
                        <p className="text-gray-600">{todayPlan.careTips}</p>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-lg border-l-4 border-red-400">
                        <h3 className="font-bold text-red-500 mb-2 flex items-center gap-2">
                            <span>⚠️</span> Warning Signs
                        </h3>
                        <p className="text-gray-600">{todayPlan.warningSigns}</p>
                    </div>
                    
                    <div className="flex gap-2">
                        <Link href="/AiDoc" className="flex-1 bg-[#50E3C2] text-white py-3 rounded-xl font-bold text-center shadow-md hover:bg-[#3FCCB4]">
                            Ask AI Vet
                        </Link>
                        <Link href="/Profile" className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-bold text-center hover:bg-gray-300">
                            Back to Profile
                        </Link>
                    </div>
                </div>
            </div>
        )}

        {/* Navigation Buttons (Development purpose / Curiosity) */}
        <div className="mt-8 flex justify-between items-center opacity-50 hover:opacity-100 transition-opacity">
            <button 
                disabled={currentDayIndex <= 0}
                onClick={() => {
                    const newIndex = currentDayIndex - 1;
                    setCurrentDayIndex(newIndex);
                    setTodayPlan(pet.pregnancyPlan[newIndex]);
                }}
                className="text-sm font-bold text-gray-500 disabled:opacity-30"
            >
                &larr; View Previous Day
            </button>
            <span className="text-xs text-gray-400">Viewing Day {currentDayIndex + 1}</span>
            <button 
                disabled={currentDayIndex >= pet.pregnancyPlan.length - 1}
                onClick={() => {
                    const newIndex = currentDayIndex + 1;
                    setCurrentDayIndex(newIndex);
                    setTodayPlan(pet.pregnancyPlan[newIndex]);
                }}
                className="text-sm font-bold text-gray-500 disabled:opacity-30"
            >
                View Next Day &rarr;
            </button>
        </div>

      </div>
    </div>
  );
}
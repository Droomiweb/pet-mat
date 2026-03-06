// app/pregnancy-tracker/[petId]/page.js
"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "../../auth-provider";
import Link from "next/link";
import ReactMarkdown from 'react-markdown';

// --- ICONS ---
const ChefIcon = () => <span className="text-2xl">👩‍🍳</span>;
const RulerIcon = () => <span className="text-2xl">📏</span>;
const SparklesIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 inline-block text-yellow-500 animate-pulse"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" /></svg>;

export default function PregnancyTracker() {
  const { petId } = useParams();
  const { user, loading: authLoading } = useAuth();
  
  // Core Data
  const [pet, setPet] = useState(null);
  const [todayPlan, setTodayPlan] = useState(null);
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // AI Extras State
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuResult, setMenuResult] = useState(null);
  
  const [visualLoading, setVisualLoading] = useState(false);
  const [visualResult, setVisualResult] = useState(null); // { text, imageUrl }

  const router = useRouter();

  // Helper to calculate days passed
  const getDaysPassed = (startDate) => {
    const start = new Date(startDate);
    const today = new Date();
    const diffTime = today - start;
    // Math.floor(0.1) = 0 -> Day 1
    // Math.floor(1.1) = 1 -> Day 2
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1; 
    return diffDays; 
  };

  const getBioTotalDays = (type) => {
    let bioTotalDays = 63; 
    if (type) {
        const typeLow = type.toLowerCase();
        if (typeLow === 'rabbit') bioTotalDays = 31;
        else if (typeLow === 'horse') bioTotalDays = 340;
        else if (typeLow === 'cow') bioTotalDays = 283;
        else if (typeLow === 'bird') bioTotalDays = 28;
        else if (typeLow === 'pig') bioTotalDays = 114;
        else if (typeLow === 'goat' || typeLow === 'sheep') bioTotalDays = 150;
        else if (typeLow === 'hamster') bioTotalDays = 16;
        else if (typeLow === 'guinea pig') bioTotalDays = 65;
    }
    return bioTotalDays;
  };

  const getPlanDay = (plan, fallbackIndex) => {
    if (!plan) return fallbackIndex + 1;
    if (plan.day) {
        const m = String(plan.day).match(/\d+/);
        if (m) return parseInt(m[0], 10);
    }
    if (plan.week) {
        const m = String(plan.week).match(/\d+/);
        if (m) return parseInt(m[0], 10) * 7;
    }
    return fallbackIndex + 1;
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
             alert("Pregnancy data not found.");
             router.push(`/pet/${petId}`);
             return;
          }
          setPet(data);
          
          // Because plans are now dynamically generated and not exactly 63 items long,
          // we cannot rely on direct array indexing (e.g., plan[50] for Day 51).
          // We must find the plan object where the 'day' property is closest to, but not exceeding, daysPassed.
          
          let bestMatchIndex = 0;
          let minDiff = Infinity;
          const daysPassed = getDaysPassed(data.pregnancyStartDate);

          data.pregnancyPlan.forEach((plan, index) => {
            // Some plans use 'week' (e.g., 'Week 1' = day 7) and some use 'day'
             let planDay = 0;
             if (plan.day) {
                 const m = String(plan.day).match(/\d+/);
                 if (m) planDay = parseInt(m[0], 10);
             } else if (plan.week) {
                 const m = String(plan.week).match(/\d+/);
                 if (m) planDay = parseInt(m[0], 10) * 7;
             }

             if (planDay <= daysPassed) {
                 const diff = daysPassed - planDay;
                 if (diff < minDiff) {
                     minDiff = diff;
                     bestMatchIndex = index;
                 }
             }
          });
          
          setCurrentDayIndex(bestMatchIndex);
          setTodayPlan(data.pregnancyPlan[bestMatchIndex]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPetData();
  }, [user, authLoading, petId, router]);

  // --- AI HANDLERS ---
  const generateMenu = async () => {
    setMenuLoading(true);
    try {
      const res = await fetch("/api/pregnancy/generate-extras", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "meal_plan",
          petBreed: pet.breed,
          petType: pet.type,
          currentDay: getPlanDay(todayPlan, currentDayIndex),
          totalDays: getBioTotalDays(pet.type)
        }),
      });
      const data = await res.json();
      if (data.result) setMenuResult(data.result);
    } catch (err) { console.error(err); } 
    finally { setMenuLoading(false); }
  };

  const generateVisual = async () => {
    setVisualLoading(true);
    try {
      const res = await fetch("/api/pregnancy/generate-extras", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "fetus_visual",
          petBreed: pet.breed,
          petType: pet.type,
          currentDay: getPlanDay(todayPlan, currentDayIndex),
          totalDays: getBioTotalDays(pet.type)
        }),
      });
      const data = await res.json();
      if (data.result) setVisualResult({ text: data.result, imageUrl: data.imageUrl });
    } catch (err) { console.error(err); } 
    finally { setVisualLoading(false); }
  };

  if (loading || !pet) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-[#FDF6F6]">
        <div className="w-16 h-16 border-4 border-pink-400 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-pink-500 font-bold text-xl animate-pulse">Connecting to Nursery...</p>
      </div>
    );
  }

  const daysPassed = getDaysPassed(pet.pregnancyStartDate);
  const bioTotalDays = getBioTotalDays(pet.type);
  const progress = Math.min((daysPassed / bioTotalDays) * 100, 100);

  const startDate = new Date(pet.pregnancyStartDate);
  const dueDate = new Date(startDate);
  dueDate.setDate(startDate.getDate() + bioTotalDays);

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-[#FDF6F6] p-4 md:p-10">
      <div className="max-w-5xl mx-auto">
        
        {/* --- HEADER CARD --- */}
        <div className="bg-white rounded-[2.5rem] shadow-xl p-8 mb-8 border-t-8 border-pink-400 relative overflow-hidden">
           <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
               <span className="text-9xl">🐾</span>
           </div>
           
           <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
               <div className="relative">
                 <img src={pet.imageUrls[0]} alt={pet.name} className="w-28 h-28 rounded-full object-cover border-4 border-pink-100 shadow-lg" />
                 <div className="absolute bottom-0 right-0 bg-pink-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-md">Mom</div>
               </div>
               <div className="text-center md:text-left">
                   <h1 className="text-3xl md:text-4xl font-extrabold text-gray-800 mb-1">Pregnancy Tracker</h1>
                   <div className="flex flex-wrap justify-center md:justify-start gap-3 text-sm font-medium text-gray-500">
                      <span className="bg-pink-50 px-3 py-1 rounded-lg text-pink-600 border border-pink-100">❤️ {pet.name}</span>
                      <span className="bg-purple-50 px-3 py-1 rounded-lg text-purple-600 border border-purple-100">📅 Day {getDaysPassed(pet.pregnancyStartDate)} of Biology</span>
                   </div>
               </div>
           </div>

           {/* Progress Bar */}
           <div className="mt-10 relative">
               <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                   <span>Conception</span>
                   <span>Current Stage</span>
                   <span>Due Date</span>
               </div>
               <div className="flex justify-between text-[9px] font-medium text-gray-500 mb-2">
                   <span>{formatDate(startDate)}</span>
                   <span></span>
                   <span>{formatDate(dueDate)}</span>
               </div>
               <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                   <div className="bg-gradient-to-r from-pink-300 to-pink-500 h-3 rounded-full transition-all duration-1000 relative" style={{ width: `${progress}%` }}>
                      <div className="absolute right-0 top-0 h-full w-2 bg-white/50 animate-pulse"></div>
                   </div>
               </div>
           </div>
        </div>

        {/* --- MAIN CONTENT GRID --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* LEFT: DAILY PLAN (2/3 Width) */}
            <div className="lg:col-span-2 space-y-6">
                {/* Today's Recommendations */}
                <div className="bg-white p-8 rounded-[2rem] shadow-lg border border-pink-100/50">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <span className="text-3xl">📅</span> Today's Care Plan
                    </h2>
                    
                    <div className="space-y-6">
                        <div className="bg-green-50/50 p-5 rounded-2xl border border-green-100 hover:shadow-sm transition-shadow">
                            <h3 className="text-xs font-extrabold text-green-600 uppercase tracking-wider mb-2 flex items-center gap-2">
                                🍎 Nutrition
                            </h3>
                            <p className="text-gray-700 leading-relaxed font-medium">{todayPlan.food}</p>
                        </div>

                        <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100 hover:shadow-sm transition-shadow">
                            <h3 className="text-xs font-extrabold text-blue-600 uppercase tracking-wider mb-2 flex items-center gap-2">
                                🏃‍♀️ Activity
                            </h3>
                            <p className="text-gray-700 leading-relaxed font-medium">{todayPlan.activity}</p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-purple-50/50 p-5 rounded-2xl border border-purple-100">
                                <h3 className="text-xs font-extrabold text-purple-600 uppercase tracking-wider mb-2">🛁 Care Tips</h3>
                                <p className="text-sm text-gray-600">{todayPlan.careTips}</p>
                            </div>
                            <div className="bg-red-50/50 p-5 rounded-2xl border border-red-100">
                                <h3 className="text-xs font-extrabold text-red-500 uppercase tracking-wider mb-2">⚠️ Watch For</h3>
                                <p className="text-sm text-gray-600">{todayPlan.warningSigns}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* NAVIGATION */}
                <div className="flex justify-between items-center px-4">
                    <button 
                        disabled={currentDayIndex <= 0}
                        onClick={() => {
                            const newIndex = currentDayIndex - 1;
                            setCurrentDayIndex(newIndex);
                            setTodayPlan(pet.pregnancyPlan[newIndex]);
                            setMenuResult(null); setVisualResult(null); 
                        }}
                        className="text-sm font-bold text-gray-400 hover:text-[#4A90E2] disabled:opacity-30 transition-colors flex items-center gap-2"
                    >
                        &larr; Previous Day
                    </button>
                    <button 
                        disabled={currentDayIndex >= pet.pregnancyPlan.length - 1}
                        onClick={() => {
                            const newIndex = currentDayIndex + 1;
                            setCurrentDayIndex(newIndex);
                            setTodayPlan(pet.pregnancyPlan[newIndex]);
                            setMenuResult(null); setVisualResult(null);
                        }}
                        className="text-sm font-bold text-gray-400 hover:text-[#4A90E2] disabled:opacity-30 transition-colors flex items-center gap-2"
                    >
                        Next Day &rarr;
                    </button>
                </div>
            </div>

            {/* RIGHT: AI EXTRAS (1/3 Width) */}
            <div className="space-y-6">
                
                <div className="bg-gradient-to-br from-[#4A90E2] to-[#50E3C2] p-1 rounded-[2rem] shadow-xl">
                    <div className="bg-white rounded-[1.9rem] p-6 h-full">
                        <h3 className="font-extrabold text-gray-800 mb-4 flex items-center gap-2">
                            <SparklesIcon /> AI Mom Assistant
                        </h3>

                        {/* 1. MEAL GENERATOR */}
                        <div className="mb-6 border-b border-gray-100 pb-6">
                            {!menuResult ? (
                                <div className="text-center">
                                    <div className="bg-orange-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3 text-orange-500 shadow-sm">
                                        <ChefIcon />
                                    </div>
                                    <h4 className="font-bold text-gray-700 mb-1">Hungry Momma?</h4>
                                    <p className="text-xs text-gray-400 mb-4">Get a specialized menu for {todayPlan?.week ? `Week ${todayPlan.week}` : `Day ${getPlanDay(todayPlan, currentDayIndex)}`}</p>
                                    <button 
                                        onClick={generateMenu} 
                                        disabled={menuLoading}
                                        className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-sm transition-all shadow-md disabled:opacity-70"
                                    >
                                        {menuLoading ? "Cooking..." : "Generate Healthy Menu"}
                                    </button>
                                </div>
                            ) : (
                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="font-bold text-orange-500 text-sm">🍽️ Today's Menu</h4>
                                        <button onClick={() => setMenuResult(null)} className="text-xs text-gray-400 hover:text-gray-600">Reset</button>
                                    </div>
                                    <div className="bg-orange-50 p-4 rounded-xl text-xs text-gray-700 leading-relaxed max-h-60 overflow-y-auto custom-scrollbar">
                                        <ReactMarkdown components={{
                                            strong: ({node, ...props}) => <span className="font-bold text-orange-800 block mt-2 mb-1" {...props} />,
                                            ul: ({node, ...props}) => <ul className="list-disc pl-4 space-y-1" {...props} />,
                                            li: ({node, ...props}) => <li className="pl-1" {...props} />
                                        }}>
                                            {menuResult}
                                        </ReactMarkdown>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 2. SIZE VISUALIZER */}
                        <div>
                            {!visualResult ? (
                                <div className="text-center">
                                    <div className="bg-purple-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3 text-purple-500 shadow-sm">
                                        <RulerIcon />
                                    </div>
                                    <h4 className="font-bold text-gray-700 mb-1">How big are they?</h4>
                                    <p className="text-xs text-gray-400 mb-4">Visual size comparison for today</p>
                                    <button 
                                        onClick={generateVisual} 
                                        disabled={visualLoading}
                                        className="w-full py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-xl font-bold text-sm transition-all shadow-md disabled:opacity-70"
                                    >
                                        {visualLoading ? "Measuring..." : "See Baby Size"}
                                    </button>
                                </div>
                            ) : (
                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 text-center">
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="font-bold text-purple-500 text-sm">📏 Size Tracker</h4>
                                        <button onClick={() => setVisualResult(null)} className="text-xs text-gray-400 hover:text-gray-600">Reset</button>
                                    </div>
                                    <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                                        
                                        {/* --- FIX START: SAFELY HANDLE BROKEN IMAGES --- */}
                                        <div className="aspect-square w-full relative rounded-lg overflow-hidden mb-3 shadow-sm bg-white flex items-center justify-center">
                                            {visualResult.imageUrl ? (
                                                <img 
                                                    src={visualResult.imageUrl} 
                                                    alt="Size comparison" 
                                                    className="object-cover w-full h-full"
                                                    onError={(e) => {
                                                        // 1. Capture parent first to prevent null error
                                                        const parent = e.target.parentElement;
                                                        if (parent) {
                                                            // 2. Show fallback content
                                                            parent.innerText = "🌱"; 
                                                            parent.style.fontSize = "4rem";
                                                            parent.style.display = "flex";
                                                            parent.style.justifyContent = "center";
                                                            parent.style.alignItems = "center";
                                                        }
                                                    }} 
                                                />
                                            ) : (
                                                <div className="text-purple-200 text-4xl">?</div>
                                            )}
                                        </div>
                                        {/* --- FIX END --- */}

                                        <p className="text-sm font-bold text-purple-800 leading-tight">
                                            {visualResult.text}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                    </div>
                </div>

                {/* Quick Links */}
                <div className="grid grid-cols-2 gap-4">
                    <Link href="/AiDoc" className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 text-center hover:shadow-md transition-all group">
                        <span className="text-2xl block mb-1 group-hover:scale-110 transition-transform">🩺</span>
                        <span className="text-xs font-bold text-gray-600">Ask Dr. Paws</span>
                    </Link>
                    <Link href="/Profile" className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 text-center hover:shadow-md transition-all group">
                        <span className="text-2xl block mb-1 group-hover:scale-110 transition-transform">⚙️</span>
                        <span className="text-xs font-bold text-gray-600">Profile Settings</span>
                    </Link>
                </div>

            </div>
        </div>

      </div>
    </div>
  );
}
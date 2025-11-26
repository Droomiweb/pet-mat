// app/not-found.js
"use client";
import Link from "next/link";
import { useState, useEffect } from "react";

// --- THE NEW "DIGGING DOG" ANIMATION ---
const DiggingDogScene = () => {
  // Use state to ensure randomness only happens on the client
  const [dirtParticles, setDirtParticles] = useState([]);

  useEffect(() => {
    // Generate dirt particles only once on the client
    const particles = Array.from({ length: 6 }).map((_, i) => ({
      r: Math.random() * 4 + 2,
      delay: i * 0.2,
    }));
    setDirtParticles(particles);
  }, []);

  return (
    <div className="relative w-full max-w-lg h-80 mx-auto">
      <svg viewBox="0 0 400 300" className="w-full h-full drop-shadow-2xl overflow-visible">
        <defs>
          <linearGradient id="skyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#E2F4EF" stopOpacity="0" />
            <stop offset="100%" stopColor="#Cbf0e6" stopOpacity="1" />
          </linearGradient>
          <filter id="dirtBlur">
            <feGaussianBlur in="SourceGraphic" stdDeviation="1" />
          </filter>
        </defs>

        {/* Ground/Hole */}
        <ellipse cx="200" cy="260" rx="120" ry="30" fill="#3D2B1F" opacity="0.2" />
        <ellipse cx="200" cy="250" rx="100" ry="25" fill="#5D4037" />
        <ellipse cx="200" cy="255" rx="90" ry="15" fill="#3E2723" />

        {/* --- THE DIGGING DOG (Back View) --- */}
        <g transform="translate(200, 220)">
          {/* Body Shake Animation Wrapper */}
          <g className="animate-digging">
              
              {/* Dog Body (Butt) */}
              <path d="M-40,0 Q-50,-60 0,-70 Q50,-60 40,0 Z" fill="#E6C229" stroke="#D4B018" strokeWidth="2" />
              
              {/* Spots */}
              <circle cx="-20" cy="-40" r="10" fill="#fff" opacity="0.6" />
              <circle cx="25" cy="-30" r="8" fill="#fff" opacity="0.6" />

              {/* Tail (Wag Animation) */}
              <g className="animate-wag origin-bottom">
                  <path d="M0,-60 Q-5,-90 0,-110 Q5,-90 0,-60" fill="#E6C229" stroke="#D4B018" strokeWidth="3" />
                  <circle cx="0" cy="-110" r="5" fill="#fff" /> {/* Tail Tip */}
              </g>

              {/* Back Paws (Planted) */}
              <ellipse cx="-45" cy="25" rx="12" ry="8" fill="#fff" stroke="#D4B018" strokeWidth="2" />
              <ellipse cx="45" cy="25" rx="12" ry="8" fill="#fff" stroke="#D4B018" strokeWidth="2" />
          </g>
        </g>

        {/* --- FLYING DIRT PARTICLES --- */}
        <g transform="translate(200, 250)">
           {dirtParticles.map((p, i) => (
              <circle 
                key={i} 
                r={p.r} 
                fill="#795548" 
                className="animate-dirt" 
                style={{ animationDelay: `${p.delay}s` }} 
              />
           ))}
        </g>

        {/* --- BURIED TREASURE (404 Bone) --- */}
        <g transform="translate(320, 220) rotate(15)">
           <rect x="-10" y="-30" width="20" height="60" rx="5" fill="#FFF" stroke="#E2E8F0" strokeWidth="2" />
           <circle cx="-10" cy="-35" r="10" fill="#FFF" stroke="#E2E8F0" strokeWidth="2" />
           <circle cx="10" cy="-35" r="10" fill="#FFF" stroke="#E2E8F0" strokeWidth="2" />
           <circle cx="-10" cy="35" r="10" fill="#FFF" stroke="#E2E8F0" strokeWidth="2" />
           <circle cx="10" cy="35" r="10" fill="#FFF" stroke="#E2E8F0" strokeWidth="2" />
           
           <text x="0" y="10" textAnchor="middle" fontSize="24" fontWeight="bold" fill="#4A90E2" style={{ fontFamily: 'Arial' }}>404</text>
           <path d="M0,45 L0,80" stroke="#8D6E63" strokeWidth="4" />
        </g>

        {/* --- FLOATING QUESTION MARKS --- */}
        <text x="100" y="150" fontSize="40" fill="#4A90E2" opacity="0.5" className="animate-bounce" style={{ animationDuration: '3s' }}>?</text>
        <text x="300" y="100" fontSize="30" fill="#50E3C2" opacity="0.5" className="animate-bounce" style={{ animationDuration: '4s' }}>?</text>

      </svg>

      {/* --- CSS ANIMATIONS --- */}
      <style jsx>{`
        .animate-digging {
          animation: shake 0.5s infinite;
        }
        .animate-wag {
          transform-box: fill-box;
          transform-origin: bottom center;
          animation: wag 0.5s infinite alternate ease-in-out;
        }
        .animate-dirt {
          animation: flyDirt 1s infinite linear;
          opacity: 0;
        }
        
        @keyframes shake {
          0% { transform: translateY(0) rotate(0deg); }
          25% { transform: translateY(2px) rotate(1deg); }
          50% { transform: translateY(0) rotate(0deg); }
          75% { transform: translateY(2px) rotate(-1deg); }
          100% { transform: translateY(0) rotate(0deg); }
        }
        @keyframes wag {
          from { transform: rotate(-15deg); }
          to { transform: rotate(15deg); }
        }
        @keyframes flyDirt {
          0% { transform: translate(0, 0) scale(1); opacity: 1; }
          50% { transform: translate(-40px, -60px) scale(0.8); opacity: 0.8; }
          100% { transform: translate(-80px, 20px) scale(0); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default function NotFound() {
  // Client-side random values for background paws to prevent hydration error
  const [paws, setPaws] = useState([]);

  useEffect(() => {
    const newPaws = Array.from({ length: 8 }).map(() => ({
        top: `${Math.random() * 100}%`,
        left: `${Math.random() * 100}%`,
        duration: `${Math.random() * 5 + 2}s`,
        delay: `${Math.random() * 2}s`
    }));
    setPaws(newPaws);
  }, []);

  return (
    <div className="min-h-screen bg-[#E2F4EF] flex flex-col items-center justify-center p-6 relative overflow-hidden text-center">
      
      {/* Background Decoration (Paws) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
         <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-200 rounded-full blur-3xl"></div>
         <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-pink-200 rounded-full blur-3xl"></div>
         
         {/* Render Paws only after client load */}
         {paws.map((style, i) => (
            <div key={i} className="absolute text-4xl animate-pulse opacity-30" style={{ 
                top: style.top, 
                left: style.left,
                animationDuration: style.duration,
                animationDelay: style.delay
            }}>🐾</div>
         ))}
      </div>

      <div className="relative z-10 max-w-3xl w-full flex flex-col items-center">
        
        {/* --- MAIN ANIMATION --- */}
        <div className="mb-2 w-full animate-in zoom-in duration-700">
            <DiggingDogScene />
        </div>

        {/* --- TEXT & ACTIONS --- */}
        <h1 className="text-5xl md:text-7xl font-extrabold text-[#333333] mb-4 tracking-tight drop-shadow-sm">
          404 <span className="text-[#4A90E2]">Found!</span>
        </h1>
        <p className="text-lg text-gray-500 font-bold uppercase tracking-widest mb-4">
            (Just Kidding, It's Not Here)
        </p>
        
        <p className="text-gray-600 text-lg md:text-xl max-w-lg mb-10 leading-relaxed">
          Our scent hounds dug everywhere, but this page seems to be buried too deep. Maybe it chased a squirrel?
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto justify-center">
            <Link 
              href="/" 
              className="px-8 py-4 bg-gradient-to-r from-[#4A90E2] to-[#3A75B9] text-white font-bold rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all active:scale-95 flex items-center justify-center gap-3"
            >
              <span className="text-xl">🏠</span> Back to Home
            </Link>
            
            <Link 
              href="/vet-locator" 
              className="px-8 py-4 bg-white text-gray-700 border-2 border-gray-200 font-bold rounded-2xl shadow-sm hover:bg-gray-50 hover:border-[#4A90E2] hover:text-[#4A90E2] transition-all active:scale-95 flex items-center justify-center gap-3"
            >
              <span className="text-xl">🚑</span> Find Help
            </Link>
        </div>

      </div>
    </div>
  );
}
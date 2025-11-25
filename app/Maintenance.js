// app/Maintenance.js
"use client";
import React from 'react';
import Image from 'next/image';

// --- ANIMATED SVG COMPONENT ---
const SleepingPets = () => (
  <svg viewBox="0 0 200 120" className="w-64 h-40 mx-auto drop-shadow-xl">
    {/* --- Dog Sleeping --- */}
    <g transform="translate(20, 40)">
        {/* Body */}
        <path d="M10,50 Q30,20 70,30 T110,60" fill="none" stroke="#8B5E3C" strokeWidth="40" strokeLinecap="round" />
        {/* Head */}
        <circle cx="10" cy="55" r="25" fill="#8B5E3C" />
        <path d="M-5,50 Q10,65 25,50" fill="none" stroke="#5D3A24" strokeWidth="3" /> {/* Ear */}
        {/* Zzz Animation */}
        <text x="30" y="10" fontSize="16" fill="#4A90E2" className="animate-pulse" style={{ animationDuration: '2s' }}>z</text>
        <text x="45" y="-5" fontSize="20" fill="#4A90E2" className="animate-pulse" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }}>Z</text>
    </g>

    {/* --- Cat Sleeping on Dog --- */}
    <g transform="translate(80, 30)">
        {/* Body */}
        <ellipse cx="40" cy="30" rx="25" ry="18" fill="#E0E0E0" />
        {/* Head */}
        <circle cx="60" cy="35" r="15" fill="#E0E0E0" />
        {/* Ears */}
        <path d="M50,25 L55,10 L65,25 Z" fill="#E0E0E0" />
        <path d="M65,25 L75,10 L70,25 Z" fill="#E0E0E0" />
        {/* Tail */}
        <path d="M20,30 Q10,10 30,10" fill="none" stroke="#E0E0E0" strokeWidth="5" strokeLinecap="round">
            <animate attributeName="d" values="M20,30 Q10,10 30,10; M20,30 Q10,15 30,15; M20,30 Q10,10 30,10" dur="4s" repeatCount="indefinite" />
        </path>
    </g>
  </svg>
);

export default function MaintenancePage() {
  return (
    <div className="min-h-screen bg-[#FDF6F6] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('/imgs/pattern.png')]"></div>
      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-pink-200 rounded-full blur-3xl opacity-30 animate-pulse"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-blue-200 rounded-full blur-3xl opacity-30 animate-pulse" style={{animationDelay: '1s'}}></div>

      <div className="max-w-lg w-full bg-white/90 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white p-10 text-center relative z-10 animate-in zoom-in duration-500">
        
        {/* Logo / Brand */}
        <div className="mb-6 flex justify-center">
            <div className="bg-gradient-to-br from-[#4A90E2] to-[#50E3C2] w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-lg text-white">
                🐾
            </div>
        </div>

        {/* Animated Illustration */}
        <div className="mb-8 py-4">
            <SleepingPets />
        </div>

        <h1 className="text-3xl font-extrabold text-gray-800 mb-4 tracking-tight">
          We'll Be Right Back
        </h1>
        
        <p className="text-gray-500 text-lg leading-relaxed mb-8">
          PetLink is currently taking a short nap for scheduled maintenance. 
          <br />
          We're polishing things up to make your experience even better!
        </p>

        {/* Status Pill */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-full">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
            </span>
            <span className="text-xs font-bold text-yellow-700 uppercase tracking-wide">System Updating</span>
        </div>

      </div>
      
      <div className="mt-8 text-gray-400 text-sm font-medium">
        &copy; {new Date().getFullYear()} PetLink. All rights reserved.
      </div>
    </div>
  );
}
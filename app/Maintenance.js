// app/Maintenance.js
"use client";
import React from 'react';
import Image from 'next/image';

export default function MaintenancePage() {
  return (
    <div className="min-h-screen bg-[#F6F1E9] p-4 md:p-10 flex flex-col items-center justify-center text-center">
      <div className="max-w-xl mx-auto bg-white rounded-3xl shadow-lg p-6 md:p-10">
        <Image src="/imgs/topimg.png" alt="PetMate Logo" width={200} height={200} className="mx-auto mb-8" />
        <h1 className="text-4xl font-bold text-[#4F200D] mb-4">Under Maintenance</h1>
        <p className="text-xl text-[#4F200D]">
          We apologize for the inconvenience. Our website is currently undergoing scheduled maintenance. We'll be back online shortly!
        </p>
      </div>
    </div>
  );
}
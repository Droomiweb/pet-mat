// app/nav.jsx
"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    // Updated background to primary blue
    <nav className="bg-[#4A90E2] shadow-xl"> 
      <div className="max-w-7xl mx-auto px-4 sm:px-8 flex justify-between items-center py-3">
        {/* Logo / Left Links */}
        <div className="flex items-center space-x-2">
          <h1 className="text-white font-extrabold text-2xl tracking-wider">PetLink</h1>
        </div>

        {/* Desktop Links */}
        <div className="hidden sm:flex items-center space-x-3">
          {["Home", "Social", "Market", "Community"].map((item) => (
            <Link
              key={item}
              href={item === "Home" ? "/" : item}
              className="px-4 py-2 rounded-lg text-white font-semibold hover:text-[#4A90E2] hover:bg-white transition-all duration-300 shadow-md hover:shadow-xl"
            >
              {item}
            </Link>
          ))}
        </div>

        {/* Right Actions */}
        <div className="flex items-center space-x-4">
          {/* Add Pet button - using the secondary accent color */}
          <button
            onClick={() => window.location.replace("/Addpet")}
            className="hidden sm:inline-block bg-[#50E3C2] text-[#333333] px-5 py-2 rounded-full font-bold shadow-md hover:shadow-xl hover:scale-105 transition-all duration-300"
          >
            + New Pet
          </button>

          {/* Profile */}
          <Link href="/Profile">
            <Image
              src="/imgs/profile.jpg"
              alt="profile"
              width={40}
              height={40}
              // Updated border color to secondary accent
              className="rounded-full border-2 border-[#50E3C2] shadow-lg hover:shadow-xl hover:ring-2 ring-white transition-all duration-300" 
            />
          </Link>

          {/* Hamburger menu for mobile */}
          <button
            className="sm:hidden ml-2 focus:outline-none"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <div className="w-6 h-0.5 bg-white mb-1 transition-all duration-300" />
            <div className="w-6 h-0.5 bg-white mb-1 transition-all duration-300" />
            <div className="w-6 h-0.5 bg-white transition-all duration-300" />
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="sm:hidden bg-[#4A90E2] px-4 pb-4 transition-all duration-300">
          {["Home", "Social", "Market", "Community"].map((item) => (
            <Link
              key={item}
              href={item === "Home" ? "/" : "#"}
              className="block px-4 py-2 mt-1 rounded-lg text-white font-semibold hover:text-[#4A90E2] hover:bg-white transition-all duration-300"
              onClick={() => setMenuOpen(false)}
            >
              {item}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
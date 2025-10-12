"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="bg-orange-400 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 flex justify-between items-center py-3">
        {/* Logo / Left Links */}
        <div className="flex items-center space-x-2">
          <h1 className="text-white font-bold text-xl sm:text-2xl">PetMate</h1>
        </div>

        {/* Desktop Links */}
        <div className="hidden sm:flex items-center space-x-3">
          {["Home", "Social", "Market", "Hhh"].map((item) => (
            <Link
              key={item}
              href="/Home"
              className="px-4 py-2 rounded-lg text-white font-semibold hover:text-orange-400 hover:bg-white transition-all duration-300 shadow-sm hover:shadow-md"
            >
              {item}
            </Link>
          ))}
        </div>

        {/* Right Actions */}
        <div className="flex items-center space-x-3">
          {/* Add Pet button - hidden on mobile */}
          <button
            onClick={() => window.location.replace("/Addpet")}
            className="hidden sm:inline-block bg-yellow-400 px-4 py-2 rounded-lg font-semibold shadow-md hover:shadow-lg hover:scale-105 transition-all duration-300"
          >
            + Add Pet
          </button>

          {/* Profile */}
          <Link href="/Profile">
            <Image
              src="/imgs/profile.jpg"
              alt="profile"
              width={40}
              height={40}
              className="rounded-full border-2 border-yellow-400 shadow-sm hover:shadow-md transition-all duration-300"
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
        <div className="sm:hidden bg-orange-400 px-4 pb-4 transition-all duration-300">
          {["Home", "Social", "Market", "Hhh"].map((item) => (
            <Link
              key={item}
              href="/Home"
              className="block px-4 py-2 rounded-lg text-white font-semibold hover:text-orange-400 hover:bg-white transition-all duration-300"
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

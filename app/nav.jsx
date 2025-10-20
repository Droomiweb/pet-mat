// app/nav.jsx
"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "./auth-provider";
import { auth } from "./lib/firebase"; 
import { useRouter } from "next/navigation";

// --- START: Self-Contained SVG Icon Components ---

// User Profile Icon (for the left side)
const ProfileIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width={props.size || "24"} height={props.size || "24"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

// List/Menu Icon (for the mobile hamburger menu)
const ListIcon = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width={props.size || "24"} height={props.size || "24"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="3" x2="21" y1="12" y2="12"/>
        <line x1="3" x2="21" y1="6" y2="6"/>
        <line x1="3" x2="21" y1="18" y2="18"/>
    </svg>
);

// Message Icon (for the message count on the right)
const MessageIcon = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width={props.size || "24"} height={props.size || "24"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
);

// --- END: Self-Contained SVG Icon Components ---

export default function Navbar({ unreadMessageCount = 0 }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useAuth();
  const router = useRouter();
  
  const handleLogout = async () => {
    await auth.signOut();
    router.push("/Login");
  };

  const navItems = [
      { name: "Home", href: "/" },
      { name: "Marketplace", href: "/marketplace" },
      { name: "Dr. Paws AI", href: "/AiDoc" },
      { name: "Add New Pet", href: "/Addpet", isButton: true }, // Added as a Nav item for mobile
      { name: "Logout", onClick: handleLogout, isButton: true }, // Added Logout
  ];
  
  // Exclude Add Pet and Logout from desktop links
  const desktopNavItems = navItems.filter(item => !item.isButton);

  return (
    <nav className="bg-primary shadow-xl sticky top-0 z-50"> 
      <div className="max-w-7xl mx-auto px-4 sm:px-8 flex justify-between items-center py-3">
        
        {/* LEFT SIDE: Profile/Menu Toggle */}
        <div className="flex items-center space-x-4">
          
          {/* Mobile Menu Toggle (only on small screens) */}
          <button
            className="sm:hidden focus:outline-none p-1 rounded-full text-white hover:bg-[#3A75B9] transition-colors duration-300"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <ListIcon size={28} />
          </button>
          
          {/* Profile Icon / Home Link for Desktop */}
          <Link href="/Profile" className="hidden sm:block">
            <div className="flex items-center space-x-2 cursor-pointer p-1 rounded-full hover:bg-white/10 transition-colors duration-300">
                <ProfileIcon 
                  size={30} 
                  className="rounded-full bg-white text-[#4A90E2] border-2 border-[#50E3C2] p-0.5" 
                />
                <span className="text-white font-semibold hidden md:inline transition-colors duration-300">{user?.email.split('@')[0] || 'Profile'}</span>
            </div>
          </Link>
          
          <h1 className="text-white font-extrabold text-2xl tracking-wider hidden sm:block">PetLink</h1>
        </div>

        {/* CENTER/RIGHT: Desktop Nav Links (FIXED STYLING FOR MAGIC HOVER) */}
        <div className="hidden sm:flex items-center space-x-3">
          {desktopNavItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              // FIXED: Ensuring all related transition properties are applied for a smooth "transfer" effect.
              // We keep the background/text change, but rely on Tailwind's utility class for the animation timing.
              className="px-4 py-2 rounded-lg font-semibold 
                         text-white transition-all duration-300 ease-in-out shadow-md
                         hover:text-primary hover:bg-white hover:shadow-xl"
            >
              {item.name}
            </Link>
          ))}
          {/* Desktop Add Pet Button */}
          <button
            onClick={() => router.push("/Addpet")}
            // Added transition to the buttons for consistency
            className="bg-secondary text-primary px-5 py-2 rounded-full font-bold shadow-md 
                       hover:shadow-xl hover:scale-105 transition-all duration-300 ml-4"
          >
            + New Pet
          </button>
          
          {/* Desktop Logout Button */}
          <button
            onClick={handleLogout}
            // Added transition to the buttons for consistency
            className="bg-red-500 text-white px-5 py-2 rounded-full font-bold shadow-md 
                       hover:shadow-xl hover:scale-105 transition-all duration-300"
          >
            Logout
          </button>
        </div>

        {/* RIGHT SIDE: Message Icon with Count (Visible on all screens) */}
        <Link href="/messages" className="relative p-2 rounded-full text-white hover:bg-white/10 transition-colors duration-300">
            <MessageIcon size={28} />
            {unreadMessageCount > 0 && (
                <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full transition-all duration-300">
                    {unreadMessageCount}
                </span>
            )}
        </Link>
      </div>

      {/* Mobile Side Menu (New Implementation) */}
      <div 
        className={`fixed top-0 left-0 h-full w-64 bg-white shadow-2xl transition-transform duration-300 z-50 sm:hidden ${
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-5 bg-primary/90 text-white flex flex-col items-start pt-10">
            <Link href="/Profile" onClick={() => setMenuOpen(false)}>
                 <ProfileIcon 
                    size={48} 
                    className="rounded-full bg-white text-[#4A90E2] border-2 border-[#50E3C2] p-1 mb-2" 
                  />
            </Link>
            <p className="text-xl font-bold">{user?.email.split('@')[0] || 'Guest'}</p>
            <p className="text-sm opacity-80">View Profile</p>
        </div>
        
        <div className="flex flex-col p-4 space-y-2">
            {[...desktopNavItems, ...navItems.filter(item => item.isButton)].map((item) => (
                <div key={item.name}>
                    {item.href ? (
                        <Link
                            href={item.href}
                            // Ensuring smooth hover transition on mobile menu items too
                            className={`block px-4 py-2 rounded-lg text-primary font-semibold hover:bg-gray-100 transition-colors duration-300 ${item.isButton ? 'mt-4 border-t pt-4 text-accent' : ''}`}
                            onClick={() => setMenuOpen(false)}
                        >
                            {item.name}
                        </Link>
                    ) : (
                        <button
                            onClick={() => { item.onClick(); setMenuOpen(false); }}
                            className="w-full text-left px-4 py-2 rounded-lg text-red-500 font-semibold hover:bg-red-50 transition-colors duration-300"
                        >
                            {item.name}
                        </button>
                    )}
                </div>
            ))}
        </div>
      </div>
      
      {/* Overlay to close menu when clicked outside */}
      {menuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 sm:hidden" 
          onClick={() => setMenuOpen(false)} 
        />
      )}
    </nav>
  );
}
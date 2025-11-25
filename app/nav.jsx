// app/nav.jsx
"use client";
import { useState, useEffect, Fragment } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "./auth-provider";
import { auth } from "./lib/firebase";
import { useRouter, usePathname } from "next/navigation";
import { Dialog, Disclosure, Menu, Transition } from "@headlessui/react";

// --- ICONS ---
const MenuIcon = (props) => (<svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>);
const XIcon = (props) => (<svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>);
const ChevronDownIcon = (props) => (<svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>);
const BellIcon = (props) => (<svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.37 21a2 2 0 0 0 3.26 0"/></svg>);
const MessageIcon = (props) => (<svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>);
const LogoutIcon = (props) => (<svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>);

// --- SUBMENU ICONS ---
const VetIcon = () => <span className="text-lg">🏥</span>;
const AdoptionIcon = () => <span className="text-lg">🏠</span>;
const HeartIcon = () => <span className="text-lg">❤️</span>;

export default function Navbar({ unreadMessageCount = 0, reminderCount = 0 }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [pregnantPetId, setPregnantPetId] = useState(null);
  const [showNoPregnancyModal, setShowNoPregnancyModal] = useState(false);

  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // --- SCROLL EFFECT ---
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // --- CHECK FOR PREGNANT PET ---
  useEffect(() => {
    if (user) {
      const checkPregnancy = async () => {
        try {
          const timestamp = new Date().getTime();
          const res = await fetch(`/api/pet/user/${user.uid}?t=${timestamp}`);
          if (res.ok) {
            const pets = await res.json();
            const pregnant = pets.find(p => p.isPregnant);
            if (pregnant) setPregnantPetId(pregnant._id);
            else setPregnantPetId(null);
          }
        } catch (e) { console.error(e); }
      };
      checkPregnancy();
    }
  }, [user, pathname]);

  const handleLogout = async () => {
    await auth.signOut();
    router.push("/Login");
    setMobileMenuOpen(false);
  };

  const handlePregnancyClick = (e) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    if (pregnantPetId) {
        router.push(`/pregnancy-tracker/${pregnantPetId}`);
    } else {
        setShowNoPregnancyModal(true);
    }
  };

  // --- NAVIGATION CONFIG ---
  const mainNavItems = [
    { name: "Home", href: "/" },
    { name: "Community", href: "/community" }, // Moved to Main Menu
    { name: "Dr. Paws AI", href: "/AiDoc" },
    { name: "Marketplace", href: "/marketplace" },
  ];

  const subMenuItems = [
    { name: "Adoption Center", href: "/adoption", icon: AdoptionIcon, desc: "Find a new friend" },
    { name: "Vet Locator", href: "/vet-locator", icon: VetIcon, desc: "Clinics nearby" },
    // Pregnancy Tracker logic is handled separately in the dropdown render
  ];

  const isActive = (href) => pathname === href;

  // Helper for badge counts (9+)
  const getBadgeText = (count) => (count > 9 ? '9+' : count);

  return (
    <>
      {/* --- NO PREGNANCY MODAL --- */}
      {showNoPregnancyModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center animate-in zoom-in duration-200">
                <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                    🤰
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">Pregnancy Tracker</h3>
                <p className="text-gray-600 mb-6">
                    This feature tracks day-by-day gestation for pets confirmed as pregnant. 
                    <br/><br/>
                    To activate it, go to <strong>My Profile</strong>, select a female pet, and click <strong>"Confirm Pregnancy"</strong>.
                </p>
                <div className="flex gap-2 justify-center">
                    <button onClick={() => setShowNoPregnancyModal(false)} className="px-6 py-2 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition">Close</button>
                    <Link href="/Profile" onClick={() => setShowNoPregnancyModal(false)} className="px-6 py-2 rounded-xl font-bold text-white bg-[#4A90E2] hover:bg-[#3A75B9] transition shadow-lg">Go to Profile</Link>
                </div>
            </div>
        </div>
      )}

      {/* --- NAVBAR --- */}
      <header 
        className={`fixed top-0 w-full z-50 transition-all duration-300 ${
            scrolled 
            ? "bg-white/80 backdrop-blur-xl shadow-md border-b border-white/20 h-16" 
            : "bg-white/60 backdrop-blur-md border-b border-white/10 h-20"
        }`}
      >
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
            
            {/* 1. LOGO */}
            <div className="flex items-center gap-4">
                {/* Mobile Toggle */}
                <button className="lg:hidden text-gray-600 hover:text-[#4A90E2]" onClick={() => setMobileMenuOpen(true)}>
                    <MenuIcon className="w-7 h-7" />
                </button>

                <Link href="/" className="flex items-center gap-2 group">
                    <div className="relative w-10 h-10 transition-transform duration-300 group-hover:scale-110">
                        <Image src="/icon.svg" alt="Logo" fill className="object-contain drop-shadow-sm" priority />
                    </div>
                    <span className="text-2xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-[#4A90E2] to-[#50E3C2] hidden sm:block">
                        PetLink
                    </span>
                </Link>
            </div>

            {/* 2. DESKTOP MENU */}
            <div className="hidden lg:flex items-center gap-1 bg-white/50 rounded-full px-2 py-1 border border-gray-100 shadow-sm backdrop-blur-sm">
                {mainNavItems.map(item => (
                    <Link 
                        key={item.name} 
                        href={item.href} 
                        className={`px-5 py-2 rounded-full text-sm font-bold transition-all duration-300 ${
                            isActive(item.href) 
                            ? "bg-gradient-to-r from-[#4A90E2] to-[#50E3C2] text-white shadow-md" 
                            : "text-gray-600 hover:text-[#4A90E2] hover:bg-white"
                        }`}
                    >
                        {item.name}
                    </Link>
                ))}

                {/* "Explore" Dropdown */}
                <Menu as="div" className="relative">
                    <Menu.Button className="flex items-center gap-1 px-5 py-2 rounded-full text-sm font-bold text-gray-600 hover:text-[#4A90E2] hover:bg-white transition-all outline-none">
                        Explore <ChevronDownIcon className="w-4 h-4" />
                    </Menu.Button>
                    <Transition
                        as={Fragment}
                        enter="transition ease-out duration-200"
                        enterFrom="opacity-0 translate-y-2"
                        enterTo="opacity-100 translate-y-0"
                        leave="transition ease-in duration-150"
                        leaveFrom="opacity-100 translate-y-0"
                        leaveTo="opacity-0 translate-y-2"
                    >
                        <Menu.Items className="absolute top-full right-0 mt-4 w-64 bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/50 p-2 ring-1 ring-black/5 focus:outline-none">
                            
                            {/* Pregnancy Link (Dynamic) */}
                            <Menu.Item>
                                {({ active }) => (
                                    <button 
                                        onClick={handlePregnancyClick}
                                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-left ${active ? 'bg-pink-50' : ''}`}
                                    >
                                        <div className="p-2 bg-pink-100 rounded-lg text-pink-500"><HeartIcon /></div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-800">Pregnancy Tracker</p>
                                            <p className="text-xs text-gray-500">{pregnantPetId ? "View Active Status" : "Daily Care Plan"}</p>
                                        </div>
                                    </button>
                                )}
                            </Menu.Item>

                            {subMenuItems.map(item => (
                                <Menu.Item key={item.name}>
                                    {({ active }) => (
                                        <Link href={item.href} className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${active ? 'bg-blue-50' : ''}`}>
                                            <div className="p-2 bg-blue-100 rounded-lg text-[#4A90E2]"><item.icon /></div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-800">{item.name}</p>
                                                <p className="text-xs text-gray-500">{item.desc}</p>
                                            </div>
                                        </Link>
                                    )}
                                </Menu.Item>
                            ))}
                        </Menu.Items>
                    </Transition>
                </Menu>
            </div>

            {/* 3. ACTIONS */}
            <div className="flex items-center gap-3">
                {user ? (
                    <>
                        {/* Add Pet Button (Desktop) */}
                        <Link href="/Addpet" className="hidden md:flex items-center gap-2 bg-[#333333] text-white px-5 py-2.5 rounded-full font-bold text-sm shadow-lg hover:bg-black hover:scale-105 transition-all">
                            <span>+</span> Add Pet
                        </Link>

                        {/* Notification Icons */}
                        <Link href="/reminders" className="relative p-2.5 rounded-full bg-gray-100 hover:bg-blue-50 text-gray-600 hover:text-[#4A90E2] transition-colors group">
                            <BellIcon className="w-6 h-6" />
                            {reminderCount > 0 && (
                                <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white group-hover:ring-blue-50 transition-all">
                                    {getBadgeText(reminderCount)}
                                </span>
                            )}
                        </Link>
                        
                        <Link href="/messages" className="relative p-2.5 rounded-full bg-gray-100 hover:bg-blue-50 text-gray-600 hover:text-[#4A90E2] transition-colors group">
                            <MessageIcon className="w-6 h-6" />
                            {unreadMessageCount > 0 && (
                                <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-green-500 text-[10px] font-bold text-white ring-2 ring-white group-hover:ring-blue-50 transition-all">
                                    {getBadgeText(unreadMessageCount)}
                                </span>
                            )}
                        </Link>

                        {/* Profile */}
                        <Link href="/Profile" className="relative w-10 h-10 rounded-full border-2 border-white shadow-md hover:ring-2 hover:ring-[#4A90E2] transition-all ml-1">
                            <Image src="/imgs/profile.jpg" alt="Profile" fill className="rounded-full object-cover" />
                        </Link>
                    </>
                ) : (
                    <div className="flex items-center gap-2">
                        <Link href="/Login" className="text-gray-600 font-bold text-sm hover:text-[#4A90E2] px-3 py-2">Login</Link>
                        <Link href="/Signup" className="bg-[#4A90E2] text-white px-5 py-2.5 rounded-full font-bold text-sm shadow-md hover:bg-[#3A75B9] transition">Sign Up</Link>
                    </div>
                )}
            </div>
        </nav>

        {/* --- MOBILE MENU DRAWER --- */}
        <Dialog as="div" className="lg:hidden" open={mobileMenuOpen} onClose={setMobileMenuOpen}>
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" />
            <Dialog.Panel className="fixed inset-y-0 left-0 z-50 w-4/5 max-w-xs bg-white/90 backdrop-blur-xl shadow-2xl p-6 overflow-y-auto">
                
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-2">
                        <div className="relative w-8 h-8">
                            <Image src="/icon.svg" alt="Logo" fill className="object-contain" />
                        </div>
                        <span className="text-xl font-extrabold text-gray-800">PetLink</span>
                    </div>
                    <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>

                <div className="space-y-6">
                    {/* Main Links */}
                    <div className="space-y-2">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Menu</p>
                        {mainNavItems.map((item) => (
                            <Link 
                                key={item.name} 
                                href={item.href} 
                                onClick={() => setMobileMenuOpen(false)}
                                className={`block px-4 py-3 rounded-xl font-bold text-lg transition-colors ${isActive(item.href) ? 'bg-blue-50 text-[#4A90E2]' : 'text-gray-700 hover:bg-gray-50'}`}
                            >
                                {item.name}
                            </Link>
                        ))}
                    </div>

                    {/* Tools Grid */}
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Explore</p>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={handlePregnancyClick} className="flex flex-col items-center justify-center p-4 bg-pink-50 rounded-2xl hover:bg-pink-100 transition">
                                <span className="text-2xl mb-1">❤️</span>
                                <span className="text-xs font-bold text-pink-600">Pregnancy</span>
                            </button>
                            {subMenuItems.map(item => (
                                <Link 
                                    key={item.name} 
                                    href={item.href} 
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-2xl hover:bg-blue-50 transition"
                                >
                                    <item.icon />
                                    <span className="text-xs font-bold text-gray-700 mt-1 text-center leading-tight">{item.name}</span>
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="pt-6 border-t border-gray-200 space-y-3">
                        {user ? (
                            <>
                                <Link href="/Addpet" onClick={() => setMobileMenuOpen(false)} className="flex items-center justify-center w-full py-3.5 rounded-xl bg-[#333333] text-white font-bold shadow-lg">
                                    + Register Pet
                                </Link>
                                <button onClick={handleLogout} className="w-full py-3 rounded-xl text-red-500 font-bold hover:bg-red-50 transition">
                                    Sign Out
                                </button>
                            </>
                        ) : (
                            <div className="grid grid-cols-2 gap-3">
                                <Link href="/Login" className="py-3 rounded-xl bg-gray-100 text-gray-700 font-bold text-center">Login</Link>
                                <Link href="/Signup" className="py-3 rounded-xl bg-[#4A90E2] text-white font-bold text-center shadow-lg">Sign Up</Link>
                            </div>
                        )}
                    </div>
                </div>

            </Dialog.Panel>
        </Dialog>
      </header>
    </>
  );
}
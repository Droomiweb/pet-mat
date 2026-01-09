// app/nav.jsx
"use client";
import { useState, useEffect, Fragment } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "./auth-provider";
import { auth, db } from "./lib/firebase";
import { useRouter, usePathname } from "next/navigation";
import { Dialog, Menu, Transition } from "@headlessui/react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { motion } from "framer-motion"; // --- IMPORT ANIMATION LIBRARY ---

// --- ICONS ---
const MenuIcon = (props) => (<svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12" /><line x1="4" x2="20" y1="6" y2="6" /><line x1="4" x2="20" y1="18" y2="18" /></svg>);
const XIcon = (props) => (<svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>);
const ChevronDownIcon = (props) => (<svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>);
const BellIcon = (props) => (<svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.37 21a2 2 0 0 0 3.26 0" /></svg>);
const MessageIcon = (props) => (<svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>);

// --- SUBMENU ICONS ---
const VetIcon = () => <span className="text-lg">🏥</span>;
const AdoptionIcon = () => <span className="text-lg">🏠</span>;
const HeartIcon = () => <span className="text-lg">❤️</span>;

export default function Navbar({ reminderCount = 0 }) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [pregnantPetId, setPregnantPetId] = useState(null);
    const [showNoPregnancyModal, setShowNoPregnancyModal] = useState(false);
    const [realtimeUnreadCount, setRealtimeUnreadCount] = useState(0);
    const [hasLostPets, setHasLostPets] = useState(false);

    // --- NEW: Track hover state for sliding animation ---
    const [hoveredPath, setHoveredPath] = useState(null);

    const { user, userData } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    // --- NEW: Check for lost pets globally ---
    useEffect(() => {
        const checkLostPets = async () => {
            try {
                const res = await fetch("/api/pet?isLost=true");
                if (res.ok) {
                    const data = await res.json();
                    setHasLostPets(data.length > 0);
                }
            } catch (e) {
                console.error(e);
            }
        };
        checkLostPets();
        const interval = setInterval(checkLostPets, 300000);
        return () => clearInterval(interval);
    }, []);

    // --- SCROLL EFFECT ---
    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 10);
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    // --- REALTIME UNREAD MESSAGES ---
    useEffect(() => {
        if (!user) {
            setRealtimeUnreadCount(0);
            return;
        }
        const q = query(
            collection(db, "conversations"),
            where("participants", "array-contains", user.uid)
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            let totalUnread = 0;
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                if (data.unreadCounts && typeof data.unreadCounts[user.uid] === 'number') {
                    totalUnread += data.unreadCounts[user.uid];
                }
            });
            setRealtimeUnreadCount(totalUnread);
        }, (error) => console.error(error));
        return () => unsubscribe();
    }, [user]);

    // --- CHECK PREGNANCY ---
    useEffect(() => {
        if (user) {
            const checkPregnancy = async () => {
                try {
                    const timestamp = new Date().getTime();
                    const res = await fetch(`/api/pet/user/${user.uid}?t=${timestamp}`);
                    if (res.ok) {
                        const pets = await res.json();
                        const pregnant = pets.find(p => p.isPregnant);
                        setPregnantPetId(pregnant ? pregnant._id : null);
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
        if (pregnantPetId) router.push(`/pregnancy-tracker/${pregnantPetId}`);
        else setShowNoPregnancyModal(true);
    };

    const mainNavItems = [
        { name: "Home", href: "/" },
        { name: "Community", href: "/community" },
        { name: "Dr. Paws AI", href: "/AiDoc" },
        { name: "Marketplace", href: "/marketplace" },
    ];

    const subMenuItems = [
        { name: "Adoption Center", href: "/adoption", icon: AdoptionIcon, desc: "Find a new friend" },
        { name: "Vet Locator", href: "/vet-locator", icon: VetIcon, desc: "Clinics nearby" },
    ];

    const isActive = (href) => pathname === href;
    const getBadgeText = (count) => (count > 99 ? '99+' : count);
    const profileImageSrc = userData?.avatar || user?.photoURL || "/imgs/profile.jpg";

    return (
        <>
            {/* --- NO PREGNANCY MODAL --- */}
            {showNoPregnancyModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center animate-in zoom-in duration-200">
                        <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">🤰</div>
                        <h3 className="text-2xl font-bold text-gray-800 mb-2">Pregnancy Tracker</h3>
                        <p className="text-gray-600 mb-6">This feature tracks day-by-day gestation for pets confirmed as pregnant. Activate it in your Profile.</p>
                        <div className="flex gap-2 justify-center">
                            <button onClick={() => setShowNoPregnancyModal(false)} className="px-6 py-2 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition">Close</button>
                            <Link href="/Profile" className="px-6 py-2 rounded-xl font-bold text-white bg-[#4A90E2] hover:bg-[#3A75B9] transition shadow-lg">Go to Profile</Link>
                        </div>
                    </div>
                </div>
            )}

            {/* --- NAVBAR --- */}
            <header
                className={`fixed w-full z-50 transition-all duration-300 ${hasLostPets ? 'top-12' : 'top-0'} ${scrolled
                    ? "bg-white/80 backdrop-blur-xl shadow-md border-b border-white/20 h-16"
                    : "bg-white/60 backdrop-blur-md border-b border-white/10 h-20"
                    }`}
            >
                <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">

                    {/* 1. LOGO */}
                    <div className="flex items-center gap-4">
                        <button className="lg:hidden text-gray-600 hover:text-[#4A90E2] p-1 rounded-lg" onClick={() => setMobileMenuOpen(true)}>
                            <MenuIcon className="w-7 h-7" />
                        </button>
                        <Link href="/" className="flex items-center gap-2 group">
                            <div className="relative w-9 h-9 transition-transform duration-300 group-hover:scale-110">
                                <Image src="/icon.svg" alt="PetLink Logo" fill sizes="40px" className="object-contain drop-shadow-sm" />
                            </div>
                            <span className="text-2xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-[#4A90E2] to-[#50E3C2] hidden sm:block">
                                PetLink
                            </span>
                        </Link>
                    </div>

                    {/* 2. DESKTOP MENU (SLIDING ANIMATION) */}
                    <div className="hidden lg:flex items-center gap-1 bg-white/50 rounded-full px-2 py-1 border border-gray-100 shadow-sm backdrop-blur-sm relative" onMouseLeave={() => setHoveredPath(null)}>

                        {mainNavItems.map(item => {
                            // Determine if this item should show the highlight
                            // It shows if: (It's hovered) OR (It's active AND nothing else is hovered)
                            const isHovered = hoveredPath === item.href;
                            const isCurrent = isActive(item.href);
                            const showHighlight = isHovered || (isCurrent && hoveredPath === null);

                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    onMouseEnter={() => setHoveredPath(item.href)}
                                    className="relative px-5 py-2 rounded-full text-sm font-bold transition-colors duration-300 z-10"
                                >
                                    {/* The Sliding Pill */}
                                    {showHighlight && (
                                        <motion.span
                                            layoutId="nav-pill"
                                            className="absolute inset-0 bg-gradient-to-r from-[#4A90E2] to-[#50E3C2] rounded-full -z-10 shadow-md"
                                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                        />
                                    )}

                                    {/* Text Color Logic */}
                                    <span className={`relative z-20 transition-colors duration-200 ${showHighlight ? "text-white" : "text-gray-600 group-hover:text-[#4A90E2]"}`}>
                                        {item.name}
                                    </span>
                                </Link>
                            );
                        })}

                        {/* Dropdown (Separate from sliding pill for simplicity, or can be added similarly) */}
                        <Menu as="div" className="relative ml-1">
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
                                    <Menu.Item>
                                        {({ active }) => (
                                            <button onClick={handlePregnancyClick} className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-left ${active ? 'bg-pink-50' : ''}`}>
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
                                <Link href="/Addpet" className="hidden md:flex items-center gap-2 bg-[#333333] text-white px-5 py-2.5 rounded-full font-bold text-sm shadow-lg hover:bg-black hover:scale-105 transition-all">
                                    <span>+</span> Add Pet
                                </Link>

                                <Link href="/reminders" className="relative p-2.5 rounded-full bg-gray-100 hover:bg-blue-50 text-gray-600 hover:text-[#4A90E2] transition-colors group">
                                    <BellIcon className="w-6 h-6" />
                                    {reminderCount > 0 && <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white">{getBadgeText(reminderCount)}</span>}
                                </Link>

                                <Link href="/messages" className="relative p-2.5 rounded-full bg-gray-100 hover:bg-blue-50 text-gray-600 hover:text-[#4A90E2] transition-colors group">
                                    <MessageIcon className="w-6 h-6" />
                                    {realtimeUnreadCount > 0 && <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-green-500 text-[10px] font-bold text-white ring-2 ring-white">{getBadgeText(realtimeUnreadCount)}</span>}
                                </Link>

                                <Link href="/Profile" className="relative w-10 h-10 rounded-full border-2 border-white shadow-md hover:ring-2 hover:ring-[#4A90E2] transition-all ml-1 overflow-hidden bg-gray-200">
                                    <Image src={profileImageSrc} alt="Profile" fill className="object-cover" />
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

                {/* --- MOBILE MENU (UNCHANGED) --- */}
                <Transition.Root show={mobileMenuOpen} as={Fragment}>
                    <Dialog as="div" className="relative z-50 lg:hidden" onClose={setMobileMenuOpen}>
                        <Transition.Child
                            as={Fragment}
                            enter="transition-opacity ease-linear duration-300"
                            enterFrom="opacity-0"
                            enterTo="opacity-100"
                            leave="transition-opacity ease-linear duration-300"
                            leaveFrom="opacity-100"
                            leaveTo="opacity-0"
                        >
                            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
                        </Transition.Child>

                        <div className="fixed inset-0 flex">
                            <Transition.Child
                                as={Fragment}
                                enter="transition ease-in-out duration-300 transform"
                                enterFrom="-translate-x-full"
                                enterTo="translate-x-0"
                                leave="transition ease-in-out duration-300 transform"
                                leaveFrom="translate-x-0"
                                leaveTo="-translate-x-full"
                            >
                                <Dialog.Panel className="relative mr-16 flex w-full max-w-xs flex-1 flex-col bg-white/95 backdrop-blur-xl shadow-2xl h-full">
                                    <div className="flex items-center justify-between px-6 py-6 border-b border-gray-100">
                                        <div className="flex items-center gap-2">
                                            <div className="relative w-8 h-8"><Image src="/icon.svg" alt="PetLink" fill className="object-contain" /></div>
                                            <span className="text-xl font-extrabold text-gray-800 tracking-tight">PetLink</span>
                                        </div>
                                        <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"><XIcon className="w-6 h-6" /></button>
                                    </div>
                                    <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
                                        <div>
                                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Menu</p>
                                            <div className="space-y-1">
                                                {mainNavItems.map((item) => (
                                                    <Link key={item.name} href={item.href} onClick={() => setMobileMenuOpen(false)} className={`block px-4 py-3 rounded-xl font-bold text-lg transition-all ${isActive(item.href) ? 'bg-blue-50 text-[#4A90E2]' : 'text-gray-600 hover:bg-gray-50'}`}>{item.name}</Link>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Explore</p>
                                            <div className="grid grid-cols-2 gap-3">
                                                <button onClick={handlePregnancyClick} className="flex flex-col items-center justify-center p-4 bg-pink-50 rounded-2xl hover:bg-pink-100 transition active:scale-95"><span className="text-2xl mb-1">❤️</span><span className="text-xs font-bold text-pink-600">Pregnancy</span></button>
                                                {subMenuItems.map(item => (
                                                    <Link key={item.name} href={item.href} onClick={() => setMobileMenuOpen(false)} className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-2xl hover:bg-blue-50 transition active:scale-95"><item.icon /><span className="text-xs font-bold text-gray-700 mt-1 text-center leading-tight">{item.name}</span></Link>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-6 border-t border-gray-200 bg-gray-50/50">
                                        {user ? (
                                            <div className="space-y-3">
                                                <Link href="/Addpet" onClick={() => setMobileMenuOpen(false)} className="flex items-center justify-center w-full py-3.5 rounded-xl bg-[#333333] text-white font-bold shadow-lg hover:bg-black transition-all">+ Register New Pet</Link>
                                                <button onClick={handleLogout} className="w-full py-3 rounded-xl text-red-500 font-bold hover:bg-red-50 transition-colors">Sign Out</button>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-2 gap-3">
                                                <Link href="/Login" onClick={() => setMobileMenuOpen(false)} className="py-3 rounded-xl bg-white border border-gray-200 text-gray-700 font-bold text-center hover:bg-gray-50">Login</Link>
                                                <Link href="/Signup" onClick={() => setMobileMenuOpen(false)} className="py-3 rounded-xl bg-[#4A90E2] text-white font-bold text-center shadow-lg hover:bg-[#3A75B9]">Sign Up</Link>
                                            </div>
                                        )}
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </Dialog>
                </Transition.Root>
            </header>
        </>
    );
}
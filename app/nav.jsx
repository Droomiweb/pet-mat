// app/nav.jsx
"use client";
import { useState, Fragment } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "./auth-provider";
import { auth } from "./lib/firebase";
import { useRouter, usePathname } from "next/navigation";
import { Menu, Transition } from "@headlessui/react";

// --- icons (unchanged) ---
const ProfileIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width={props.size || "24"} height={props.size || "24"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);
const ListIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width={props.size || "24"} height={props.size || "24"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" x2="21" y1="12" y2="12"/><line x1="3" x2="21" y1="6" y2="6"/><line x1="3" x2="21" y1="18" y2="18"/>
  </svg>
);
const MessageIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width={props.size || "24"} height={props.size || "24"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);
const VetMapIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
    <path d="M12 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
    <path d="M10 9h4" /><path d="M12 7v4" /> {/* Cross symbol inside pin */}
  </svg>
);
const ChevronDownIcon = (props) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>);
const CommunityIcon = (props) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 20h5v-2a3 3 0 00-5.356-2.37M11 20H2v-2a3 3 0 015.356-2.37M14 7a4 4 0 10-8 0 4 4 0 008 0z"/></svg>);
const AIIcon = (props) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>);
const PredictIcon = (props) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21 16-4-4-4 4"/><path d="m17 20-4-4-4 4"/><path d="m21 8-4-4-4 4"/><path d="m17 12-4-4-4 4"/><path d="M12 22v-8"/><path d="M12 10V3"/><path d="m3 16 4-4 4 4"/><path d="m7 20 4-4 4 4"/><path d="m3 8 4-4 4 4"/><path d="m7 12 4-4 4 4"/></svg>);
const SupportIcon = (props) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>);
const ReminderIcon = (props) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.37 21a2 2 0 0 0 3.26 0"/></svg>);


export default function Navbar({ unreadMessageCount = 0, reminderCount = 0 }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    await auth.signOut();
    router.push("/Login");
  };

  // --- NEW HELPER: Get badge display text ---
  const getBadgeText = (count) => {
    if (count > 9) {
      return '9+';
    }
    return count;
  };
  // --- END NEW HELPER ---

  // links
  const mainNavItems = [
    { name: "Home", href: "/" },
    { name: "Adoption", href: "/adoption" },
    { name: "Marketplace", href: "/marketplace" },
  ];
const featuresNavItems = [
    { name: "Community Hub", href: "/community", icon: CommunityIcon },
    { name: "Dr. Paws AI", href: "/AiDoc", icon: AIIcon },
    { name: "AI Predictor", href: "/AiPredict", icon: PredictIcon },
    { name: "Pregnancy Support", href: "/pregnancy-support", icon: SupportIcon },
    { name: "Vet Locator", href: "/vet-locator", icon: VetMapIcon }, // <--- ADDED THIS
    { name: `Reminders (${reminderCount})`, href: "/reminders", icon: ReminderIcon },
  ];
const allMobileNavItems = [
    { name: "Home", href: "/" },
    { name: "Adoption", href: "/adoption" },
    { name: "Community", href: "/community" },
    { name: "Marketplace", href: "/marketplace" },
    { name: "Dr. Paws AI", href: "/AiDoc" },
    { name: "Vet Locator", href: "/vet-locator" }, // <--- ADDED THIS
    { name: "Pregnancy Support", href: "/pregnancy-support" },
    { name: "AI Predictor", href: "/AiPredict" },
    { name: `Reminders (${reminderCount})`, href: "/reminders" },
    { name: "Add New Pet", href: "/Addpet", isButton: true },
    { name: "Logout", onClick: handleLogout, isButton: true },
  ];
  // helpers for active route (handles exact and section matches)
  const isActive = (href) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  };

  // shared classes for nicer hover + active
  const baseLink =
    "relative px-4 py-2 rounded-lg font-semibold transition-all duration-300 ease-out";
  const hoverLink =
    "hover:bg-white/15 hover:shadow-[0_6px_20px_-10px_rgba(0,0,0,0.5)]";
  const inactiveText = "text-white";
  const activeWrap =
    "bg-white text-primary shadow-[0_8px_24px_-12px_rgba(0,0,0,0.5)]";
  const underline =
    "pointer-events-none absolute left-3 right-3 -bottom-1 h-[2px] rounded-full bg-white/70 scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-300";
  const activeUnderline =
    "pointer-events-none absolute left-3 right-3 -bottom-1 h-[2px] rounded-full bg-white/90 scale-x-100";

  return (
    <nav className="bg-primary shadow-xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 flex justify-between items-center py-3">

        {/* LEFT */}
        <div className="flex items-center space-x-4">
          <button
            className="sm:hidden focus:outline-none p-1 rounded-full text-white hover:bg-white/15 transition-colors duration-300"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <ListIcon size={28} />
          </button>

          <Link href="/Profile" className="hidden sm:block">
            <div className="flex items-center space-x-2 cursor-pointer p-1 rounded-full hover:bg-white/10 transition-colors duration-300">
              <ProfileIcon
                size={30}
                className="rounded-full bg-white text-[#4A90E2] border-2 border-[#50E3C2] p-0.5"
              />
              <span className="text-white font-semibold hidden md:inline">
                {user?.email.split("@")[0] || "Profile"}
              </span>
            </div>
          </Link>

          <h1 className="text-white font-extrabold text-2xl tracking-wider hidden sm:block">
            PetLink
          </h1>
        </div>

        {/* DESKTOP NAV (Omitted for brevity - unchanged except for prop usage) */}
        <div className="hidden sm:flex items-center space-x-3">
            {/* ... main links and features dropdown ... */}
            {mainNavItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group ${baseLink} ${hoverLink} ${
                    active ? activeWrap : inactiveText
                  }`}
                >
                  <span className="relative z-10">{item.name}</span>
                  <span className={active ? activeUnderline : underline} />
                </Link>
              );
            })}

            <Menu as="div" className="relative">
            {({ open }) => (
              <>
                <Menu.Button
                  className={`group ${baseLink} ${hoverLink} ${
                    isActive("/community") ||
                    isActive("/AiDoc") ||
                    isActive("/AiPredict") ||
                    isActive("/pregnancy-support") ||
                    isActive("/reminders")
                      ? activeWrap
                      : inactiveText
                  } flex items-center gap-1`}
                >
                  <span className="relative z-10">Tools &amp; Support</span>
                  <ChevronDownIcon className="w-5 h-5" />
                  <span
                    className={`${
                      open ||
                      isActive("/community") ||
                      isActive("/AiDoc") ||
                      isActive("/AiPredict") ||
                      isActive("/pregnancy-support") ||
                      isActive("/reminders")
                        ? activeUnderline
                        : underline
                    }`}
                  />
                </Menu.Button>

                <Transition
                  as={Fragment}
                  enter="transition ease-out duration-100"
                  enterFrom="transform opacity-0 scale-95"
                  enterTo="transform opacity-100 scale-100"
                  leave="transition ease-in duration-75"
                  leaveFrom="transform opacity-100 scale-100"
                  leaveTo="transform opacity-0 scale-95"
                >
                  <Menu.Items className="absolute right-0 mt-2 w-64 origin-top-right bg-white rounded-md shadow-lg z-10 ring-1 ring-black/5 focus:outline-none">
                    <div className="py-1">
                      {featuresNavItems.map((item) => (
                        <Menu.Item key={item.name}>
                          {({ active }) => (
                            <Link
                              href={item.href}
                              className={`${
                                active ? "bg-gray-100 text-primary" : "text-primary"
                              } group flex w-full items-center rounded-md px-4 py-3 text-sm font-semibold`}
                            >
                              <item.icon className="w-5 h-5 mr-3 text-[#4A90E2]" />
                              {item.name}
                            </Link>
                          )}
                        </Menu.Item>
                      ))}
                    </div>
                  </Menu.Items>
                </Transition>
              </>
            )}
          </Menu>

          <button
            onClick={() => router.push("/Addpet")}
            className="bg-secondary text-primary px-5 py-2 rounded-full font-bold shadow-md hover:shadow-xl hover:scale-105 transition-all duration-300 ml-4"
          >
            + New Pet
          </button>
          <button
            onClick={handleLogout}
            className="bg-red-500 text-white px-5 py-2 rounded-full font-bold shadow-md hover:shadow-xl hover:scale-105 transition-all duration-300"
          >
            Logout
          </button>
        </div>

        {/* RIGHT: messages and reminders section */}
        <div className="flex items-center gap-4">
            {/* Reminder Icon (Unchanged) */}
            {user && (
            <Link href="/reminders" className="relative p-2 rounded-full text-white hover:bg-white/10 transition-colors duration-300">
                <ReminderIcon size={28} />
                {reminderCount > 0 && (
                <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full transition-all duration-300">
                    {getBadgeText(reminderCount)}
                </span>
                )}
            </Link>
            )}

            {/* Message Icon (UPDATED) */}
            <Link href="/messages" className="relative p-2 rounded-full text-white hover:bg-white/10 transition-colors duration-300">
                <MessageIcon size={28} />
                {unreadMessageCount > 0 && (
                <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full transition-all duration-300">
                    {getBadgeText(unreadMessageCount)} {/* <-- USE NEW HELPER HERE */}
                </span>
                )}
            </Link>
        </div>
      </div>

      {/* MOBILE MENU (Omitted for brevity) */}
      <div className={`fixed top-0 left-0 h-full w-64 bg-white shadow-2xl transition-transform duration-300 z-50 sm:hidden ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="p-5 bg-primary/90 text-white flex flex-col items-start pt-10">
          <Link href="/Profile" onClick={() => setMenuOpen(false)}>
            <ProfileIcon size={48} className="rounded-full bg-white text-[#4A90E2] border-2 border-[#50E3C2] p-1 mb-2" />
          </Link>
          <p className="text-xl font-bold">{user?.email.split("@")[0] || "Guest"}</p>
          <p className="text-sm opacity-80">View Profile</p>
        </div>

        <div className="flex flex-col p-4 space-y-2">
          {allMobileNavItems.map((item) => (
            <div key={item.name}>
              {item.href ? (
                <Link
                  href={item.href}
                  className={`block px-4 py-2 rounded-lg text-primary font-semibold hover:bg-gray-100 transition-colors duration-300 ${item.isButton ? "mt-4 border-t pt-4 text-accent" : ""}`}
                  onClick={() => setMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ) : (
                <button
                  onClick={() => {
                    item.onClick();
                    setMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 rounded-lg text-red-500 font-semibold hover:bg-red-50 transition-colors duration-300"
                >
                  {item.name}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {menuOpen && <div className="fixed inset-0 bg-black/50 z-40 sm:hidden" onClick={() => setMenuOpen(false)} />}
    </nav>
  );
}
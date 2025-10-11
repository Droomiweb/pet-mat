// app/navbarrWrapper.js
"use client";

import { usePathname } from "next/navigation";
import Navbarr from "./nav";

export default function NavbarrWrapper() {
  const pathname = usePathname();
  if (pathname === "/Login" || pathname === "/Signup") return null;
  return <Navbarr />;
}

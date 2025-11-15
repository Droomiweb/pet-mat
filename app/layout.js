// app/layout.js
import NavbarrWrapper from "./navbarrWraper";
import { Poppins } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./auth-provider";
import MaintenancePage from "./Maintenance";
import { SpeedInsights } from "@vercel/speed-insights/next";

// --- FIX: Import DB connection and models directly ---
import connectDB from "./lib/mongodb";
import SystemSettings from "./models/SystemSettings";
// --- END FIX ---

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata = {
  title: "PET MATRIMONY",
  description: "MATRIMONY FOR OUR PETS",
};

// --- FIX: Create a function to get status directly from DB ---
// (This logic is copied from your /api/maintenance/route.js)
const SYSTEM_SETTINGS_ID = 'website_settings';
async function getMaintenanceStatus() {
  try {
    await connectDB();
    const settings = await SystemSettings.findById(SYSTEM_SETTINGS_ID);
    // Return the status, defaulting to false if not found
    return settings?.isMaintenanceMode || false;
  } catch (err) {
    console.error("Failed to check maintenance status:", err);
    // Default to false (not in maintenance) if DB check fails
    return false;
  }
}
// --- END FIX ---

export default async function RootLayout({ children }) {
  
  // --- FIX: Call the direct function instead of fetch ---
  const isMaintenanceMode = await getMaintenanceStatus();
  // --- END FIX ---

  /* --- OLD CODE (REMOVED) ---
  // Dynamically set the base URL based on the environment
  const baseURL = process.env.NODE_ENV === 'development'
    ? 'http://localhost:3000'
    : process.env.NEXT_PUBLIC_BASE_URL;

  let isMaintenanceMode = false;
  try {
    // This fetch is what causes the DYNAMIC_SERVER_USAGE error
    const res = await fetch(`${baseURL}/api/maintenance`, {
      cache: 'no-store'
    });
    if (res.ok) {
      const data = await res.json();
      isMaintenanceMode = data.isMaintenanceMode;
    }
  } catch (err) {
    console.error("Failed to check maintenance status:", err);
  }
  --- END OLD CODE --- */

  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className={poppins.className}>
        <AuthProvider>
          {isMaintenanceMode ? (
            <MaintenancePage />
          ) : (
            <>
              <NavbarrWrapper />
                {children}
              <SpeedInsights/>
            </>
          )}
        </AuthProvider>
      </body>
    </html>
  );
}
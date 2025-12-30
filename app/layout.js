import NavbarrWrapper from "./navbarrWraper";
import { Poppins } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./auth-provider";
import connectDB from "./lib/mongodb";
import SystemSettings from "./models/SystemSettings";
import { Analytics } from "@vercel/analytics/next"
import { unstable_cache } from "next/cache"; // Import cache utility

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata = {
  title: "PET MATRIMONY",
  description: "MATRIMONY FOR OUR PETS",
};

// REMOVE: export const revalidate = 0; 
// We don't want to force the whole page to be dynamic, just the check.

const SYSTEM_SETTINGS_ID = 'website_settings';

// Wrapped in unstable_cache to cache the result for 60 seconds
const getCachedMaintenanceStatus = unstable_cache(
  async () => {
    try {
      await connectDB();
      // Lean query for performance
      const settings = await SystemSettings.findById(SYSTEM_SETTINGS_ID).select('isMaintenanceMode').lean();
      return settings?.isMaintenanceMode || false;
    } catch (err) {
      console.error("Failed to check maintenance status:", err);
      return false;
    }
  },
  ['maintenance-status'], // Cache key
  { revalidate: 60, tags: ['settings'] } // Revalidate every 60 seconds
);

export default async function RootLayout({ children }) {
  const isMaintenanceMode = await getCachedMaintenanceStatus();

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={poppins.className}>
        <AuthProvider>
          <NavbarrWrapper isMaintenanceMode={isMaintenanceMode}>
            {children}
          </NavbarrWrapper>
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
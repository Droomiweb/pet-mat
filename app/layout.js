// app/layout.js
import NavbarrWrapper from "./navbarrWraper";
import { Poppins } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./auth-provider";
import connectDB from "./lib/mongodb";
import SystemSettings from "./models/SystemSettings";
import { Analytics } from "@vercel/analytics/next"
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata = {
  title: "PET MATRIMONY",
  description: "MATRIMONY FOR OUR PETS",
};

// Force dynamic rendering so maintenance status is always fresh
export const revalidate = 0; 

const SYSTEM_SETTINGS_ID = 'website_settings';

async function getMaintenanceStatus() {
  try {
    await connectDB();
    const settings = await SystemSettings.findById(SYSTEM_SETTINGS_ID);
    return settings?.isMaintenanceMode || false;
  } catch (err) {
    console.error("Failed to check maintenance status:", err);
    return false;
  }
}

export default async function RootLayout({ children }) {
  const isMaintenanceMode = await getMaintenanceStatus();

  return (
    <html lang="en">
      {/* Head tag removed so Next.js automatically uses app/icon.svg */}
      <body className={poppins.className}>
        <AuthProvider>
          {/* Pass status to the wrapper instead of blocking here */}
          <NavbarrWrapper isMaintenanceMode={isMaintenanceMode}>
              {children}
          </NavbarrWrapper>
        </AuthProvider>
        <Analytics/>
      </body>
    </html>
  );
}
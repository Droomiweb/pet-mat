// app/layout.js
import NavbarrWrapper from "./navbarrWraper";
import { Poppins } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./auth-provider";
import MaintenancePage from "./Maintenance";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata = {
  title: "PET MATRIMONY",
  description: "MATRIMONY FOR OUR PETS",
};

export default async function RootLayout({ children }) {
  // Dynamically set the base URL based on the environment
  const baseURL = process.env.NODE_ENV === 'development'
    ? 'http://localhost:3000'
    : process.env.NEXT_PUBLIC_BASE_URL;

  let isMaintenanceMode = false;
  try {
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
            </>
          )}
        </AuthProvider>
      </body>
    </html>
  );
}
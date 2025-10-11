// app/layout.js
import NavbarrWrapper from "./navbarrWraper";
import { Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata = {
  title: "PET MATRIMONY",
  description: "MATRIMONY FOR OUR PETS",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
  <link rel="icon" href="/favicon.ico" />
</head>

      <body className={poppins.className}>
        <NavbarrWrapper />
        {children}
      </body>
    </html>
  );
}

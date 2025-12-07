// app/components/DownloadCertificate.js

// 1. DIRECTIVE
// "use client" is required because we access the browser's window/download capabilities.
"use client";

// 2. IMPORTS
import { useState } from "react";
import jsPDF from "jspdf"; // The library that draws the PDF

// 3. COMPONENT DEFINITION
export default function DownloadCertificate({ pet }) {
  const [loading, setLoading] = useState(false);

  // Safety check: Don't render button if the pet hasn't been officially adopted yet
  if (!pet?.adoptionLog) return null;

  // 4. PDF GENERATION LOGIC
  const generatePDF = () => {
    setLoading(true);

    // Initialize PDF Document
    // Orientation: Landscape (wide)
    // Unit: Millimeters (standard for print)
    // Format: A4 Paper
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4"
    });

    // Extract data for easy access
    const log = pet.adoptionLog;
    // Format date nicely (e.g., "October 5, 2023")
    const dateStr = new Date(log.adoptionDate).toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' });

    // --- A. BORDERS & DECORATION ---
    // Outer Blue Border
    doc.setLineWidth(2); // Thickness
    doc.setDrawColor(74, 144, 226); // Color: #4A90E2 (Blue)
    doc.rect(10, 10, 277, 190); // Draw Rectangle (x, y, width, height)
    
    // Inner Teal Border
    doc.setLineWidth(1);
    doc.setDrawColor(80, 227, 194); // Color: #50E3C2 (Teal)
    doc.rect(15, 15, 267, 180); 

    // --- B. HEADER TEXT ---
    // Main Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(40);
    doc.setTextColor(74, 144, 226); // Brand Blue
    // text(String, x, y, options)
    // x=148.5 is exactly the horizontal center of A4 Landscape
    doc.text("CERTIFICATE OF ADOPTION", 148.5, 45, { align: "center" });

    // Subtitle
    doc.setFont("helvetica", "normal");
    doc.setFontSize(16);
    doc.setTextColor(100, 100, 100); // Grey
    doc.text("This certifies that the pet known as", 148.5, 65, { align: "center" });

    // --- C. PET DETAILS ---
    // Pet Name (Large & Fancy)
    doc.setFont("times", "italic"); 
    doc.setFontSize(36);
    doc.setTextColor(51, 51, 51); // Dark Grey
    doc.text(pet.name, 148.5, 85, { align: "center" });

    // Breed & Gender
    doc.setFont("helvetica", "normal");
    doc.setFontSize(14);
    doc.setTextColor(80, 80, 80);
    const details = `(Breed: ${pet.breed} | Gender: ${pet.gender})`;
    doc.text(details, 148.5, 95, { align: "center" });

    // --- D. NEW OWNER SECTION ---
    doc.setFontSize(16);
    doc.text("Has been officially adopted and welcomed into the loving home of", 148.5, 115, { align: "center" });

    // New Owner Name
    doc.setFont("times", "bold");
    doc.setFontSize(28);
    doc.setTextColor(51, 51, 51);
    doc.text(log.newOwnerName || "New Owner", 148.5, 130, { align: "center" });

    // Previous Owner (Small text)
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor(120, 120, 120);
    doc.text(`Transferred from: ${log.previousOwnerName || "Previous Owner"}`, 148.5, 145, { align: "center" });

    // --- E. SIGNATURES & DATES ---
    // Draw Lines for signatures
    doc.setDrawColor(150, 150, 150);
    doc.line(60, 170, 120, 170); // Left Line (x1, y1, x2, y2)
    doc.line(180, 170, 240, 170); // Right Line

    // Text on top of lines
    doc.setFontSize(12);
    doc.text(dateStr, 90, 177, { align: "center" }); // The Date
    doc.text("PetLink Official", 210, 177, { align: "center" }); // The "Official" signature

    // Labels below lines
    doc.setFontSize(10);
    doc.text("Date", 90, 185, { align: "center" });
    doc.text("Authorized Signature", 210, 185, { align: "center" });

    // --- F. FOOTER (Metadata) ---
    doc.setFontSize(9);
    doc.setTextColor(180, 180, 180); // Very light grey
    // Print unique Certificate ID at bottom right for verification
    doc.text(`Certificate ID: ${log.certificateId || "N/A"}`, 280, 195, { align: "right" });

    // --- G. SAVE FILE ---
    doc.save(`${pet.name}_Adoption_Certificate.pdf`);
    setLoading(false);
  };

  // 5. RENDER BUTTON
  return (
    <button
      onClick={generatePDF}
      disabled={loading}
      className="w-full bg-gradient-to-r from-[#4A90E2] to-[#50E3C2] hover:from-[#3A75B9] hover:to-[#3FCCB4] text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all transform hover:scale-105 flex items-center justify-center gap-2"
    >
      {loading ? (
        // Simple loading text
        <span>Generating...</span>
      ) : (
        // Button Content with Icon
        <>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Download Adoption Certificate
        </>
      )}
    </button>
  );
}
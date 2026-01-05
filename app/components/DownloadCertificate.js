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
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4"
    });

    // Extract data for easy access
    const log = pet.adoptionLog;
    const dateStr = new Date(log.adoptionDate).toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const centerX = pageWidth / 2;

    // --- A. BACKGROUND & BORDERS ---
    // 1. Heavy Outer Boarder (Navy Blue)
    doc.setDrawColor(20, 30, 60); // #141E3C
    doc.setLineWidth(3);
    doc.rect(5, 5, pageWidth - 10, pageHeight - 10);

    // 2. Gold Inner Border
    doc.setDrawColor(218, 165, 32); // #DAA520 (Goldenrod)
    doc.setLineWidth(1);
    doc.rect(8, 8, pageWidth - 16, pageHeight - 16);

    // 3. Decorative Corner Accents (Triangles)
    doc.setFillColor(20, 30, 60);
    // Top-Left
    doc.triangle(5, 5, 25, 5, 5, 25, "F");
    // Top-Right
    doc.triangle(pageWidth - 5, 5, pageWidth - 25, 5, pageWidth - 5, 25, "F");
    // Bottom-Left
    doc.triangle(5, pageHeight - 5, 25, pageHeight - 5, 5, pageHeight - 25, "F");
    // Bottom-Right
    doc.triangle(pageWidth - 5, pageHeight - 5, pageWidth - 25, pageHeight - 5, pageWidth - 5, pageHeight - 25, "F");

    // --- B. HEADER ---
    doc.setFont("times", "normal");
    doc.setFontSize(18);
    doc.setTextColor(80, 80, 80);
    doc.text("OFFICIAL REGISTRY OF PET MATRIMONY", centerX, 30, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(42);
    doc.setTextColor(20, 30, 60); // Navy
    doc.text("CERTIFICATE OF ADOPTION", centerX, 50, { align: "center", charSpace: 1.5 });

    // Decorative Line under title
    doc.setDrawColor(218, 165, 32); // Gold
    doc.setLineWidth(0.5);
    doc.line(centerX - 50, 55, centerX + 50, 55);

    // --- C. MAIN CONTENT ---
    doc.setFont("times", "italic");
    doc.setFontSize(22);
    doc.setTextColor(50, 50, 50);
    doc.text("This certifies that the beloved", centerX, 75, { align: "center" });

    // Pet Name
    doc.setFont("times", "bolditalic");
    doc.setFontSize(48);
    doc.setTextColor(20, 30, 60);
    doc.text(pet.name, centerX, 95, { align: "center" });

    // Pet Details
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(`${pet.breed}  •  ${pet.gender}  •  Born: ${pet.age} Years Ago`, centerX, 105, { align: "center" });

    // "Has been adopted by"
    doc.setFont("times", "italic");
    doc.setFontSize(22);
    doc.setTextColor(50, 50, 50);
    doc.text("Has been officially adopted into the loving home of", centerX, 125, { align: "center" });

    // New Owner Name
    doc.setFont("times", "bold");
    doc.setFontSize(32);
    doc.setTextColor(20, 30, 60);
    doc.text(log.newOwnerName || "Proud Owner", centerX, 140, { align: "center" });

    // --- D. SIGNATURES ---
    const sigY = 175;
    
    // Left Sig
    doc.setDrawColor(50, 50, 50);
    doc.setLineWidth(0.5);
    doc.line(50, sigY, 110, sigY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Date", 80, sigY + 5, { align: "center" });
    doc.setFont("times", "bold");
    doc.setFontSize(14);
    doc.text(dateStr, 80, sigY - 2, { align: "center" });

    // Right Sig
    doc.line(190, sigY, 250, sigY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Authorized Signature", 220, sigY + 5, { align: "center" });
    
    // Fake "Signature" using script-like font (italic times for now)
    doc.setFont("times", "italic");
    doc.setFontSize(18);
    doc.setTextColor(20, 30, 60);
    doc.text("PetMatrimony Official", 220, sigY - 2, { align: "center" });

    // --- E. GOLD SEAL (Simulated) ---
    const sealX = 250;
    const sealY = 130;
    const radius = 20;

    // Draw "Gold" Circle with varying stroke to look like a seal
    doc.setFillColor(218, 165, 32); 
    doc.circle(sealX, sealY, radius, "F");
    
    doc.setDrawColor(184, 134, 11); // Darker Gold border
    doc.setLineWidth(1);
    doc.circle(sealX, sealY, radius - 2, "S");

    // Text inside Seal
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text("OFFICIAL", sealX, sealY - 3, { align: "center" });
    doc.text("SEAL", sealX, sealY + 3, { align: "center" });
    doc.setFontSize(6);
    doc.text("VERIFIED", sealX, sealY + 8, { align: "center" });

    // --- F. SAVE ---
    doc.save(`${pet.name}_Official_Certificate.pdf`);
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
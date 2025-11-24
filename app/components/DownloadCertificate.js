// app/components/DownloadCertificate.js
"use client";
import { useState } from "react";
import jsPDF from "jspdf";

export default function DownloadCertificate({ pet }) {
  const [loading, setLoading] = useState(false);

  const generatePDF = () => {
    setLoading(true);
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4"
    });

    const log = pet.adoptionLog;
    const dateStr = new Date(log.adoptionDate).toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' });

    // --- Styling ---
    // Border
    doc.setLineWidth(2);
    doc.setDrawColor(74, 144, 226); // Blue #4A90E2
    doc.rect(10, 10, 277, 190); // Outer border
    
    doc.setLineWidth(1);
    doc.setDrawColor(80, 227, 194); // Teal #50E3C2
    doc.rect(15, 15, 267, 180); // Inner border

    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(40);
    doc.setTextColor(74, 144, 226);
    doc.text("CERTIFICATE OF ADOPTION", 148.5, 45, { align: "center" });

    // Subtitle
    doc.setFont("helvetica", "normal");
    doc.setFontSize(16);
    doc.setTextColor(100, 100, 100);
    doc.text("This certifies that the pet known as", 148.5, 65, { align: "center" });

    // Pet Name
    doc.setFont("times", "italic"); // Fancy font style
    doc.setFontSize(36);
    doc.setTextColor(51, 51, 51);
    doc.text(pet.name, 148.5, 85, { align: "center" });

    // Details
    doc.setFont("helvetica", "normal");
    doc.setFontSize(14);
    doc.setTextColor(80, 80, 80);
    const details = `(Breed: ${pet.breed} | Gender: ${pet.gender})`;
    doc.text(details, 148.5, 95, { align: "center" });

    // Text Block
    doc.setFontSize(16);
    doc.text("Has been officially adopted and welcomed into the loving home of", 148.5, 115, { align: "center" });

    // New Owner
    doc.setFont("times", "bold");
    doc.setFontSize(28);
    doc.setTextColor(51, 51, 51);
    doc.text(log.newOwnerName || "New Owner", 148.5, 130, { align: "center" });

    // Previous Owner Section
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor(120, 120, 120);
    doc.text(`Transferred from: ${log.previousOwnerName || "Previous Owner"}`, 148.5, 145, { align: "center" });

    // Footer Dates and Signatures Line
    doc.setDrawColor(150, 150, 150);
    doc.line(60, 170, 120, 170); // Line 1
    doc.line(180, 170, 240, 170); // Line 2

    doc.setFontSize(12);
    doc.text(dateStr, 90, 177, { align: "center" }); // Date
    doc.text("PetLink Official", 210, 177, { align: "center" }); // Signature

    doc.setFontSize(10);
    doc.text("Date", 90, 185, { align: "center" });
    doc.text("Authorized Signature", 210, 185, { align: "center" });

    // Certificate ID
    doc.setFontSize(9);
    doc.setTextColor(180, 180, 180);
    doc.text(`Certificate ID: ${log.certificateId || "N/A"}`, 280, 195, { align: "right" });

    // Save
    doc.save(`${pet.name}_Adoption_Certificate.pdf`);
    setLoading(false);
  };

  return (
    <button
      onClick={generatePDF}
      disabled={loading}
      className="w-full bg-gradient-to-r from-[#4A90E2] to-[#50E3C2] hover:from-[#3A75B9] hover:to-[#3FCCB4] text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all transform hover:scale-105 flex items-center justify-center gap-2"
    >
      {loading ? (
        <span>Generating...</span>
      ) : (
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
// app/generate-certificate/page.js
"use client";
import { useState } from "react";
import jsPDF from "jspdf";

// --- VACCINATION CONFIGURATION ---
const VACCINE_MAP = {
  Dog: [
    { key: 'vax1', label: 'DHPP (Distemper, Hepatitis, Parvo, Parainfluenza)' },
    { key: 'vax2', label: 'Rabies' },
    { key: 'vax3', label: 'Bordetella (Kennel Cough)' },
    { key: 'vax4', label: 'Lyme Disease' },
    { key: 'vax5', label: 'Leptospirosis' },
    { key: 'vax6', label: 'Canine Influenza' }
  ],
  Cat: [
    { key: 'vax1', label: 'FVRCP (Rhinotracheitis, Calicivirus, Panleukopenia)' },
    { key: 'vax2', label: 'Rabies' },
    { key: 'vax3', label: 'FeLV (Feline Leukemia)' },
    { key: 'vax4', label: 'Chlamydia' },
    { key: 'vax5', label: 'FIP (Feline Infectious Peritonitis)' }
  ],
  Rabbit: [
    { key: 'vax1', label: 'Myxomatosis' },
    { key: 'vax2', label: 'RHD (Rabbit Haemorrhagic Disease)' },
    { key: 'vax3', label: 'RHDV2 (New Strain)' }
  ],
  Bird: [
    { key: 'vax1', label: 'Polyomavirus' },
    { key: 'vax2', label: 'Pacheco\'s Disease' }
  ],
  Others: [
    { key: 'vax1', label: 'Generic Vaccine 1' },
    { key: 'vax2', label: 'Generic Vaccine 2' },
    { key: 'vax3', label: 'Rabies' }
  ]
};

export default function CertificateGenerator() {
  // --- Form State ---
  const [formData, setFormData] = useState({
    clinicName: "Pet MediCare",
    clinicAddress: "Chelakkara, Thrissur, Kerala - 680586",
    clinicPhone: "04884-252525",
    vetLicense: "VET-REG-2024-8892",
    
    ownerName: "Abin AD",
    ownerAddress: "Attoor, Mullurkara, Thrissur, Kerala, 680583",
    
    petName: "Whitee",
    species: "Cat",
    breed: "Persian",
    sex: "Male",
    dob: "10/08/2021",
    color: "White & Grey",
    weight: "4.5 kg",
    microchip: "981020001234567",
    
    // Dynamic Vaccination Dates
    vax1Date: "25/11/2024", vax1Expiry: "25/11/2025",
    vax2Date: "15/12/2024", vax2Expiry: "15/12/2025",
    vax3Date: "", vax3Expiry: "",
    vax4Date: "", vax4Expiry: "",
    vax5Date: "", vax5Expiry: "",
    vax6Date: "", vax6Expiry: "",
    
    issueDate: new Date().toLocaleDateString('en-GB'),
    vetSignature: "Dr. Smith"
  });

  const handleSpeciesChange = (e) => {
    setFormData({
      ...formData,
      species: e.target.value,
      // Reset dates on species change
      vax1Date: "", vax1Expiry: "",
      vax2Date: "", vax2Expiry: "",
      vax3Date: "", vax3Expiry: "",
      vax4Date: "", vax4Expiry: "",
      vax5Date: "", vax5Expiry: "",
      vax6Date: "", vax6Expiry: ""
    });
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // --- PDF Generation Logic ---
  const generatePDF = () => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    const { 
      clinicName, clinicAddress, clinicPhone, vetLicense,
      ownerName, ownerAddress, 
      petName, species, breed, sex, dob, color, weight, microchip,
      issueDate, vetSignature 
    } = formData;

    // --- 1. BORDER & FRAME ---
    doc.setLineWidth(1);
    doc.rect(10, 10, 190, 277); // Outer Border
    doc.setLineWidth(0.5);
    doc.rect(12, 12, 186, 273); // Inner Border

    // --- 2. HEADER ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.setTextColor(44, 62, 80); // Dark Blue
    doc.text(clinicName.toUpperCase(), 105, 25, { align: "center" });

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(clinicAddress, 105, 32, { align: "center" });
    doc.text(`Phone: ${clinicPhone}  |  Lic: ${vetLicense}`, 105, 37, { align: "center" });

    doc.setLineWidth(0.5);
    doc.setDrawColor(200);
    doc.line(20, 42, 190, 42);

    doc.setFontSize(18);
    doc.setTextColor(0);
    doc.text("CERTIFICATE OF VACCINATION", 105, 52, { align: "center" });

    // --- 3. DETAILS GRID ---
    let y = 65;
    const leftX = 20;
    const rightX = 110;
    const labelOffset = 40;

    // Helper for fields
    const drawField = (label, value, x, yVal) => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text(label, x, yVal);
        doc.setFont("helvetica", "normal");
        doc.text(value || "N/A", x + labelOffset, yVal);
        // Underline the value
        doc.setDrawColor(220);
        doc.line(x + labelOffset - 2, yVal + 1, x + 80, yVal + 1); 
    };

    // Row 1
    drawField("Owner Name:", ownerName, leftX, y);
    drawField("Pet Name:", petName, rightX, y);
    y += 10;

    // Row 2 - Address needs more space, so we handle it uniquely if needed, but here it fits
    drawField("Address:", ownerAddress, leftX, y);
    drawField("Species:", species, rightX, y);
    y += 10;

    // Row 3
    drawField("Microchip ID:", microchip, leftX, y);
    drawField("Breed:", breed, rightX, y);
    y += 10;

    // Row 4
    drawField("Color/Markings:", color, leftX, y);
    drawField("Sex:", sex, rightX, y);
    y += 10;

    // Row 5
    drawField("Weight:", weight, leftX, y);
    drawField("DOB / Age:", dob, rightX, y);
    
    y += 15;

    // --- 4. VACCINATION TABLE ---
    
    // Header Row
    doc.setFillColor(240, 240, 240);
    doc.rect(20, y, 170, 8, 'F');
    doc.setFont("helvetica", "bold");
    doc.text("VACCINE / PROPHYLAXIS", 25, y + 5);
    doc.text("DATE GIVEN", 120, y + 5);
    doc.text("DUE DATE", 160, y + 5);
    
    y += 10;

    // Rows
    const activeVaccines = VACCINE_MAP[species] || VACCINE_MAP["Others"];
    
    activeVaccines.forEach((vax) => {
        const dateVal = formData[`${vax.key}Date`];
        const expiryVal = formData[`${vax.key}Expiry`];

        if (dateVal) { 
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            doc.text(vax.label, 25, y);
            
            doc.setFont("helvetica", "normal");
            doc.text(dateVal, 120, y);
            doc.text(expiryVal, 160, y);
            
            // Light underline for row
            doc.setDrawColor(230);
            doc.line(20, y + 2, 190, y + 2);
            
            y += 8;
        } else {
            // Print empty row for manual filling
            doc.setFont("helvetica", "normal");
            doc.setTextColor(150);
            doc.text(vax.label, 25, y);
            doc.line(118, y, 145, y); 
            doc.line(158, y, 185, y); 
            doc.setTextColor(0);
            y += 8;
        }
    });

    // --- 5. FOOTER & CERTIFICATION ---
    y = 230; // Push to bottom
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text("I hereby certify that the animal described above has been vaccinated as indicated.", 105, y, { align: "center" });
    
    y += 20;
    
    // Signatures
    doc.setFont("helvetica", "bold");
    doc.text(`Date Issued:  ${issueDate}`, 30, y);
    
    doc.text("Veterinarian Signature:", 120, y - 5);
    doc.setFont("times", "italic");
    doc.setFontSize(14);
    doc.text(vetSignature, 130, y + 5); 
    
    // Stamp Circle
    doc.setDrawColor(44, 62, 80);
    doc.setLineWidth(0.5);
    doc.circle(160, y, 12);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("OFFICIAL", 160, y - 2, { align: "center" });
    doc.text("STAMP", 160, y + 2, { align: "center" });

    // Save
    doc.save(`${petName}_Detailed_Certificate.pdf`);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto bg-white p-10 rounded-3xl shadow-2xl">
        
        <div className="text-center mb-10">
            <h1 className="text-4xl font-extrabold text-[#4A90E2] mb-2">
            🧾 Pro Certificate Generator
            </h1>
            <p className="text-gray-500">Create realistic veterinary documents for AI testing</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* --- LEFT COLUMN: INPUT FORM --- */}
            <div className="lg:col-span-7 space-y-6">
                
                {/* Section 1: Clinic */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2">🏥 Clinic Information</h3>
                    <div className="grid grid-cols-2 gap-3">
                        <input name="clinicName" value={formData.clinicName} onChange={handleChange} className="input-field" placeholder="Clinic Name" />
                        <input name="clinicPhone" value={formData.clinicPhone} onChange={handleChange} className="input-field" placeholder="Phone" />
                        <input name="clinicAddress" value={formData.clinicAddress} onChange={handleChange} className="input-field col-span-2" placeholder="Address" />
                    </div>
                </div>

                {/* Section 2: Pet & Owner */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2">🐾 Patient & Owner Details</h3>
                    <div className="grid grid-cols-2 gap-3">
                        {/* OWNER NAME */}
                        <input name="ownerName" value={formData.ownerName} onChange={handleChange} className="input-field" placeholder="Owner Name" />
                        
                        {/* PET NAME */}
                        <input name="petName" value={formData.petName} onChange={handleChange} className="input-field" placeholder="Pet Name" />
                        
                        {/* OWNER ADDRESS (FIXED: ADDED BACK) */}
                        <input name="ownerAddress" value={formData.ownerAddress} onChange={handleChange} className="input-field col-span-2" placeholder="Owner Address" />
                        
                        <select name="species" value={formData.species} onChange={handleSpeciesChange} className="input-field bg-blue-50 font-bold text-blue-800">
                            <option value="Dog">Dog 🐶</option>
                            <option value="Cat">Cat 🐱</option>
                            <option value="Rabbit">Rabbit 🐰</option>
                            <option value="Bird">Bird 🦜</option>
                            <option value="Others">Other 🐾</option>
                        </select>
                        <select name="sex" value={formData.sex} onChange={handleChange} className="input-field">
                            <option>Male</option>
                            <option>Female</option>
                        </select>

                        <input name="breed" value={formData.breed} onChange={handleChange} className="input-field" placeholder="Breed" />
                        <input name="color" value={formData.color} onChange={handleChange} className="input-field" placeholder="Color/Markings" />
                        
                        <input name="dob" value={formData.dob} onChange={handleChange} className="input-field" placeholder="DOB (DD/MM/YYYY)" />
                        <input name="weight" value={formData.weight} onChange={handleChange} className="input-field" placeholder="Weight (e.g. 5kg)" />
                        
                        <input name="microchip" value={formData.microchip} onChange={handleChange} className="input-field col-span-2" placeholder="Microchip ID (15 digits)" />
                    </div>
                </div>
            </div>

            {/* --- RIGHT COLUMN: VACCINES --- */}
            <div className="lg:col-span-5 flex flex-col">
                <div className="bg-blue-50 p-5 rounded-xl border border-blue-200 h-full">
                    <h3 className="font-bold text-blue-800 mb-4 flex justify-between items-center">
                        <span>💉 Vaccination Record</span>
                        <span className="text-xs bg-white px-2 py-1 rounded shadow-sm">{formData.species} Protocol</span>
                    </h3>
                    
                    <div className="space-y-3 overflow-y-auto max-h-[500px] pr-2">
                        {(VACCINE_MAP[formData.species] || VACCINE_MAP["Others"]).map((vax) => (
                            <div key={vax.key} className="bg-white p-3 rounded-lg shadow-sm border border-blue-100">
                                <p className="text-sm font-bold text-gray-700 mb-2">{vax.label}</p>
                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase">Date Given</label>
                                        <input 
                                            name={`${vax.key}Date`} 
                                            value={formData[`${vax.key}Date`]} 
                                            onChange={handleChange} 
                                            className="w-full p-2 border rounded text-sm outline-none focus:ring-1 focus:ring-blue-400" 
                                            placeholder="DD/MM/YYYY"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase">Next Due</label>
                                        <input 
                                            name={`${vax.key}Expiry`} 
                                            value={formData[`${vax.key}Expiry`]} 
                                            onChange={handleChange} 
                                            className="w-full p-2 border rounded text-sm outline-none focus:ring-1 focus:ring-red-400" 
                                            placeholder="DD/MM/YYYY"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>

        {/* --- ACTION BAR --- */}
        <div className="mt-10 pt-6 border-t border-gray-200 flex justify-end gap-4">
            <div className="flex items-center gap-2 mr-auto">
                <label className="text-sm font-bold text-gray-600">Vet Signature:</label>
                <input name="vetSignature" value={formData.vetSignature} onChange={handleChange} className="input-field w-48" />
            </div>
            
            <button 
                onClick={generatePDF}
                className="bg-[#4A90E2] hover:bg-[#3A75B9] text-white font-bold py-4 px-12 rounded-xl shadow-lg transition-all transform hover:scale-105 flex items-center gap-3 text-lg"
            >
                <span>🖨️</span> Generate Official PDF
            </button>
        </div>

      </div>
    </div>
  );
}
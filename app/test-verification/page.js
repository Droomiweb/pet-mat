// app/test-verification/page.js
"use client";
import { useState } from "react";

export default function VerificationTestPage() {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  
  // Test Data Inputs
  const [name, setName] = useState("Buddy");
  const [breed, setBreed] = useState("Golden Retriever");
  const [age, setAge] = useState("2");
  // NEW: Owner Name Input
  const [ownerName, setOwnerName] = useState("John Doe");

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
      setResult(null); // Clear previous results
    }
  };

  const runTest = async () => {
    if (!image) return alert("Please upload a certificate image.");
    
    setLoading(true);
    setResult(null);

    // Convert to Base64
    const reader = new FileReader();
    reader.readAsDataURL(image);
    reader.onload = async () => {
      const base64 = reader.result;

      try {
        const res = await fetch("/api/test-verification", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64: base64,
            petName: name,
            petBreed: breed,
            petAge: age,
            ownerName: ownerName // NEW: Send owner name
          }),
        });

        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setResult(data);
      } catch (err) {
        alert("Test Failed: " + err.message);
      } finally {
        setLoading(false);
      }
    };
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'verified': return 'bg-green-100 border-green-300 text-green-800';
      case 'rejected': return 'bg-red-100 border-red-300 text-red-800';
      default: return 'bg-yellow-100 border-yellow-300 text-yellow-800';
    }
  };
  
  const formatDate = (dateStr) => {
    if (!dateStr || dateStr.toUpperCase() === 'N/A') return 'N/A';
    try {
        return new Date(dateStr).toLocaleDateString();
    } catch(e) {
        return dateStr; // Return raw if parsing fails
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8 pt-24 flex flex-col items-center">
      <div className="max-w-3xl w-full bg-white rounded-2xl shadow-xl p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center border-b pb-4">
          🕵️‍♀️ AI Verification & Extraction Sandbox
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* LEFT: Inputs */}
          <div className="space-y-4">
            <h2 className="font-bold text-xl text-blue-600 border-b pb-2">Inputs for Comparison</h2>
            <div>
              <label className="block font-bold text-gray-700 mb-1">Expected Owner Name</label>
              <input 
                type="text" value={ownerName} onChange={(e) => setOwnerName(e.target.value)}
                className="w-full border p-2 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-bold text-gray-700 mb-1">Expected Pet Name</label>
              <input 
                type="text" value={name} onChange={(e) => setName(e.target.value)}
                className="w-full border p-2 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-bold text-gray-700 mb-1">Expected Breed</label>
              <input 
                type="text" value={breed} onChange={(e) => setBreed(e.target.value)}
                className="w-full border p-2 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-bold text-gray-700 mb-1">User-Provided Age (for comparison)</label>
              <input 
                type="number" value={age} onChange={(e) => setAge(e.target.value)}
                className="w-full border p-2 rounded-lg"
              />
            </div>

            <div className="pt-4">
              <label className="block font-bold text-gray-700 mb-2">Upload Certificate (Image/PDF)</label>
              <input type="file" accept="image/*,application/pdf" onChange={handleImageChange} className="w-full" />
            </div>

            {preview && (
              <div className="mt-4 relative h-48 w-full border-2 border-dashed border-gray-300 rounded-lg overflow-hidden">
                <img src={preview} alt="Preview" className="object-contain w-full h-full" />
              </div>
            )}

            <button
              onClick={runTest}
              disabled={loading || !image}
              className={`w-full py-3 rounded-xl font-bold text-white shadow-lg transition-all ${
                loading ? "bg-gray-400 cursor-wait" : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {loading ? "Running Advanced AI Analysis..." : "Run AI Test"}
            </button>
          </div>

          {/* RIGHT: Results */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 h-full min-h-[400px] overflow-y-auto">
            <h2 className="font-bold text-xl text-gray-800 mb-4">AI Analysis Results</h2>
            
            {loading && (
              <div className="flex flex-col items-center justify-center h-40 text-blue-500">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mb-2"></div>
                <p>Analyzing Document...</p>
              </div>
            )}

            {result && (
              <div className="space-y-4 text-sm">
                {result.error ? (
                  <div className="bg-red-100 text-red-700 p-3 rounded-lg">
                    <strong>Error:</strong> {result.error}
                  </div>
                ) : (
                  <>
                    <div className={`p-3 rounded-lg border ${getStatusBadge(result.decision.status)}`}>
                      <p className="text-lg font-bold uppercase">{result.decision.status}</p>
                      <p className="font-semibold mt-1">Reason: {result.decision.reason}</p>
                    </div>

                    <div>
                      <h3 className="font-bold text-gray-700 border-b mb-2 pb-1">Extracted Core Data</h3>
                      <ul className="space-y-2">
                        <li className="flex justify-between">
                            <span className="text-gray-500">Owner Name Match:</span>
                            <span className={`font-semibold ${result.ownerNameMatch ? 'text-green-600' : 'text-red-600'}`}>
                                {result.ownerNameMatch ? '✅ MATCH' : '❌ MISMATCH'}
                            </span>
                        </li>
                        <li className="flex justify-between">
                          <span className="text-gray-500">Pet Name:</span>
                          <span className="font-mono font-semibold text-gray-800 bg-white px-1 rounded">{result.analysis.petName}</span>
                        </li>
                        <li className="flex justify-between">
                          <span className="text-gray-500">Owner Name:</span>
                          <span className="font-mono font-semibold text-gray-800 bg-white px-1 rounded">{result.analysis.ownerName}</span>
                        </li>
                        <li className="flex justify-between">
                          <span className="text-gray-500">Extracted DOB (Raw):</span>
                          <span className="font-mono font-semibold text-gray-800 bg-white px-1 rounded">{result.analysis.extractedDOB}</span>
                        </li>
                         <li className="flex justify-between border-t mt-2 pt-2">
                          <span className="text-gray-500 font-bold">Calculated Age (from DOB):</span>
                          <span className="font-mono font-bold text-blue-600 bg-white px-1 rounded">{result.calculatedAge || 'N/A'} years</span>
                        </li>
                      </ul>
                    </div>

                    <div className="mt-4">
                        <h3 className="font-bold text-gray-700 border-b mb-2 pb-1">Vaccination History ({result.vaccinationHistory.length})</h3>
                        {result.vaccinationHistory.length === 0 ? (
                            <p className="text-gray-500">No vaccination records extracted.</p>
                        ) : (
                            <div className="space-y-2">
                                {result.vaccinationHistory.map((vax, index) => (
                                    <div key={index} className={`p-2 rounded border ${vax.status === 'expired' ? 'bg-red-50' : vax.status === 'upcoming' ? 'bg-yellow-50' : 'bg-green-50'}`}>
                                        <p className="font-semibold">{vax.vaccineName}</p>
                                        <p className="text-xs text-gray-600">Given: {formatDate(vax.vaccinationDate)}</p>
                                        <p className={`text-xs font-bold ${vax.status === 'expired' ? 'text-red-600' : vax.status === 'upcoming' ? 'text-yellow-600' : 'text-green-600'}`}>
                                            Expires: {formatDate(vax.expiryDate)} ({vax.status.toUpperCase()})
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                  </>
                )}
                {/* Debug Logs */}
                <div className="mt-4">
                  <h3 className="font-bold text-gray-700 border-b mb-2 pb-1">AI OCR Text (Debug)</h3>
                  <pre className="bg-gray-800 text-green-400 p-3 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap">
                    {result.analysis.aiOcrText || 'N/A'}
                  </pre>
                </div>
              </div>
            )}

            {!loading && !result && (
              <p className="text-gray-400 text-center mt-20">
                Upload an image/PDF and run the test to see extraction and verification results here.
              </p>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
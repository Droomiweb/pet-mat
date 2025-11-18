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
            petAge: age
          }),
        });

        const data = await res.json();
        setResult(data);
      } catch (err) {
        alert("Test Failed: " + err.message);
      } finally {
        setLoading(false);
      }
    };
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8 pt-24 flex flex-col items-center">
      <div className="max-w-3xl w-full bg-white rounded-2xl shadow-xl p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center border-b pb-4">
          🕵️‍♀️ Auto-Verification Sandbox
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* LEFT: Inputs */}
          <div className="space-y-4">
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
              <label className="block font-bold text-gray-700 mb-1">Expected Age</label>
              <input 
                type="number" value={age} onChange={(e) => setAge(e.target.value)}
                className="w-full border p-2 rounded-lg"
              />
            </div>

            <div className="pt-4">
              <label className="block font-bold text-gray-700 mb-2">Upload Certificate</label>
              <input type="file" accept="image/pdf/*" onChange={handleImageChange} className="w-full" />
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
              {loading ? "Running AI Analysis..." : "Run Verification Test"}
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
                    <div className={`p-3 rounded-lg border ${
                      result.decision.status === 'verified' ? 'bg-green-100 border-green-300 text-green-800' :
                      result.decision.status === 'rejected' ? 'bg-red-100 border-red-300 text-red-800' :
                      'bg-yellow-100 border-yellow-300 text-yellow-800'
                    }`}>
                      <p className="text-lg font-bold uppercase">{result.decision.status}</p>
                      <p>{result.decision.reason}</p>
                    </div>

                    <div>
                      <h3 className="font-bold text-gray-700 border-b mb-2 pb-1">Extracted Data</h3>
                      <ul className="space-y-2">
                        {Object.entries(result.analysis).map(([key, val]) => (
                          <li key={key} className="flex justify-between">
                            <span className="text-gray-500 capitalize">{key}:</span>
                            <span className="font-mono font-semibold text-gray-800 bg-white px-1 rounded">{val}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h3 className="font-bold text-gray-700 border-b mb-2 pb-1">Debug Logs</h3>
                      <pre className="bg-gray-800 text-green-400 p-3 rounded-lg text-xs overflow-x-auto">
                        {result.debugLogs.join('\n')}
                      </pre>
                    </div>
                  </>
                )}
              </div>
            )}

            {!loading && !result && (
              <p className="text-gray-400 text-center mt-20">
                Upload an image and run the test to see results here.
              </p>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
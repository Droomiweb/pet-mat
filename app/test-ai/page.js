// app/test-ai/page.js
"use client";
import { useState } from "react";

export default function TestAIPage() {
  const [imagePreview, setImagePreview] = useState(null);
  const [base64Image, setBase64Image] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Handle file selection and conversion to Base64
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Create a preview
    setImagePreview(URL.createObjectURL(file));
    setResult(null);
    setError(null);

    // Convert to Base64 for the API
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      setBase64Image(reader.result);
    };
    reader.onerror = (err) => {
      console.error("Error reading file:", err);
      setError("Failed to read file");
    };
  };

  // Send to your existing API route
  const runTest = async () => {
    if (!base64Image) return alert("Please select an image first");
    
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/analyze-pet-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            imageUrl: base64Image,
            // Send mime type if available, otherwise default
            mimeType: base64Image.match(/[^:]\w+\/[\w-+\d.]+(?=;|,)/)?.[0] || "image/jpeg"
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setResult(data);
      } else {
        setError(data.error || "API returned an error");
      }
    } catch (err) {
      setError(err.message || "Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8 flex flex-col items-center">
      <div className="max-w-md w-full bg-white p-6 rounded-xl shadow-lg">
        <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">
          🤖 AI Vision Test Bench
        </h1>

        {/* Image Input */}
        <div className="mb-6">
          <label className="block mb-2 font-semibold text-gray-600">Upload Pet Image</label>
          <input 
            type="file" 
            accept="image/*" 
            onChange={handleFileChange}
            className="w-full border p-2 rounded"
          />
        </div>

        {/* Image Preview */}
        {imagePreview && (
          <div className="mb-6 flex justify-center">
            <img 
              src={imagePreview} 
              alt="Test" 
              className="h-48 object-cover rounded-lg border-2 border-blue-200"
            />
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={runTest}
          disabled={loading || !base64Image}
          className={`w-full py-3 rounded-lg font-bold text-white transition-colors ${
            loading || !base64Image
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {loading ? "Analyzing with Gemini..." : "Run AI Recognition"}
        </button>

        {/* Results Display */}
        {result && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="font-bold text-green-800 mb-2">Success! AI Response:</h3>
            <pre className="bg-white p-3 rounded border text-sm overflow-auto text-gray-700">
              {JSON.stringify(result, null, 2)}
            </pre>
            <p className="mt-2 text-sm text-gray-600">
              *This matches the format required by your Add Pet page.*
            </p>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <h3 className="font-bold text-red-800 mb-1">Error Failed:</h3>
            <p className="text-red-600">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
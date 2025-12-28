"use client";
import { useState, useEffect } from "react";
import { useAuth } from "../auth-provider";
import Image from "next/image";
import Link from "next/link";

// --- ICONS ---
const SparklesIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-purple-500">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.456-2.456L14.25 6l1.035-.259a3.375 3.375 0 002.456-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
  </svg>
);

const DownloadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M7.5 12l4.5 4.5m0 0l4.5-4.5M12 15V3" />
  </svg>
);

export default function AIAdvisor() {
  const { user } = useAuth();
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  
  const [selectedPetA, setSelectedPetA] = useState("");
  const [selectedPetB, setSelectedPetB] = useState("");
  const [generatedImage, setGeneratedImage] = useState(null);
  const [error, setError] = useState("");

  // Fetch user's pets
  useEffect(() => {
    if (!user) return;
    const fetchPets = async () => {
      try {
        const res = await fetch(`/api/pet/user/${user.uid}`);
        if (res.ok) {
          const data = await res.json();
          // Filter only dogs/cats and separate by gender for easier selection
          setPets(data.filter(p => p.type === 'Dog' || p.type === 'Cat'));
        }
      } catch (err) {
        console.error("Failed to load pets", err);
        setError("Failed to load your pets. Please refresh.");
      } finally {
        setLoading(false);
      }
    };
    fetchPets();
  }, [user]);

  const handleGenerate = async () => {
    if (!selectedPetA || !selectedPetB) {
      setError("Please select two pets.");
      return;
    }
    if (selectedPetA === selectedPetB) {
        setError("Please select two different pets.");
        return;
    }

    setGenerating(true);
    setError("");
    setGeneratedImage(null);

    try {
      const res = await fetch("/api/ai-advisor/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            petAId: selectedPetA, 
            petBId: selectedPetB,
            userId: user.uid // Pass user ID to save data
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setGeneratedImage(data.imageUrl);
      } else {
        setError(data.error || "Failed to generate image.");
      }
    } catch (err) {
        setError("An error occurred. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  // Function to download the image
  const handleDownload = async () => {
    if (!generatedImage) return;
    try {
      // Fetch the image as a blob to bypass CORS issues with simple <a> download tags
      const response = await fetch(generatedImage);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      // Generate a filename based on timestamp
      link.download = `pet-offspring-${Date.now()}.jpg`; 
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed:", err);
      alert("Failed to download image. Try right-clicking and saving.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#E2F4EF]">
        <div className="w-12 h-12 border-4 border-[#4A90E2] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#E2F4EF] to-white pt-24 md:pt-32 pb-20 px-4">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center p-3 bg-white rounded-2xl shadow-md mb-4">
                <SparklesIcon />
            </div>
            <h1 className="text-4xl font-extrabold text-gray-800 mb-3">
                Future Pup Predictor
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Select two of your pets and let our AI dream up what their adorable offspring might look like.
            </p>
        </div>

        {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-8 rounded-md max-w-3xl mx-auto shadow-sm">
                <p className="text-red-700 font-medium">{error}</p>
            </div>
        )}

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-5 gap-8 max-w-5xl mx-auto items-start">
            
            {/* Left Column: Selection Form (occupies 2/5 columns) */}
            <div className="lg:col-span-2 bg-white p-8 rounded-[2rem] shadow-xl border border-gray-100 z-10 relative overflow-hidden">
                {/* Background decoration */}
                <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-[#4A90E2]/10 rounded-full blur-2xl pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl pointer-events-none"></div>

                <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2 relative z-10">
                    <span>1.</span> Select Parents
                </h2>
                
                <div className="space-y-5 relative z-10">
                    <div>
                        <label className="block text-sm font-bold text-gray-500 uppercase mb-2 pl-1">Parent One</label>
                        <div className="relative">
                            <select
                                value={selectedPetA}
                                onChange={(e) => setSelectedPetA(e.target.value)}
                                className="w-full p-4 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-[#4A90E2] focus:ring-2 focus:ring-[#4A90E2]/20 appearance-none font-medium text-gray-700 transition-all"
                            >
                                <option value="">Choose first pet...</option>
                                {pets.map(p => (
                                    <option key={p._id} value={p._id}>{p.name} ({p.breed} - {p.gender})</option>
                                ))}
                            </select>
                             <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-500 uppercase mb-2 pl-1">Parent Two</label>
                        <div className="relative">
                            <select
                                value={selectedPetB}
                                onChange={(e) => setSelectedPetB(e.target.value)}
                                className="w-full p-4 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-[#4A90E2] focus:ring-2 focus:ring-[#4A90E2]/20 appearance-none font-medium text-gray-700 transition-all"
                            >
                                <option value="">Choose second pet...</option>
                                {pets.map(p => (
                                    <option key={p._id} value={p._id}>{p.name} ({p.breed} - {p.gender})</option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4">
                        <button
                            onClick={handleGenerate}
                            disabled={generating || pets.length < 2}
                            className={`w-full py-4 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-3 transition-all ${
                                generating || pets.length < 2
                                ? "bg-gray-400 cursor-not-allowed opacity-70"
                                : "bg-gradient-to-r from-[#4A90E2] to-purple-500 hover:scale-[1.02] hover:shadow-xl"
                            }`}
                        >
                            {generating ? (
                                <>
                                    <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    Dreaming up image...
                                </>
                            ) : (
                                <>
                                    <SparklesIcon /> Generate Offspring
                                </>
                            )}
                        </button>
                        {pets.length < 2 && (
                            <p className="text-center text-sm text-gray-500 mt-3">
                                You need at least 2 pets. <Link href="/Addpet" className="text-[#4A90E2] font-bold hover:underline">Add one here.</Link>
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Right Column: Result Display (occupies 3/5 columns) */}
            <div className="lg:col-span-3 bg-white p-8 rounded-[2rem] shadow-xl border border-gray-100 min-h-[500px] flex flex-col relative overflow-hidden">
                 {/* Background decoration */}
                 <div className="absolute bottom-0 right-0 -mb-12 -mr-12 w-48 h-48 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none"></div>

                <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2 relative z-10">
                    <span>2.</span> The Result
                </h2>

                <div className="flex-1 flex items-center justify-center rounded-2xl overflow-hidden bg-gray-50 border-2 border-dashed border-gray-200 relative z-10 group">
                    {generating ? (
                        <div className="text-center px-6">
                            <div className="relative w-24 h-24 mx-auto mb-6">
                                <div className="absolute inset-0 rounded-full border-4 border-gray-100"></div>
                                <div className="absolute inset-0 rounded-full border-4 border-t-[#4A90E2] border-r-[#4A90E2] animate-spin"></div>
                                <Image src="/imgs/loading-paw.png" width={50} height={50} alt="Loading" className="absolute inset-0 m-auto opacity-50" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-700 mb-2">AI is getting creative...</h3>
                            <p className="text-gray-500 max-w-sm mx-auto leading-relaxed">
                                Analyzing traits, mixing genes, and painting pixels. This usually takes about 15-30 seconds.
                            </p>
                        </div>
                    ) : generatedImage ? (
                        <div className="relative w-full h-full min-h-[400px]">
                            <Image 
                                src={generatedImage} 
                                alt="Generated Offspring" 
                                fill 
                                className="object-cover transition-transform duration-700 group-hover:scale-105"
                            />
                            {/* Overlay with Download Button */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-8">
                                 <button
                                    onClick={handleDownload}
                                    className="bg-white text-gray-800 font-bold py-3 px-8 rounded-full shadow-lg hover:bg-gray-50 hover:scale-105 transition-all flex items-center gap-2"
                                 >
                                    <DownloadIcon /> Download Image
                                 </button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-gray-400 px-6">
                             <div className="w-32 h-32 mx-auto mb-4 opacity-20 grayscale relative">
                                <Image src="/imgs/dog.jpg" fill className="object-contain" alt="Placeholder" />
                             </div>
                            <p className="text-lg font-medium">Select parents and click generate to see the magic happen!</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
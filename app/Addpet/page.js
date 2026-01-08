// app/Addpet/page.js
"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../auth-provider";
import Image from "next/image";

// --- ICONS ---
const CameraIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" /></svg>;
const UploadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>;
const CheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>;

// --- 3D ILLUSTRATIONS (SVG) ---
const UploadIllustration = () => (
  <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-2xl">
    <path fill="rgba(255,255,255,0.9)" d="M50,120 Q30,120 30,100 Q30,70 60,70 Q70,40 110,40 Q150,40 160,80 Q190,80 190,110 Q190,140 160,140 L50,140 Z" />
    <g className="animate-bounce">
      <path fill="none" d="M100,60 L100,110 M100,60 L80,80 M100,60 L120,80" stroke="#4A90E2" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
    </g>
    <rect x="70" y="90" width="60" height="40" rx="5" fill="#E2F4EF" stroke="#4A90E2" strokeWidth="3" className="opacity-80" />
  </svg>
);

const ScannerIllustration = () => (
  <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-2xl">
    <g fill="rgba(255,255,255,0.8)">
        <circle cx="60" cy="80" r="20" />
        <circle cx="100" cy="60" r="20" />
        <circle cx="140" cy="80" r="20" />
        <path d="M60,120 Q100,170 140,120 Q140,150 100,150 Q60,150 60,120 Z" />
    </g>
    <rect x="30" y="30" width="140" height="140" rx="15" fill="none" stroke="white" strokeWidth="4" strokeDasharray="10 5" className="opacity-50" />
    <line x1="30" y1="40" x2="170" y2="40" stroke="#50E3C2" strokeWidth="4" className="animate-pulse">
        <animate attributeName="y1" from="40" to="160" dur="1.5s" repeatCount="indefinite" />
        <animate attributeName="y2" from="40" to="160" dur="1.5s" repeatCount="indefinite" />
    </line>
  </svg>
);

const FormIllustration = () => (
  <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-2xl">
    <rect x="50" y="40" width="100" height="130" rx="5" fill="white" />
    <rect x="70" y="30" width="60" height="20" rx="3" fill="#4A90E2" />
    <line x1="65" y1="70" x2="135" y2="70" stroke="#E2E8F0" strokeWidth="6" strokeLinecap="round" />
    <line x1="65" y1="90" x2="115" y2="90" stroke="#E2E8F0" strokeWidth="6" strokeLinecap="round" />
    <line x1="65" y1="110" x2="135" y2="110" stroke="#E2E8F0" strokeWidth="6" strokeLinecap="round" />
    <g>
        <path d="M140,130 L160,150 L160,160 L150,160 L130,140 Z" fill="#FF9A00" />
        <animateTransform attributeName="transform" type="translate" values="0,0; 5,5; 0,0" dur="1s" repeatCount="indefinite" />
    </g>
    <circle cx="140" cy="140" r="20" fill="#50E3C2" className="animate-ping opacity-20" />
  </svg>
);

export default function AddPet() {
  const [step, setStep] = useState(1); 

  // Data
  const [petName, setPetName] = useState("");
  const [petAge, setPetAge] = useState("");
  const [petType, setPetType] = useState(""); 
  const [petBreed, setPetBreed] = useState(""); 
  const [petGender, setPetGender] = useState("");
  const [listingType, setListingType] = useState("Mating");
  
  const [petImage, setPetImage] = useState(null);
  const [petImagePreview, setPetImagePreview] = useState(null);
  const [certificateFile, setCertificateFile] = useState(null); 

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  const [rotate, setRotate] = useState({ x: 0, y: 0 });
  const cardRef = useRef(null);

  const router = useRouter();
  const { user, userData, loading: authLoading } = useAuth();

  const petBreeds = {
    Dog: ["Labrador Retriever", "German Shepherd", "Golden Retriever", "Bulldog", "Poodle", "Beagle", "Other"],
    Cat: ["Persian", "Siamese", "Maine Coon", "Bengal", "British Shorthair", "Ragdoll", "Other"],
    Rabbit: ["Holland Lop", "Netherland Dwarf", "Mini Rex", "Lionhead", "Flemish Giant", "Other"],
    Bird: ["Parrot", "Canary", "Cockatiel", "Lovebird", "Finch", "Other"],
    Other: ["Hamster", "Guinea Pig", "Turtle", "Fish", "Snake", "Mixed", "Unknown"],
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/Login");
    }
  }, [user, authLoading, router]);

  // --- 3D TILT ---
  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const card = cardRef.current;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -10; 
    const rotateY = ((x - centerX) / centerX) * 10;
    setRotate({ x: rotateX, y: rotateY });
  };
  const handleMouseLeave = () => setRotate({ x: 0, y: 0 });

  const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (err) => reject(err);
    });

  // --- AI & IMAGE HANDLER ---
  const processImage = async (file) => {
    setPetImage(file);
    setPetImagePreview(URL.createObjectURL(file));
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const imageB64 = await fileToBase64(file);
      const res = await fetch("/api/analyze-pet-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: imageB64, mimeType: file.type }),
      });
      
      const data = await res.json(); 
      
      // 1. Check for Human
      if (data.isHuman) {
          throw new Error("HUMAN_DETECTED");
      }

      // 2. Process Pet Data
      if (res.ok) {
        let detectedType = data.type || "Other";
        detectedType = detectedType.charAt(0).toUpperCase() + detectedType.slice(1).toLowerCase();
        if (!Object.keys(petBreeds).includes(detectedType)) detectedType = "Other";

        setPetType(detectedType);
        setPetBreed(data.breed || "Unknown");
        
        setTimeout(() => {
            setIsAnalyzing(false);
            setStep(2);
        }, 1500);
      } else {
        throw new Error(data.error || "AI analysis failed.");
      }
    } catch (err) {
      // Handle Human Detection Gracefully
      if (err.message === "HUMAN_DETECTED") {
          setError("Humans detected! 🚫 Only pet photos are allowed. 🐾");
      } else {
          console.error("Image Analysis Error:", err); 
          setError(err.message || "Could not analyze image. Try another.");
      }
      
      // Clear invalid image
      setPetImage(null);
      setPetImagePreview(null);
      setPetType(""); 
      setPetBreed("");
      setIsAnalyzing(false);
    }
  };

  // --- DRAG AND DROP HANDLERS (Restored) ---
  const handleDragOver = (e) => {
      e.preventDefault();
      setIsDragging(true);
  };
  const handleDragLeave = (e) => {
      e.preventDefault();
      setIsDragging(false);
  };
  const handleDrop = (e) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) {
          processImage(file);
      } else {
          setError("Please drop a valid image file.");
      }
  };
  const handleFileSelect = (e) => {
      const file = e.target.files[0];
      if (file) processImage(file);
  };

  // --- SUBMIT ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!petName.trim() || !petAge || !petType || !petBreed || !petGender || !certificateFile || !petImage) {
      setLoading(false);
      return setError("Please fill all fields and upload both image & certificate.");
    }

    try {
      const certificateBase64 = await fileToBase64(certificateFile);
      const petImageBase64 = await fileToBase64(petImage);
      
      const token = await user.getIdToken(); // Get Auth Token

      const res = await fetch("/api/pet", {
        method: "POST",
        headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}` // Inject Token
        },
        body: JSON.stringify({
          name: petName,
          age: petAge,
          type: petType,
          breed: petBreed,
          gender: petGender,
          listingType: listingType,
          certificateBase64, 
          certificateMimeType: certificateFile.type, 
          imagesBase64: [petImageBase64], 
          ownerId: user.uid,
          ownerName: userData.name, 
        }),
      });

      const data = await res.json();
      if (res.status === 201) {
        router.push(`/add-pet-profile/${data.petId}`);
      } else {
        setError(data.error || "Something went wrong");
      }
    } catch (err) {
      console.error(err);
      setError("Server error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !user) return null;

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-0 md:p-4 relative overflow-hidden bg-[#E2F4EF]">
      
      {/* Background Animation */}
      <div className="bg-animation">
        {[...Array(6)].map((_, i) => <div key={i} className="paw-print"></div>)}
      </div>

      {/* Main Container: Stack on Mobile, Row on Desktop */}
      <div className="w-full max-w-5xl bg-white/80 backdrop-blur-xl md:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[100dvh] md:min-h-[600px] border border-white/60 z-10">

        {/* --- LEFT: INTERACTIVE 3D PANEL (Header on Mobile) --- */}
        <div 
          className="w-full md:w-1/2 h-56 md:h-auto bg-gradient-to-br from-[#4A90E2] to-[#50E3C2] flex flex-col justify-center items-center p-6 relative perspective-1000 overflow-hidden shrink-0"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{ perspective: "1000px" }}
        >
          {/* Pattern Overlay */}
          <div className="absolute top-0 left-0 w-full h-full bg-[url('/imgs/pattern.png')] opacity-10 pointer-events-none"></div>

          {/* 3D Tilting Card */}
          <div 
            ref={cardRef}
            className="relative w-full max-w-xs flex flex-col items-center justify-center transition-transform duration-200 ease-out preserve-3d"
            style={{ 
              transform: `rotateX(${rotate.x}deg) rotateY(${rotate.y}deg)`,
              transformStyle: "preserve-3d"
            }}
          >
            <h2 
                className="text-2xl md:text-3xl font-extrabold mb-3 md:mb-6 text-white drop-shadow-lg transition-all duration-500 text-center"
                style={{ transform: "translateZ(60px)" }}
            >
                {isAnalyzing ? "Scanning..." : step === 1 ? "New Companion!" : "Almost Done!"}
            </h2>
            
            {/* 3D Centerpiece */}
            <div 
                className="w-28 h-28 md:w-48 md:h-48 relative rounded-full border-4 md:border-8 border-white/30 shadow-2xl mb-4 transition-all duration-500 bg-white/10 backdrop-blur-sm flex items-center justify-center p-4"
                style={{ transform: "translateZ(40px)" }}
            >
                {isAnalyzing ? (
                    <ScannerIllustration />
                ) : step === 1 ? (
                    <UploadIllustration />
                ) : (
                    <FormIllustration />
                )}
            </div>

            <p 
                className="text-center text-white text-xs md:text-lg font-medium opacity-90 px-2 transition-transform duration-100"
                style={{ transform: "translateZ(30px)" }}
            >
                {isAnalyzing ? "AI is identifying breed..." : step === 1 ? "Upload a clear photo to start." : "Tell us about your pet."}
            </p>
          </div>
        </div>

        {/* --- RIGHT: FORM PANEL --- */}
        <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col justify-center bg-white/80 backdrop-blur-md flex-1 rounded-t-[2rem] md:rounded-none -mt-6 md:mt-0 z-20 shadow-[0_-10px_20px_rgba(0,0,0,0.1)] md:shadow-none overflow-y-auto">
          
          <div className="mb-6 text-center md:text-left pt-2 md:pt-0">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${step === 1 ? 'bg-[#4A90E2] text-white' : 'bg-green-500 text-white'}`}>1</span>
                <div className={`h-1 w-12 rounded-full ${step === 2 ? 'bg-green-500' : 'bg-gray-200'}`}></div>
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${step === 2 ? 'bg-[#4A90E2] text-white' : 'bg-gray-200 text-gray-500'}`}>2</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Register Pet</h1>
          </div>

          {/* --- STEP 1: UPLOAD (DRAG & DROP) --- */}
          {step === 1 && (
            <div className="flex flex-col h-full justify-start md:justify-center animate-in slide-in-from-bottom-4 duration-500">
               <label 
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`cursor-pointer group w-full aspect-[4/3] rounded-3xl border-4 border-dashed flex flex-col items-center justify-center transition-all duration-300 relative overflow-hidden shadow-inner bg-white ${isDragging ? 'border-[#4A90E2] bg-blue-100 scale-105' : 'border-gray-300 hover:border-[#4A90E2] hover:bg-gray-50'}`}
               >
                  
                  {petImagePreview ? (
                      <>
                        <Image src={petImagePreview} alt="Preview" fill className={`object-cover transition-opacity duration-500 ${isAnalyzing ? 'opacity-50 blur-sm' : 'opacity-100'}`} />
                        {isAnalyzing && (
                            <div className="absolute inset-0 flex items-center justify-center z-10">
                                <div className="w-12 h-12 border-4 border-white border-t-[#4A90E2] rounded-full animate-spin"></div>
                            </div>
                        )}
                      </>
                  ) : (
                      <div className="flex flex-col items-center text-gray-400 group-hover:text-[#4A90E2] transition-colors p-4 text-center">
                          <div className="p-4 rounded-full bg-gray-100 group-hover:scale-110 transition-transform duration-300 mb-3">
                             <CameraIcon />
                          </div>
                          <p className="font-bold text-sm">
                             {isDragging ? "Drop it here!" : "Drag & Drop or Click to Upload"}
                          </p>
                          <p className="text-xs opacity-70 mt-1">AI will detect species & breed</p>
                      </div>
                  )}
                  
                  <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" disabled={isAnalyzing} />
               </label>
               
               {error && (
                   <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-xl mt-4 text-center text-sm font-bold animate-pulse">
                       ⚠️ {error}
                   </div>
               )}
            </div>
          )}

          {/* --- STEP 2: DETAILS --- */}
          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-3 animate-in slide-in-from-bottom-8 duration-500 pb-20 md:pb-0">
                
                {/* AI Badge */}
                <div className="bg-green-100 border border-green-300 rounded-xl p-2 text-center mb-2 flex items-center justify-center gap-2">
                    <span className="text-lg">🤖</span>
                    <span className="text-green-800 text-xs font-bold uppercase tracking-wider">
                        AI Detected: {petType} • {petBreed}
                    </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="input-group">
                        <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 ml-1">Name</label>
                        <input value={petName} onChange={(e) => setPetName(e.target.value)} type="text" placeholder="Pet's Name" className="input-field" required />
                    </div>
                    <div className="input-group">
                        <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 ml-1">Age (Years)</label>
                        <input value={petAge} onChange={(e) => setPetAge(e.target.value)} type="number" placeholder="e.g. 2" className="input-field" required />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="input-group">
                        <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 ml-1">Type</label>
                        <select value={petType} onChange={(e) => { setPetType(e.target.value); setPetBreed(""); }} className="input-field cursor-pointer" required>
                            <option value="" disabled>Select Type</option>
                            {Object.keys(petBreeds).map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    <div className="input-group">
                        <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 ml-1">Breed</label>
                        <select value={petBreed} onChange={(e) => setPetBreed(e.target.value)} className="input-field cursor-pointer" required>
                            <option value="" disabled>Select Breed</option>
                            {(petBreeds[petType] || []).map(b => <option key={b} value={b}>{b}</option>)}
                            {petBreed && !(petBreeds[petType] || []).includes(petBreed) && <option value={petBreed}>{petBreed}</option>}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="input-group">
                        <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 ml-1">Gender</label>
                        <select value={petGender} onChange={(e) => setPetGender(e.target.value)} className="input-field cursor-pointer" required>
                            <option value="" disabled>Select Gender</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                        </select>
                    </div>
                    <div className="input-group">
                        <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 ml-1">Listing Purpose</label>
                        <select value={listingType} onChange={(e) => setListingType(e.target.value)} className="input-field cursor-pointer font-bold text-[#4A90E2]" required>
                            <option value="Mating">❤️ Mating</option>
                            <option value="Adoption">🏠 Adoption</option>
                        </select>
                    </div>
                </div>

                {/* Certificate Upload */}
                <div className="input-group">
                    <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 ml-1">Certificate (Image/PDF)</label>
                    <label className={`flex items-center justify-center w-full p-3 rounded-xl border-2 border-dashed cursor-pointer transition-all ${certificateFile ? 'border-green-500 bg-green-50 text-green-600' : 'border-gray-300 text-gray-400 hover:border-[#4A90E2] hover:text-[#4A90E2]'}`}>
                        {certificateFile ? (
                            <span className="flex items-center gap-2 font-bold text-sm"><CheckIcon /> {certificateFile.name.slice(0, 20)}...</span>
                        ) : (
                            <span className="flex items-center gap-2 font-medium text-sm"><UploadIcon /> Upload Document</span>
                        )}
                        <input type="file" accept="image/*,application/pdf" onChange={(e) => setCertificateFile(e.target.files[0])} className="hidden" />
                    </label>
                </div>

                <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => { setStep(1); setPetImage(null); setPetImagePreview(null); }} className="w-1/3 py-3 rounded-xl border border-gray-300 font-bold text-gray-600 hover:bg-gray-50 transition-colors text-sm">Back</button>
                    <button type="submit" disabled={loading} className="flex-1 auth-btn text-sm">
                        {loading ? "Creating..." : "Next: AI Profile"}
                    </button>
                </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
// app/Addpet/page.js
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../auth-provider";
import Image from "next/image";

export default function AddPet() {
  const [step, setStep] = useState(1); // Step 1: Image, Step 2: Details

  // Pet details
  const [petName, setPetName] = useState("");
  const [petAge, setPetAge] = useState("");
  const [petType, setPetType] = useState(""); 
  const [petBreed, setPetBreed] = useState(""); 
  const [petGender, setPetGender] = useState("");
  const [listingType, setListingType] = useState("Mating");
  
  // Files
  const [petImage, setPetImage] = useState(null);
  const [petImagePreview, setPetImagePreview] = useState(null);
  const [certificateFile, setCertificateFile] = useState(null); 

  // State
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const router = useRouter();
  const { user, userData, loading: authLoading } = useAuth(); // Using your custom auth

  // Auth redirect
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/Login");
    }
  }, [user, authLoading, router]);

  // All possible breeds (for the dropdown)
  const petBreeds = {
    Dog: ["Labrador Retriever", "German Shepherd", "Golden Retriever", "Bulldog", "Poodle", "Beagle", "Other"],
    Cat: ["Persian", "Siamese", "Maine Coon", "Bengal", "British Shorthair", "Ragdoll", "Other"],
    Rabbit: ["Holland Lop", "Netherland Dwarf", "Mini Rex", "Lionhead", "Flemish Giant", "Other"],
    Bird: ["Parrot", "Canary", "Cockatiel", "Lovebird", "Finch", "Other"],
    Other: ["Hamster", "Guinea Pig", "Turtle", "Fish", "Snake", "Mixed", "Unknown"],
  };

  const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (err) => reject(err);
    });

  // --- Handle Image Selection and AI Analysis ---
  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // 1. Set file and preview
    setPetImage(file);
    setPetImagePreview(URL.createObjectURL(file));
    
    // 2. Start AI analysis
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const imageB64 = await fileToBase64(file);
      const res = await fetch("/api/analyze-pet-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: imageB64, mimeType: file.type }),
      });
      
      const data = await res.json(); // Expecting { type: "Dog", breed: "Pug" }

      if (res.ok) {
        // --- CORRECTLY PARSE JSON RESPONSE ---
        
        // 1. Normalize Type
        let detectedType = data.type || "Other";
        detectedType = detectedType.charAt(0).toUpperCase() + detectedType.slice(1).toLowerCase();

        const validTypes = Object.keys(petBreeds);
        if (!validTypes.includes(detectedType)) {
            detectedType = "Other";
        }

        // 2. Get Breed
        let detectedBreed = data.breed || "Unknown";

        // Set State
        setPetType(detectedType);
        setPetBreed(detectedBreed);
        
        setStep(2); 
      } else {
        throw new Error(data.error || "AI analysis failed.");
      }
    } catch (err) {
      console.error(err);
      // If AI fails, just go to step 2 with defaults
      setError("Could not auto-detect pet. Please enter details manually.");
      setPetType(""); 
      setPetBreed("");
      setStep(2);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // UPDATED: Use certificateFile state
  const handleCertificateChange = (e) => {
    setCertificateFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (
      !petName.trim() ||
      !petAge ||
      !petType ||
      !petBreed ||
      !petGender ||
      !certificateFile || // Check for the new file state
      !petImage 
    ) {
      setLoading(false);
      return setError("Please fill all fields properly and upload both pet image and certificate.");
    }

    if (!user || !userData) { // Ensure user data is available
      setLoading(false);
      return router.push("/Login");
    }

    try {
      const certificateBase64 = await fileToBase64(certificateFile); // Use certificateFile
      const petImageBase64 = await fileToBase64(petImage);
      const imagesBase64 = [petImageBase64]; 

      // Get the owner's name from userData for verification comparison
      const ownerName = userData.name; 

      const res = await fetch("/api/pet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: petName,
          age: petAge, // Send as string/number as before
          type: petType,
          breed: petBreed,
          gender: petGender,
          listingType: listingType,
          
          certificateBase64, // Send base64 for Certificate
          certificateMimeType: certificateFile.type, // Send MIME type
          
          imagesBase64, 
          ownerId: user.uid,
          ownerName: ownerName, // NEW: Send owner's full name for AI verification
        }),
      });

      const data = await res.json();
      if (res.status === 201) {
        // Redirect to profile creation, as before
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

  if (authLoading || !user) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="loader">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#E2F4EF] p-4 flex justify-center items-center relative pt-20">
      <div className="animated-background">
        {[...Array(7)].map((_, i) => (
          <div key={i} className="particle"></div>
        ))}
      </div>

      <div className="w-full max-w-md my-8 glass-container shadow-2xl z-10 overflow-y-auto max-h-[90vh]">
        <h1 className="text-primary mb-8 text-center text-3xl font-bold">REGISTER NEW PET</h1>

        {error && (
          <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-lg relative mb-4" role="alert">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        {/* --- STEP 1: Image Upload --- */}
        {step === 1 && (
        <div className="w-full flex flex-col items-center">
          <label className="cursor-pointer w-full h-64 bg-gray-100/50 rounded-xl border-2 border-dashed border-gray-400/80 flex items-center justify-center text-gray-600 hover:bg-gray-200/50 hover:border-gray-500/80 transition-all duration-300 relative overflow-hidden">
            {petImagePreview ? (
              <Image
                src={petImagePreview}
                alt="Pet preview"
                fill
                className="object-cover rounded-xl"
              />
            ) : (
              <span className="text-center font-semibold px-4">
                Click to upload your pet's main image
                <br/>
                <span className="text-sm font-normal">(AI will auto-detect breed)</span>
              </span>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="sr-only"
              disabled={isAnalyzing}
            />
          </label>

          {isAnalyzing && (
            <div className="mt-4 flex items-center gap-2 text-primary font-semibold">
              <div className="w-5 h-5 border-t-2 border-b-2 border-primary rounded-full animate-spin"></div>
              Analyzing image...
            </div>
          )}
        </div>
        )}

        {/* --- STEP 2: Details Form (Conditional) --- */}
        {step === 2 && (
          <form onSubmit={handleSubmit} className="w-full flex flex-col mt-6">
            
            {/* --- FIX START: Add the Image Preview to Step 2 --- */}
            {petImagePreview && (
                <div className="relative w-full h-48 mb-6 rounded-xl overflow-hidden shadow-lg border-2 border-gray-200">
                    <Image
                        src={petImagePreview}
                        alt="Pet preview"
                        fill
                        className="object-cover"
                    />
                </div>
            )}
            {/* --- FIX END: Add the Image Preview to Step 2 --- */}
            

            <div className="p-3 mb-4 bg-green-100/80 border border-green-300 rounded-lg text-center shadow-sm">
              <span className="text-green-800 font-semibold">
                AI Detected: {petType} - {petBreed}
              </span>
            </div>

            {/* Listing Type */}
            <div className="input-style p-0 mb-4 bg-white/90">
              <select
                value={listingType}
                onChange={(e) => setListingType(e.target.value)}
                className="w-full p-3 bg-transparent cursor-pointer outline-none text-primary font-bold"
                required
              >
                <option value="Mating">List for Mating</option>
                <option value="Adoption">List for Adoption</option>
              </select>
            </div>

            <input
              type="text"
              value={petName}
              onChange={(e) => setPetName(e.target.value)}
              className="input-style"
              placeholder="Pet Name"
              required
            />

            <input
              type="number"
              value={petAge}
              onChange={(e) => setPetAge(e.target.value)}
              className="input-style"
              placeholder="Age (Years)"
              min="0"
              required
            />

            {/* --- PET TYPE DROPDOWN --- */}
            <div className="input-style p-0 mb-4">
              <select
                value={petType}
                onChange={(e) => {
                  setPetType(e.target.value);
                  // Reset breed if user manually changes type
                  setPetBreed(petBreeds[e.target.value]?.[0] || "Other"); 
                }}
                className="w-full p-3 bg-transparent cursor-pointer outline-none text-primary"
                required
              >
                <option value="" disabled>Select Pet Type *</option>
                {Object.keys(petBreeds).map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* --- PET BREED DROPDOWN --- */}
            <div className="input-style p-0 mb-4">
              <select
                value={petBreed}
                onChange={(e) => setPetBreed(e.target.value)}
                className="w-full p-3 bg-transparent cursor-pointer outline-none text-primary"
                required
              >
                <option value="" disabled>Select Pet Breed *</option>
                
                {/* List Standard Breeds */}
                {petType && (petBreeds[petType] || ["Other"]).map((breed) => (
                    <option key={breed} value={breed}>{breed}</option>
                ))}
                
                {/* ADD CUSTOM OPTION IF AI DETECTED A BREED NOT IN THE LIST */}
                {petBreed && 
                 (!petBreeds[petType] || !petBreeds[petType].includes(petBreed)) && (
                   <option value={petBreed}>{petBreed}</option>
                )}
              </select>
            </div>

            <div className="input-style p-0 mb-4">
              <select
                value={petGender}
                onChange={(e) => setPetGender(e.target.value)}
                className="w-full p-3 bg-transparent cursor-pointer outline-none text-primary"
                required
              >
                <option value="" disabled>Select Pet Gender *</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>

            <div className="mb-4">
              <span className="self-start text-sm font-semibold mb-1 block text-gray-700">
                Health/Vaccination Certificate (PDF/Image)
              </span>
              <p className="text-xs text-gray-500 mb-1">
                Owner name on certificate must match your registered name: **{userData?.name || "Loading..."}**
              </p>
              <label className="cursor-pointer w-full bg-[#4A90E2] text-white text-center py-3 rounded-xl hover:bg-[#3A75B9] transition shadow-md hover:shadow-lg flex items-center justify-center">
                <span className="truncate max-w-[80%]">
                  {certificateFile ? `Selected: ${certificateFile.name}` : "Upload Certificate (Required)"}
                </span>
                <input
                  type="file"
                  // UPDATED: Allow PDF and images
                  accept="image/*,application/pdf"
                  onChange={handleCertificateChange}
                  className="sr-only"
                  required
                />
              </label>
            </div>

            <button type="submit" className="mt-4 btn-primary" disabled={loading}>
              {loading ? "Registering..." : "Next: Create AI Profile"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
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
  const [petType, setPetType] = useState(""); // Will be auto-filled
  const [petBreed, setPetBreed] = useState(""); // Will be auto-filled
  const [petGender, setPetGender] = useState("");
  const [listingType, setListingType] = useState("Mating");
  
  // Files
  const [petImage, setPetImage] = useState(null);
  const [petImagePreview, setPetImagePreview] = useState(null);
  const [certificate, setCertificate] = useState(null);

  // State
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // Auth redirect
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/Login");
    }
  }, [user, authLoading, router]);

  // All possible breeds (for the dropdown, in case AI is wrong)
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

  // --- NEW: Handle Image Selection and AI Analysis ---
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
        body: JSON.stringify({ imageB64, mimeType: file.type }),
      });
      
      const data = await res.json();

      if (res.ok) {
        // 3. Auto-fill form and move to step 2
        setPetType(data.type || "Other");
        setPetBreed(data.breed || "Other");
        setStep(2); // Move to the details form
      } else {
        throw new Error(data.error || "AI analysis failed, please enter manually.");
      }
    } catch (err) {
      console.error(err);
      setError("Analysis failed. Please select a pet type and breed manually.");
      // Still move to step 2, but fields will be empty
      setPetType("Other"); // Default to Other
      setPetBreed("Other");
      setStep(2);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCertificateChange = (e) => {
    setCertificate(e.target.files[0]);
  };

  // --- UPDATED: HandleSubmit ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (
      !petName.trim() ||
      petAge === "" ||
      !petType ||
      !petBreed ||
      !petGender ||
      !certificate ||
      !petImage // Check for the single image
    ) {
      setLoading(false);
      return setError("Please fill all fields properly and upload files.");
    }

    if (!user) {
      setLoading(false);
      return router.push("/Login");
    }

    try {
      // We need Base64 for all files
      const certificateBase64 = await fileToBase64(certificate);
      // The `petImage` is now the *only* image at this step.
      // Your backend API `app/api/pet/route.js` expects `imagesBase64` as an *array*.
      const petImageBase64 = await fileToBase64(petImage);
      const imagesBase64 = [petImageBase64]; // Send it as an array

      const res = await fetch("/api/pet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: petName,
          age: parseInt(petAge, 10),
          type: petType,
          breed: petBreed,
          gender: petGender,
          listingType: listingType,
          certificateBase64,
          imagesBase64, // Send the array
          ownerId: user.uid,
          // NOTE: Temperament and EnergyLevel are NOT sent.
        }),
      });

      const data = await res.json();
      if (res.status === 201) {
        // --- NEW: Redirect to questionnaire ---
        // data.message will be "Pet added successfully! Verification is in progress."
        // data.petId is what we need
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
        <div className="w-full flex flex-col items-center">
          <label className="cursor-pointer w-full h-64 bg-gray-100/50 rounded-xl border-2 border-dashed border-gray-400/80 flex items-center justify-center text-gray-600 hover:bg-gray-200/50 hover:border-gray-500/80 transition-all duration-300">
            {petImagePreview ? (
              <Image
                src={petImagePreview}
                alt="Pet preview"
                width={250}
                height={250}
                className="object-cover h-full w-full rounded-xl"
              />
            ) : (
              <span className="text-center font-semibold">
                Click to upload your pet's main image
                <br/>
                (This will be analyzed by AI)
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

        {/* --- STEP 2: Details Form (Conditional) --- */}
        {step === 2 && (
          <form onSubmit={handleSubmit} className="w-full flex flex-col mt-6">
            <div className="p-3 mb-4 bg-green-100/50 border border-green-300/80 rounded-lg text-center">
              <span className="text-green-800 font-semibold">
                AI Result: {petType} - {petBreed}
              </span>
              <br/>
              <span className="text-sm text-gray-600">You can correct this if needed.</span>
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

            {/* Pet Name */}
            <input
              type="text"
              value={petName}
              onChange={(e) => setPetName(e.target.value)}
              className="input-style"
              placeholder="Pet Name"
              required
            />

            {/* Pet Age */}
            <input
              type="number"
              value={petAge}
              onChange={(e) => setPetAge(e.target.value)}
              className="input-style"
              placeholder="Age (Years)"
              min="0"
              required
            />

            {/* Pet Type (Auto-filled) */}
            <div className="input-style p-0 mb-4">
              <select
                value={petType}
                onChange={(e) => {
                  setPetType(e.target.value);
                  setPetBreed(petBreeds[e.target.value]?.[0] || "Other"); // Reset breed on type change
                }}
                className="w-full p-3 bg-transparent cursor-pointer outline-none text-primary"
                required
              >
                <option value="" disabled>Select Pet Type *</option>
                {Object.keys(petBreeds).map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* Pet Breed (Auto-filled) */}
            <div className="input-style p-0 mb-4">
              <select
                value={petBreed}
                onChange={(e) => setPetBreed(e.target.value)}
                className="w-full p-3 bg-transparent cursor-pointer outline-none text-primary"
                required
              >
                <option value="" disabled>Select Pet Breed *</option>
                {petType &&
                  (petBreeds[petType] || ["Other"]).map((breed) => (
                    <option key={breed} value={breed}>
                      {breed}
                    </option>
                  ))}
              </select>
            </div>

            {/* Pet Gender */}
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

            {/* Certificate Upload */}
            <div className="mb-4">
              <span className="self-start text-sm font-semibold mb-1 block text-gray-700">
                Health Certificate (PDF/Image)
              </span>
              <label className="cursor-pointer w-full bg-[#4A90E2] text-white text-center py-3 rounded-xl hover:bg-[#3A75B9] transition shadow-md hover:shadow-lg flex items-center justify-center">
                <span className="truncate max-w-[80%]">
                  {certificate ? `Selected: ${certificate.name}` : "Upload Certificate (Required)"}
                </span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleCertificateChange}
                  className="sr-only"
                  required
                />
              </label>
            </div>

            {/* Submit */}
            <button type="submit" className="mt-4 btn-primary" disabled={loading}>
              {loading ? "Registering..." : "Next: Create AI Profile"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
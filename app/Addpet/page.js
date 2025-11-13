// app/Addpet/page.js
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../auth-provider"; // <-- FIXED: Correct import and path
import Image from "next/image"; // <-- NEW: To show image previews

export default function AddPet() {
  // --- All your original states ---
  const [petName, setPetName] = useState("");
  const [petAge, setPetAge] = useState("");
  const [petType, setPetType] = useState("");
  const [petBreed, setPetBreed] = useState("");
  const [petGender, setPetGender] = useState("");
  const [petTemperament, setPetTemperament] = useState("Friendly");
  const [petEnergyLevel, setPetEnergyLevel] = useState("Medium");
  const [listingType, setListingType] = useState("Mating");
  const [certificate, setCertificate] = useState(null);
  const [petImages, setPetImages] = useState([]);
  
  // --- UPDATED: Replaced 'message' with 'error' and 'successMessage' for better UI ---
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // --- NEW: Get auth state from the provider ---
  const { user, loading: authLoading } = useAuth();

  // --- NEW: Auth redirect effect ---
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/Login");
    }
  }, [user, authLoading, router]);

  // --- Your original handlers (unchanged) ---
  const handleFileChange = (e) => setCertificate(e.target.files[0]);
  const handleImagesChange = (e) => {
    const files = Array.from(e.target.files || []);
    const next = [...petImages, ...files].slice(0, 5); // cap at 5
    setPetImages(next);
  };

  const petBreeds = {
    Dog: ["Labrador Retriever", "German Shepherd", "Golden Retriever", "Bulldog", "Poodle", "Beagle"],
    Cat: ["Persian", "Siamese", "Maine Coon", "Bengal", "British Shorthair", "Ragdoll"],
    Rabbit: ["Holland Lop", "Netherland Dwarf", "Mini Rex", "Lionhead", "Flemish Giant"],
    Bird: ["Parrot", "Canary", "Cockatiel", "Lovebird", "Finch"],
    Other: ["Hamster", "Guinea Pig", "Turtle", "Fish", "Snake"],
  };

  const petTemperaments = ["Friendly", "Calm", "Playful", "Shy", "Energetic", "Independent", "Curious", "Other"];
  const petEnergyLevels = ["Low", "Medium", "High"];

  const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (err) => reject(err);
    });

  // --- UPDATED: handleSubmit with new logic ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    if (
      !petName.trim() ||
      petAge === "" ||
      !petType ||
      !petBreed ||
      !petGender ||
      !certificate ||
      petImages.length === 0
    ) {
      setLoading(false);
      return setError("Please fill all fields properly and upload files."); // Use new error state
    }

    if (petImages.length > 5) {
      setLoading(false);
      return setError("Please upload a maximum of 5 images."); // Use new error state
    }

    // --- UPDATED: Use auth hook user ---
    if (!user) {
      setLoading(false);
      setError("You must be logged in to add a pet.");
      return router.push("/Login");
    }

    try {
      const certificateBase64 = await fileToBase64(certificate);
      const imagesBase64 = await Promise.all(petImages.map(fileToBase64));

      const res = await fetch("/api/pet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: petName,
          age: parseInt(petAge, 10),
          type: petType,
          breed: petBreed,
          gender: petGender,
          temperament: petTemperament,
          energyLevel: petEnergyLevel,
          listingType: listingType,
          certificateBase64,
          imagesBase64,
          ownerId: user.uid,
        }),
      });

      const data = await res.json();
      if (res.status === 201) {
        // --- NEW: Show success message, clear form, and DO NOT redirect ---
        setSuccessMessage(data.message); // This message comes from the backend
        setPetName("");
        setPetAge("");
        setPetType("");
        setPetBreed("");
        setPetGender("");
        setPetTemperament("Friendly");
        setPetEnergyLevel("Medium");
        setListingType("Mating");
        setCertificate(null);
        setPetImages([]);
        e.target.reset(); // Resets file inputs
        // router.push("/Profile"); // We no longer redirect
      } else {
        setError(data.error || "Something went wrong"); // Use new error state
      }
    } catch (err) {
      console.error(err);
      setError("Server error: " + err.message); // Use new error state
    } finally {
      setLoading(false);
    }
  };

  // --- NEW: Show loading if auth is happening ---
  if (authLoading || !user) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="loader">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#E2F4EF] p-4 flex justify-center items-center relative pt-20"> {/* Added pt-20 for navbar */}
      <div className="animated-background">
        {[...Array(7)].map((_, i) => (
          <div key={i} className="particle"></div>
        ))}
      </div>

      <div className="w-full max-w-md my-8 glass-container shadow-2xl z-10 overflow-y-auto max-h-[90vh]">
        <h1 className="text-primary mb-8 text-center text-3xl font-bold">REGISTER NEW PET</h1>

        {/* --- NEW: Success and Error Message Display --- */}
        {successMessage && (
          <div className="bg-green-100 border border-green-300 text-green-700 px-4 py-3 rounded-lg relative mb-4" role="alert">
            <strong className="font-bold">Success! </strong>
            <span className="block sm:inline">{successMessage}</span>
            <button 
              onClick={() => router.push('/Profile')} 
              className="mt-2 bg-green-200 text-green-800 font-semibold py-1 px-3 rounded-lg hover:bg-green-300"
            >
              Go to Profile
            </button>
          </div>
        )}
        {error && (
          <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-lg relative mb-4" role="alert">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        {/* --- END NEW --- */}

        <form onSubmit={handleSubmit} className="w-full flex flex-col">
          {/* Listing Type Dropdown */}
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

          {/* Pet Type Select */}
          <div className="input-style p-0 mb-4">
            <select
              value={petType}
              onChange={(e) => {
                setPetType(e.target.value);
                setPetBreed("");
              }}
              className="w-full p-3 bg-transparent cursor-pointer outline-none text-primary"
              required
            >
              <option value="" disabled className="text-gray-500">
                Select Pet Type *
              </option>
              {Object.keys(petBreeds).map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* Pet Breed Select */}
          <div className="input-style p-0 mb-4">
            <select
              value={petBreed}
              onChange={(e) => setPetBreed(e.target.value)}
              disabled={!petType}
              className={`w-full p-3 bg-transparent cursor-pointer outline-none text-primary ${
                !petType ? "opacity-50 cursor-not-allowed" : ""
              }`}
              required
            >
              <option value="" disabled className="text-gray-500">
                Select Pet Breed *
              </option>
              {petType &&
                petBreeds[petType].map((breed) => (
                  <option key={breed} value={breed}>
                    {breed}
                  </option>
                ))}
            </select>
          </div>

          {/* Pet Gender Select */}
          <div className="input-style p-0 mb-4">
            <select
              value={petGender}
              onChange={(e) => setPetGender(e.target.value)}
              className="w-full p-3 bg-transparent cursor-pointer outline-none text-primary"
              required
            >
              <option value="" disabled className="text-gray-500">
                Select Pet Gender *
              </option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>

          {/* Temperament */}
          <div className="input-style p-0 mb-4">
            <select
              value={petTemperament}
              onChange={(e) => setPetTemperament(e.target.value)}
              className="w-full p-3 bg-transparent cursor-pointer outline-none text-primary"
              required
            >
              <option value="" disabled className="text-gray-500">
                Select Pet Temperament *
              </option>
              {petTemperaments.map((temp) => (
                <option key={temp} value={temp}>
                  {temp}
                </option>
              ))}
            </select>
          </div>

          {/* Energy Level */}
          <div className="input-style p-0 mb-4">
            <select
              value={petEnergyLevel}
              onChange={(e) => setPetEnergyLevel(e.target.value)}
              className="w-full p-3 bg-transparent cursor-pointer outline-none text-primary"
              required
            >
              <option value="" disabled className="text-gray-500">
                Select Energy Level *
              </option>
              {petEnergyLevels.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </div>

          {/* Certificate Upload */}
          <div className="mb-4">
            <span className="self-start text-sm font-semibold mb-1 block text-gray-700">
              Health Certificate (PDF/Image)
            </span>
            <label className="cursor-pointer w-full bg-[#4A90E2] text-white text-center py-3 rounded-xl hover:bg-[#3A75B9] transition shadow-md hover:shadow-lg flex items-center justify-center">
              <span className="truncate max-w-[80%]">
                {certificate ? `Selected: ${certificate.name}` : "Upload Certificate File (Required)"}
              </span>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={handleFileChange}
                className="sr-only"
                required
              />
            </label>
          </div>

          {/* Pet Images Upload */}
          <div className="mb-4">
            <span className="self-start text-sm font-semibold mb-1 block text-gray-700">Pet Images (Max 5)</span>
            <label className="cursor-pointer w-full bg-[#50E3C2] text-primary text-center py-3 rounded-xl hover:bg-[#3FCCB4] transition shadow-md hover:shadow-lg flex items-center justify-center">
              <span className="truncate max-w-[80%]">
                {petImages.length > 0 ? `${petImages.length} image(s) selected` : "Upload Pet Images (Required)"}
              </span>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImagesChange}
                className="sr-only"
                required
              />
            </label>
          </div>

          {/* --- UPDATED: Image names preview --- */}
          {petImages.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4 p-2 bg-gray-100/50 rounded-lg max-h-24 overflow-y-auto border border-gray-200">
              {petImages.map((img, idx) => (
                <span key={idx} className="text-xs text-primary bg-gray-200/70 px-2 py-1 rounded-full">
                  {img.name}
                </span>
              ))}
            </div>
          )}

          {/* Submit */}
          <button type="submit" className="mt-4 btn-primary" disabled={loading}>
            {loading ? "Registering..." : "Register Pet"}
          </button>

          {/* --- REMOVED: Old {message} display --- */}

        </form>
      </div>
    </div>
  );
}

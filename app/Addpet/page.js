// app/Addpet/page.js
"use client";
import { useState } from "react";
// ... (imports remain the same)

export default function AddPet() {
  // ADDED: New state for pet gender
  const [petName, setPetName] = useState("");
  const [petAge, setPetAge] = useState("");
  const [petType, setPetType] = useState("");
  const [petBreed, setPetBreed] = useState("");
  const [petGender, setPetGender] = useState(""); // <--- NEW STATE
  const [certificate, setCertificate] = useState(null);
  const [petImages, setPetImages] = useState([]);
  const [message, setMessage] = useState("");
  const router = useRouter();

  const handleFileChange = (e) => setCertificate(e.target.files[0]);
  const handleImagesChange = (e) => setPetImages([...e.target.files]);

  // ... (petBreeds object remains the same)

  const handleSubmit = async (e) => {
    e.preventDefault();

    // UPDATED: Check for petGender
    if (!petName.trim() || petAge === "" || !petType || !petBreed || !petGender || !certificate || petImages.length === 0) {
      console.log({ petName, petAge, petType, petBreed, petGender, certificate, petImages });
      return alert("Please fill all fields properly, including gender.");
    }
    // ... (rest of validation)

    try {
      const certificateBase64 = await fileToBase64(certificate);
      const imagesBase64 = await Promise.all(petImages.map(fileToBase64));

      const res = await fetch("/api/pet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: petName,
          age: parseInt(petAge),
          type: petType,
          breed: petBreed,
          gender: petGender, // <--- SENT TO API
          certificateBase64,
          imagesBase64,
          ownerId: user.uid,
        }),
      });

      // ... (rest of API call logic)
    } catch (err) {
      // ... (error handling)
    }
  };

  return (
    <div className="w-screen h-screen overflow-hidden relative bg-[#F4F7F9]"> {/* Updated BG */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 sm:shadow-2xl sm:bg-white p-10 rounded-2xl flex flex-col items-center sm:w-96 w-80">
        <h1 className="text-[#333333] mb-6 text-center text-3xl font-bold">ADD PET</h1>

        <form onSubmit={handleSubmit} className="w-full flex flex-col">
          {/* Pet Name */}
          <label className="self-start text-lg font-semibold mb-1 text-primary">Pet Name</label>
          <input
            type="text"
            value={petName}
            onChange={(e) => setPetName(e.target.value)}
            className="input-style" // Replaced old classes with new utility class
          />

          {/* Pet Age */}
          <label className="self-start text-lg font-semibold mb-1 text-primary">Pet Age</label>
          <input
            type="number"
            value={petAge}
            onChange={(e) => setPetAge(e.target.value)}
            className="input-style" // Replaced old classes with new utility class
          />

          {/* Pet Type */}
          <label className="self-start text-lg font-semibold mb-1 text-primary">Pet Type</label>
          <select
            value={petType}
            onChange={(e) => {
              setPetType(e.target.value);
              setPetBreed("");
            }}
            className="input-style cursor-pointer"
          >
            <option value="">Select Type</option>
            {Object.keys(petBreeds).map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>

          {/* Pet Breed */}
          <label className="self-start text-lg font-semibold mb-1 text-primary">Pet Breed</label>
          <select
            value={petBreed}
            onChange={(e) => setPetBreed(e.target.value)}
            disabled={!petType}
            className={`input-style cursor-pointer ${
              !petType ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            <option value="">Select Breed</option>
            {petType &&
              petBreeds[petType].map((breed) => (
                <option key={breed} value={breed}>
                  {breed}
                </option>
              ))}
          </select>
          
          {/* ADDED: Pet Gender */}
          <label className="self-start text-lg font-semibold mb-1 text-primary">Pet Gender</label>
          <select
            value={petGender}
            onChange={(e) => setPetGender(e.target.value)}
            className="input-style cursor-pointer"
            required
          >
            <option value="">Select Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>

          {/* Certificate */}
          <label className="self-start text-lg font-semibold mb-1 text-primary">Certificate (PDF/Image)</label>
          <label className="cursor-pointer w-full bg-[#4A90E2] text-white text-center py-3 rounded-xl mb-4 hover:bg-[#3A75B9] transition shadow-md hover:shadow-lg">
            {certificate ? `Selected: ${certificate.name}` : "Select Certificate File"}
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={handleFileChange}
              className="sr-only"
            />
          </label>

          {/* Pet Images */}
          <label className="self-start text-lg font-semibold mb-1 text-primary">Pet Images (Max 5)</label>
          <label className="cursor-pointer w-full bg-[#50E3C2] text-[#333333] text-center py-3 rounded-xl mb-4 hover:bg-[#3FCCB4] transition shadow-md hover:shadow-lg">
            {petImages.length > 0 ? `${petImages.length} images selected` : "Select Pet Images"}
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleImagesChange}
              className="sr-only"
            />
          </label>

          {/* Image names preview */}
          {petImages.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4 p-2 bg-gray-100 rounded-lg max-h-24 overflow-y-auto">
              {petImages.map((img, idx) => (
                <span key={idx} className="text-xs text-primary bg-gray-200 px-2 py-1 rounded-full">
                  {img.name}
                </span>
              ))}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            className="mt-4 btn-primary" // Use utility class
          >
            Register Pet
          </button>

          {message && <p className="mt-2 text-center text-sm text-[#4A90E2]">{message}</p>}
        </form>
      </div>
    </div>
  );
}
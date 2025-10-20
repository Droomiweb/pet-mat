// app/Addpet/page.js
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "../lib/firebase";

export default function AddPet() {
  const [petName, setPetName] = useState("");
  const [petAge, setPetAge] = useState("");
  const [petType, setPetType] = useState("");
  const [petBreed, setPetBreed] = useState("");
  const [petGender, setPetGender] = useState("");
  const [certificate, setCertificate] = useState(null);
  const [petImages, setPetImages] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleFileChange = (e) => setCertificate(e.target.files[0]);
  const handleImagesChange = (e) => setPetImages([...e.target.files]);

  const petBreeds = {
    Dog: ["Labrador Retriever", "German Shepherd", "Golden Retriever", "Bulldog", "Poodle", "Beagle"],
    Cat: ["Persian", "Siamese", "Maine Coon", "Bengal", "British Shorthair", "Ragdoll"],
    Rabbit: ["Holland Lop", "Netherland Dwarf", "Mini Rex", "Lionhead", "Flemish Giant"],
    Bird: ["Parrot", "Canary", "Cockatiel", "Lovebird", "Finch"],
    Other: ["Hamster", "Guinea Pig", "Turtle", "Fish", "Snake"],
  };

  const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (err) => reject(err);
    });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!petName.trim() || petAge === "" || !petType || !petBreed || !petGender || !certificate || petImages.length === 0) {
      setLoading(false);
      return setMessage("Please fill all fields properly and upload files.");
    }

    const user = auth.currentUser;
    if (!user) {
        setLoading(false);
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
          age: parseInt(petAge),
          type: petType,
          breed: petBreed,
          gender: petGender,
          certificateBase64,
          imagesBase64,
          ownerId: user.uid,
        }),
      });

      const data = await res.json();
      if (res.status === 201) {
        alert("Pet added successfully!");
        setPetName("");
        setPetAge("");
        setPetType("");
        setPetBreed("");
        setPetGender("");
        setCertificate(null);
        setPetImages([]);
        setMessage("Pet registered successfully!");
        router.push("/Profile");
      } else {
        setMessage(data.error || "Something went wrong");
      }
    } catch (err) {
      console.error(err);
      setMessage("Server error: " + err.message);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#E2F4EF] p-4 flex justify-center items-center relative">
        {/* Animated background particles */}
        <div className="animated-background">
            <div className="particle"></div>
            <div className="particle"></div>
            <div className="particle"></div>
            <div className="particle"></div>
            <div className="particle"></div>
            <div className="particle"></div>
            <div className="particle"></div>
        </div>

        <div className="w-full max-w-md my-8 glass-container p-6 sm:p-10 rounded-2xl flex flex-col items-center shadow-2xl z-10 overflow-y-auto max-h-[90vh]">
          <h1 className="text-primary mb-8 text-center text-3xl font-bold">REGISTER NEW PET</h1>

          <form onSubmit={handleSubmit} className="w-full flex flex-col">
            
            {/* Pet Name */}
            <input
              type="text"
              value={petName}
              onChange={(e) => setPetName(e.target.value)}
              className="input-style" 
              placeholder="Pet Name" // ADDED: Placeholder
              required
            />

            {/* Pet Age */}
            <input
              type="number"
              value={petAge}
              onChange={(e) => setPetAge(e.target.value)}
              className="input-style" 
              placeholder="Age (Years)" // ADDED: Placeholder
              required
            />

            {/* Pet Type Select */}
            <div className="input-style p-0 mb-4"> {/* Use input-style wrapper */}
              <select
                value={petType}
                onChange={(e) => {
                  setPetType(e.target.value);
                  setPetBreed("");
                }}
                className="w-full p-3 bg-transparent cursor-pointer outline-none text-primary"
                required
              >
                <option value="" disabled className="text-gray-500">Select Pet Type *</option>
                {Object.keys(petBreeds).map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* Pet Breed Select */}
            <div className="input-style p-0 mb-4"> {/* Use input-style wrapper */}
              <select
                value={petBreed}
                onChange={(e) => setPetBreed(e.target.value)}
                disabled={!petType}
                className={`w-full p-3 bg-transparent cursor-pointer outline-none text-primary ${
                  !petType ? "opacity-50 cursor-not-allowed" : ""
                }`}
                required
              >
                <option value="" disabled className="text-gray-500">Select Pet Breed *</option>
                {petType &&
                  petBreeds[petType].map((breed) => (
                    <option key={breed} value={breed}>
                      {breed}
                    </option>
                  ))}
              </select>
            </div>
            
            {/* Pet Gender Select */}
            <div className="input-style p-0 mb-4"> {/* Use input-style wrapper */}
              <select
                value={petGender}
                onChange={(e) => setPetGender(e.target.value)}
                className="w-full p-3 bg-transparent cursor-pointer outline-none text-primary"
                required
              >
                <option value="" disabled className="text-gray-500">Select Pet Gender *</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>

            {/* Certificate Upload (Styled Button) */}
            <div className="mb-4">
              <span className="self-start text-sm font-semibold mb-1 block text-gray-700">Health Certificate (PDF/Image)</span>
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

            {/* Pet Images Upload (Styled Button) */}
            <div className="mb-4">
              <span className="self-start text-sm font-semibold mb-1 block text-gray-700">Pet Images (Max 5)</span>
              <label className="cursor-pointer w-full bg-[#50E3C2] text-primary text-center py-3 rounded-xl hover:bg-[#3FCCB4] transition shadow-md hover:shadow-lg flex items-center justify-center">
                <span className="truncate max-w-[80%]">
                  {petImages.length > 0 ? `${petImages.length} images selected` : "Upload Pet Images (Required)"}
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

            {/* Image names preview */}
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
            <button
              type="submit"
              className="mt-4 btn-primary" 
              disabled={loading}
            >
              {loading ? 'Registering...' : 'Register Pet'}
            </button>

            {message && <p className={`mt-2 text-center text-sm font-semibold ${message.includes("successfully") ? 'text-green-600' : 'text-red-500'}`}>{message}</p>}
          </form>
        </div>
    </div>
  );
}
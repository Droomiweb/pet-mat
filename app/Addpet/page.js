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
  const [certificate, setCertificate] = useState(null);
  const [petImages, setPetImages] = useState([]);
  const [message, setMessage] = useState("");
  const router = useRouter();

  const handleFileChange = (e) => setCertificate(e.target.files[0]);
  const handleImagesChange = (e) => {
    // Log the selected files to the console
    console.log("Selected image files:", e.target.files);
    setPetImages([...e.target.files]);
  };

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

    if (!petName.trim() || petAge === "" || !petType || !petBreed || !certificate || petImages.length === 0) {
      console.log({ petName, petAge, petType, petBreed, certificate, petImages });
      return alert("Please fill all fields properly.");
    }

    const user = auth.currentUser;
    if (!user) return alert("You must be logged in to add a pet");

    try {
      const certificateBase64 = await fileToBase64(certificate);
      // Log the base64 conversion result
      console.log("Certificate Base64:", certificateBase64);

      const imagesBase64 = await Promise.all(petImages.map(fileToBase64));
      // Log the images base64 conversion result
      console.log("Images Base64:", imagesBase64);

      const res = await fetch("/api/pet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: petName,
          age: parseInt(petAge),
          type: petType,
          breed: petBreed,
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
        setCertificate(null);
        setPetImages([]);
        setMessage("Pet added successfully!");
      } else {
        setMessage(data.error || "Something went wrong");
        // Log the full response for more details
        console.error("API response error:", data);
      }
    } catch (err) {
      console.error(err);
      setMessage("Server error: " + err.message);
    }
  };

  return (
    <div className="w-screen h-screen overflow-hidden relative bg-yellow-400">
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 sm:shadow-lg sm:bg-white/80 p-10 rounded-lg flex flex-col items-center sm:w-96 w-80">
        <h1 className="text-[#4F200D] mb-6 text-center text-3xl font-bold">ADD PET</h1>

        <form onSubmit={handleSubmit} className="w-full flex flex-col">
          {/* Pet Name */}
          <label className="self-start text-xl mb-1">Pet Name</label>
          <input
            type="text"
            value={petName}
            onChange={(e) => setPetName(e.target.value)}
            className="w-full outline-none bg-transparent mb-4 border-b-4 border-[#4F200D] p-2"
          />

          {/* Pet Age */}
          <label className="self-start text-xl mb-1">Pet Age</label>
          <input
            type="number"
            value={petAge}
            onChange={(e) => setPetAge(e.target.value)}
            className="w-full outline-none bg-transparent mb-4 border-b-4 border-[#4F200D] p-2"
          />

          {/* Pet Type */}
          <label className="self-start text-xl mb-1">Pet Type</label>
          <select
            value={petType}
            onChange={(e) => {
              setPetType(e.target.value);
              setPetBreed("");
            }}
            className="w-full outline-none bg-transparent mb-4 border-b-4 border-[#4F200D] p-2"
          >
            <option value="">Select Type</option>
            {Object.keys(petBreeds).map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>

          {/* Pet Breed */}
          <label className="self-start text-xl mb-1">Pet Breed</label>
          <select
            value={petBreed}
            onChange={(e) => setPetBreed(e.target.value)}
            disabled={!petType}
            className={`w-full outline-none bg-transparent mb-4 border-b-4 border-[#4F200D] p-2 ${
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

          {/* Certificate */}
          <label className="self-start text-xl mb-1">Certificate</label>
          <label className="cursor-pointer w-full bg-[#4F200D] text-white text-center py-2 rounded-lg mb-4 hover:bg-orange-500 transition">
            Select Certificate
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={handleFileChange}
              className="sr-only"
            />
          </label>

          {/* Pet Images */}
          <label className="self-start text-xl mb-1">Pet Images</label>
          <label className="cursor-pointer w-full bg-[#4F200D] text-white text-center py-2 rounded-lg mb-4 hover:bg-orange-500 transition">
            Select Images
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleImagesChange}
              className="sr-only"
            />
          </label>

          {petImages.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {petImages.map((img, idx) => (
                <span key={idx} className="text-sm">{img.name}</span>
              ))}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            className="mt-4 bg-[#4F200D] text-white px-6 py-2 rounded-lg hover:bg-orange-500 transition"
          >
            Add Pet
          </button>

          {message && <p className="mt-2 text-center text-sm">{message}</p>}
        </form>
      </div>
    </div>
  );
}
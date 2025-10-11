"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "../lib/firebase";

export default function AddPet() {
  const [petName, setPetName] = useState("");
  const [petAge, setPetAge] = useState("");
  const [petBreed, setPetBreed] = useState("");
  const [certificate, setCertificate] = useState(null);
  const [petImages, setPetImages] = useState([]);
  const [message, setMessage] = useState("");
  const router = useRouter();

  const handleFileChange = (e) => setCertificate(e.target.files[0]);
  const handleImagesChange = (e) => setPetImages([...e.target.files]);

  // Convert file to Base64 for server upload
  const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (err) => reject(err);
    });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!petName || !petAge || !petBreed || !certificate || petImages.length === 0) {
      return alert("Please fill all fields");
    }

    const user = auth.currentUser;
    if (!user) return alert("You must be logged in to add a pet");

    try {
      // Convert files to Base64
      const certificateBase64 = await fileToBase64(certificate);
      const imagesBase64 = await Promise.all(petImages.map(fileToBase64));

      // Send JSON to API (server-side Cloudinary upload)
      const res = await fetch("/api/pet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: petName,
          age: parseInt(petAge),
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
        setPetBreed("");
        setCertificate(null);
        setPetImages([]);
        setMessage("Pet added successfully!");
      } else {
        setMessage(data.error || "Something went wrong");
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
          <label className="self-start text-xl mb-1">Pet Name</label>
          <input
            type="text"
            value={petName}
            onChange={(e) => setPetName(e.target.value)}
            className="w-full outline-none bg-transparent mb-4 border-b-4 border-[#4F200D] p-2"
          />

          <label className="self-start text-xl mb-1">Pet Age</label>
          <input
            type="number"
            value={petAge}
            onChange={(e) => setPetAge(e.target.value)}
            className="w-full outline-none bg-transparent mb-4 border-b-4 border-[#4F200D] p-2"
          />

          <label className="self-start text-xl mb-1">Pet Breed</label>
          <input
            type="text"
            value={petBreed}
            onChange={(e) => setPetBreed(e.target.value)}
            className="w-full outline-none bg-transparent mb-4 border-b-4 border-[#4F200D] p-2"
          />

          <label className="self-start text-xl mb-1">Certificate</label>
          <label className="cursor-pointer w-full bg-[#4F200D] text-white text-center py-2 rounded-lg mb-4 hover:bg-orange-500 transition">
            Select certificate
            <input
            type="file"
            accept="image/*,application/pdf"
            onChange={handleFileChange}
             multiple
              className="hidden"
          />
           
          </label>
         

          <label className="self-start text-xl mb-1">Pet Images</label>
          <label className="cursor-pointer w-full bg-[#4F200D] text-white text-center py-2 rounded-lg mb-4 hover:bg-orange-500 transition">
            Select Images
            <input type="file" multiple accept="image/*" onChange={handleImagesChange} className="hidden" />
          </label>

          {petImages.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {petImages.map((img, idx) => (
                <span key={idx} className="text-sm">{img.name}</span>
              ))}
            </div>
          )}

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

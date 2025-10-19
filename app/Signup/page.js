"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../lib/firebase";
import { useRouter } from "next/navigation";

export default function Signup() {
  const [userN, setUserN] = useState("");
  const [name, setName] = useState("");
  const [pass, setPass] = useState("");
  const [pass2, setPass2] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [location, setLocation] = useState({ lat: null, lng: null });
  const router = useRouter();

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Error getting location:", error);
          alert("Unable to get location. Please allow location access.");
        }
      );
    } else {
      alert("Geolocation is not supported by your browser.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!name) return alert("Please enter your name");
    if (!userN) return alert("Please enter username");
    if (!phone || phone.length !== 10) return alert("Enter a valid 10-digit phone number");
    if (!pass) return alert("Enter your password");
    if (pass !== pass2) return alert("Passwords do not match");
    if (!location.lat || !location.lng) return alert("Please share your location before signing up");

    try {
      // Firebase signup - password is used here and is handled securely by Firebase
      const userCredential = await createUserWithEmailAndPassword(auth, userN + "@example.com", pass);
      const user = userCredential.user;

      // Save extra fields in your database using the Firebase UID
      await fetch("/api/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, username: userN, phone, location, firebaseUid: user.uid }),
      });

      alert("Signup successful!");
      router.push("/Addpet");
    } catch (err) {
      console.error(err);
      setMessage(err.message);
    }
  };
return (
    <div className="w-screen h-screen overflow-hidden relative bg-[#F4F7F9]"> {/* Updated BG color */}
      {/* ... (Image component remains the same) ... */}

      {/* Updated card styling */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 sm:shadow-2xl sm:bg-white p-10 rounded-2xl flex flex-col items-center sm:w-96 w-80 border-t-8 border-[#4A90E2]">
        <h1 className="text-[#333333] mb-6 text-center text-4xl font-bold">CREATE ACCOUNT</h1>

        <form onSubmit={handleSubmit} className="w-full flex flex-col">
          <label className="self-start text-lg font-semibold mb-1 text-primary">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-style p-1" // Use utility class
          />

          <label className="self-start text-lg font-semibold mb-1 text-primary">Username</label>
          <input
            type="text"
            value={userN}
            onChange={(e) => setUserN(e.target.value)}
            className="input-style p-1" // Use utility class
          />

          <label className="self-start text-lg font-semibold mb-1 text-primary">Phone (10 digits)</label>
          <input
            type="number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="input-style p-1" // Use utility class
          />

          <label className="self-start text-lg font-semibold mb-1 text-primary">Password</label>
          <div className="relative w-full mb-2">
            <input
              type={showPass ? "text" : "password"}
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              className="input-style p-1 pr-12" // Use utility class
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-sm text-[#4A90E2] font-semibold hover:text-[#50E3C2] transition"
            >
              {showPass ? "Hide" : "Show"}
            </button>
          </div>

          <label className="self-start text-lg font-semibold mb-1 text-primary">Rewrite Password</label>
          <input
            type={showPass ? "text" : "password"}
            value={pass2}
            onChange={(e) => setPass2(e.target.value)}
            className="input-style p-1" // Use utility class
          />

          {/* Location Button */}
          <button
            type="button"
            onClick={getLocation}
            className="mt-4 mb-2 btn-secondary py-3 px-4" // Use utility class
          >
            {location.lat ? "Location Acquired! ✅" : "Share My Location"}
          </button>

          {/* Show location if available */}
          {location.lat && location.lng && (
            <p className="text-[#4A90E2] text-sm mb-4 font-medium text-center">
              Location set: Lat {location.lat.toFixed(4)}, Lng {location.lng.toFixed(4)}
            </p>
          )}

          <p className="mb-4 text-center text-primary">
            Already have an account? <Link className="text-[#4A90E2] font-semibold underline hover:text-[#50E3C2]" href="/Login">Login</Link>
          </p>

          {/* Submit button disabled until location is set (using utility class) */}
          <button
            type="submit"
            disabled={!location.lat || !location.lng}
            className={`mt-2 py-3 px-6 rounded-xl font-bold transition shadow-lg ${
              location.lat && location.lng
                ? "bg-[#4A90E2] hover:bg-[#3A75B9] text-white"
                : "bg-gray-400 cursor-not-allowed text-gray-700"
            }`}
          >
            Sign Up Now
          </button>

          {message && <p className="mt-2 text-center text-sm text-red-500 font-medium">{message}</p>}
        </form>
      </div>
    </div>
  );
}
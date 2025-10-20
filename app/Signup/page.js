// app/Signup/page.js
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
  const [location, setLocation] = useState({ lat: null, lng: null, city: "" });
  const router = useRouter();

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          let cityName = "Unknown";
          try {
              const geoRes = await fetch(
                  `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
              );
              const geoData = await geoRes.json();
              cityName = geoData.address.city || geoData.address.town || geoData.address.village || "Unknown";
          } catch (e) {
              console.error("Reverse geocoding failed", e);
          }
          
          setLocation({ lat, lng, city: cityName });
          setMessage(`Location set: ${cityName}`);

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
    setMessage("");

    if (!name) return setMessage("Please enter your name");
    if (!userN) return setMessage("Please enter username");
    if (!phone || phone.length !== 10) return setMessage("Enter a valid 10-digit phone number");
    if (!pass) return setMessage("Enter your password");
    if (pass !== pass2) return setMessage("Passwords do not match");
    if (!location.lat || !location.lng) return setMessage("Please share your location before signing up");

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, userN + "@example.com", pass);
      const user = userCredential.user;

      await fetch("/api/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            name, 
            username: userN, 
            phone, 
            location: { lat: location.lat, lng: location.lng, city: location.city },
            firebaseUid: user.uid 
        }),
      });

      alert("Signup successful! Now let's add your first pet.");
      router.push("/Addpet");
    } catch (err) {
      console.error(err);
      setMessage(err.message.includes("auth/email-already-in-use") ? "Username already taken." : err.message);
    }
  };

  return (
    <div className="auth-page-layout bg-[#E2F4EF] flex items-center justify-center relative">
      
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

      <div className="max-w-6xl w-full h-full sm:h-[90vh] sm:rounded-3xl glass-container overflow-hidden grid grid-cols-1 md:grid-cols-2 shadow-2xl z-10">

        {/* LEFT COLUMN: Visual/Illustration */}
        <div className="hidden md:flex flex-col justify-center items-center p-10 bg-[#50E3C2]/50">
          <h2 className="text-4xl font-extrabold text-white mb-6">Join PetLink</h2>
          <Image 
            src="/imgs/dog.jpg" 
            alt="Welcome Illustration" 
            width={250} 
            height={250} 
            className="w-48 h-auto rounded-full object-cover mb-4"
          />
          <p className="text-center text-white text-lg font-medium italic">
            Find the perfect companion for your pet!
          </p>
        </div>

        {/* RIGHT COLUMN: Signup Form */}
        <div className="flex flex-col justify-center items-center p-8 sm:p-12 w-full h-full overflow-y-auto">
          
          <h1 className="text-3xl font-extrabold text-primary mb-2 text-center">CREATE ACCOUNT</h1>
          <p className="text-xl text-gray-500 mb-8">Get Started</p>

          <form onSubmit={handleSubmit} className="w-full max-w-sm flex flex-col">
            
            {/* Input 1: Full Name */}
            <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                className="input-style" 
                placeholder="Full Name" // ADDED: Placeholder
                required 
            />

            {/* Input 2: Username */}
            <input 
                type="text" 
                value={userN} 
                onChange={(e) => setUserN(e.target.value)} 
                className="input-style" 
                placeholder="Username" // ADDED: Placeholder
                required 
            />

            {/* Input 3: Phone */}
            <input 
                type="number" 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)} 
                className="input-style" 
                placeholder="Phone (10 digits)" // ADDED: Placeholder
                required 
            />

            {/* Input 4: Password */}
            <div className="relative w-full mb-4">
              <input 
                type={showPass ? "text" : "password"} 
                value={pass} 
                onChange={(e) => setPass(e.target.value)} 
                className="input-style pr-12" 
                placeholder="Password" // ADDED: Placeholder
                required 
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-[#4A90E2] font-semibold hover:text-[#3A75B9] transition"
              >
                {showPass ? "Hide" : "Show"}
              </button>
            </div>

            {/* Input 5: Rewrite Password */}
            <input 
                type={showPass ? "text" : "password"} 
                value={pass2} 
                onChange={(e) => setPass2(e.target.value)} 
                className="input-style" 
                placeholder="Rewrite Password" // ADDED: Placeholder
                required 
            />

            {/* Location Button */}
            <button
              type="button"
              onClick={getLocation}
              className="mt-2 mb-2 btn-secondary py-3 px-4"
            >
              {location.lat ? `Location Set: ${location.city} ✅` : "Share My Location"}
            </button>

            {/* Show raw location if city is unknown */}
            {location.lat && !location.city && (
              <p className="text-[#4A90E2] text-xs mb-4 font-medium text-center">
                Location set: Lat {location.lat.toFixed(4)}, Lng {location.lng.toFixed(4)}
              </p>
            )}

            <p className="my-4 text-center text-primary text-sm">
              Already have an account? <Link className="text-[#4A90E2] font-bold underline hover:text-[#3A75B9]" href="/Login">Login</Link>
            </p>

            {/* Submit button */}
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

            {message && <p className={`mt-2 text-center text-sm font-semibold ${message.includes("successfully") ? 'text-green-600' : 'text-red-500'}`}>{message}</p>}
          </form>
        </div>
      </div>
    </div>
  );
}
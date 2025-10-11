"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../lib/firebase"; // make sure firebase.js exports auth
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

    try {
      // Firebase signup
      const userCredential = await createUserWithEmailAndPassword(auth, userN + "@example.com", pass);
      const user = userCredential.user;
      console.log("Signed up user:", user.uid);

      // Optional: save extra fields in your database
      await fetch("/api/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, username: userN, phone, location, firebaseUid: user.uid }),
      });

      alert("Signup successful!");
      router.push("/Addpet"); // redirect to Add Pet page
    } catch (err) {
      console.error(err);
      setMessage(err.message);
    }
  };

  return (
    <div className="w-screen h-screen overflow-hidden relative">
      <Image
        src="/imgs/topimg.png"
        alt="background"
        className="absolute sm:-left-96 -top-1/2 left-0 w-screen h-screen object-contain scale-125"
        width={200}
        height={200}
      />

      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 sm:shadow-lg sm:bg-white/80 p-10 rounded-lg flex flex-col items-center sm:w-96 w-80">
        <h1 className="text-[#4F200D] mb-6 text-center text-3xl font-bold">SIGN UP</h1>

        <form onSubmit={handleSubmit}>
          <label className="self-start text-xl mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full outline-none bg-transparent mb-2 border-b-4 border-[#4F200D] p-1"
          />

          <label className="self-start text-xl mb-1">Username</label>
          <input
            type="text"
            value={userN}
            onChange={(e) => setUserN(e.target.value)}
            className="w-full outline-none bg-transparent mb-2 border-b-4 border-[#4F200D] p-1"
          />

          <label className="self-start text-xl mb-1">Phone</label>
          <input
            type="number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full outline-none bg-transparent mb-2 border-b-4 border-[#4F200D] p-1"
          />

          <label className="self-start text-xl mb-1">Password</label>
          <div className="relative w-full mb-2">
            <input
              type={showPass ? "text" : "password"}
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              className="w-full outline-none bg-transparent border-b-4 border-[#4F200D] p-1 pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-sm text-gray-600 hover:text-gray-900"
            >
              {showPass ? "Hide" : "Show"}
            </button>
          </div>

          <label className="self-start text-xl mb-1">Rewrite Password</label>
          <input
            type={showPass ? "text" : "password"}
            value={pass2}
            onChange={(e) => setPass2(e.target.value)}
            className="w-full outline-none bg-transparent mb-2 border-b-4 border-[#4F200D] p-1"
          />

          <button
            type="button"
            onClick={getLocation}
            className="mt-2 mb-2 bg-orange-400 text-white px-4 py-2 rounded-lg hover:bg-orange-500 transition"
          >
            Share My Location
          </button>

          <p>
            Already have an account? <Link href="/Login">Login</Link>
          </p>

          <button
            type="submit"
            className="mt-4 bg-[#4F200D] text-white px-6 py-2 rounded-lg hover:bg-orange-500 transition"
          >
            Sign Up
          </button>

          {message && <p className="mt-2 text-center text-sm">{message}</p>}
        </form>
      </div>
    </div>
  );
}

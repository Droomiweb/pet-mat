"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../lib/firebase"; // make sure firebase.js exports auth

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    try {
      // Map username to Firebase email (username@example.com)
      const email = username + "@example.com";

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log("Logged in user UID:", userCredential.user.uid);

      router.push("/Home"); // redirect to Add Pet page
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Login failed");
    }
  };
return (
    <div className="w-screen h-screen overflow-hidden relative bg-[#F4F7F9]"> {/* Updated BG color */}
      {/* ... (Image component remains the same) ... */}

      {/* Updated card styling */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 p-10 bg-white shadow-2xl rounded-2xl flex flex-col items-center w-80 sm:w-96 border-t-8 border-[#4A90E2]">
        <h1 className="text-[#333333] mb-8 text-center text-4xl font-bold">WELCOME BACK</h1>

        <form onSubmit={handleLogin} className="w-full flex flex-col">
          <label className="self-start text-lg font-semibold mb-1 text-primary">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="input-style" // Use utility class
            required
          />

          <label className="self-start text-lg font-semibold mb-1 text-primary">Password</label>
          <div className="relative w-full mb-4">
            <input
              type={showPass ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-style pr-12" // Use utility class
              required
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-sm text-[#4A90E2] font-semibold hover:text-[#50E3C2] transition"
            >
              {showPass ? "Hide" : "Show"}
            </button>
          </div>

          <button
            type="submit"
            className="mt-4 btn-primary" // Use utility class
          >
            Secure Login
          </button>

          {errorMsg && <p className="mt-4 text-red-500 text-sm text-center font-medium">{errorMsg}</p>}

          <p className="mt-6 text-center text-primary">
            Don't have an account? <Link href="/Signup" className="text-[#4A90E2] font-semibold hover:text-[#50E3C2] underline">Sign Up</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
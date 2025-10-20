// app/Login/page.js
"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../lib/firebase"; 

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
      const email = username + "@example.com";

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log("Logged in user UID:", userCredential.user.uid);

      router.push("/Home"); 
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Login failed");
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

      <div className="max-w-6xl w-full h-full sm:h-[80vh] sm:rounded-3xl glass-container overflow-hidden grid grid-cols-1 md:grid-cols-2 shadow-2xl z-10">

        {/* LEFT COLUMN: Visual/Illustration */}
        <div className="hidden md:flex flex-col justify-center items-center p-10 bg-[#50E3C2]/50">
          <h2 className="text-4xl font-extrabold text-white mb-6">PetLink</h2>
          <Image 
            src="/imgs/topimg.png" 
            alt="Welcome Illustration" 
            width={250} 
            height={250} 
            className="w-48 h-auto mb-4"
          />
          <p className="text-center text-white text-lg font-medium italic">
            Connecting loving pet owners.
          </p>
        </div>

        {/* RIGHT COLUMN: Login Form */}
        <div className="flex flex-col justify-center items-center p-8 sm:p-12 w-full h-full overflow-y-auto">
          
          <h1 className="text-3xl font-extrabold text-primary mb-2 text-center">PetLink</h1>
          <p className="text-xl text-gray-500 mb-8">Welcome Back!</p>

          <form onSubmit={handleLogin} className="w-full max-w-sm flex flex-col">
            {/* Input 1: Username/Email */}
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input-style" 
              placeholder="Username" 
              required
            />

            {/* Input 2: Password */}
            <div className="relative w-full mb-4">
              <input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-style pr-12"
                placeholder="Password"
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
            
            {/* Login Button */}
            <button
              type="submit"
              className="mt-2 btn-primary"
            >
              Sign In
            </button>

            {errorMsg && <p className="mt-4 text-red-500 text-sm text-center font-medium">{errorMsg}</p>}

            <p className="mt-6 text-center text-primary text-sm">
              Don't have an account? <Link href="/Signup" className="text-[#4A90E2] font-bold hover:text-[#3A75B9] underline">Sign Up</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
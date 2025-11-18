// app/Login/page.js
"use client";
import { useState } from "react";
import { auth } from "../lib/firebase"; 
import { signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null); 

    try {
      const email = username + "@example.com";
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log("Logged in user UID:", userCredential.user.uid);

      router.push("/Home");

    } catch (err) {
      console.error("Firebase Auth Error:", err.code); 
      if (err.code === "auth/invalid-credential") {
        setError("Invalid username or password. Please try again.");
      } else {
        setError("An error occurred during login.");
      }
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-layout bg-[#E2F4EF] flex items-center justify-center relative">
      
      {/* Animated background particles */}
      <div className="animated-background">
        {[...Array(7)].map((_, i) => (
          <div key={i} className="particle"></div>
        ))}
      </div>

      <div className="max-w-5xl w-full h-full sm:h-[85vh] sm:rounded-3xl glass-container overflow-hidden grid grid-cols-1 md:grid-cols-2 shadow-2xl z-10 p-0">

        {/* LEFT COLUMN: Visual/Illustration */}
        <div className="hidden md:flex flex-col justify-center items-center p-10 bg-gradient-to-br from-[#50E3C2]/60 to-[#4A90E2]/60 text-white relative">
          <div className="absolute inset-0 bg-black/10 z-0"></div> {/* Overlay for text contrast */}
          <div className="relative z-10 flex flex-col items-center">
            <h2 className="text-4xl font-extrabold mb-6 tracking-wide drop-shadow-md">Welcome Back!</h2>
            <div className="w-56 h-56 relative mb-6 rounded-full overflow-hidden border-4 border-white/30 shadow-lg">
               <Image
                src="/imgs/topimg.png" 
                alt="Login illustration"
                fill
                className="object-cover"
              />
            </div>
            <p className="text-center text-lg font-medium italic drop-shadow-sm px-4">
              "Connect your pets, find their perfect match, and build a community."
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN: Login Form */}
        <div className="flex flex-col justify-center items-center p-8 sm:p-12 w-full bg-white/40">
          <div className="w-full max-w-sm">
            <h1 className="text-3xl font-extrabold text-[#333333] mb-2 text-center">
              MEMBER LOGIN
            </h1>
            <p className="text-gray-600 mb-8 text-center text-sm">
              Enter your credentials to access your account.
            </p>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label htmlFor="username" className="block text-sm font-bold text-gray-700 mb-1 ml-1">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  required
                  className="input-style" 
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-bold text-gray-700 mb-1 ml-1">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="input-style" 
                />
              </div>

              {error && (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 rounded shadow-sm text-sm" role="alert">
                  <p className="font-bold">Error</p>
                  <p>{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full mt-4"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing In...
                  </span>
                ) : "Sign In"}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-gray-300/50 text-center">
              <p className="text-sm text-gray-600">
                Don't have an account?{" "}
                <Link href="/Signup" className="font-bold text-[#4A90E2] hover:text-[#3A75B9] hover:underline transition-colors">
                  Create Account
                </Link>
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
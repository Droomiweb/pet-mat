// app/Login/page.js
"use client";
import { useState } from "react";
import { auth } from "../lib/firebase"; // Make sure this path is correct
import { signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  
  // --- NEW: State for loading and error messages ---
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  // --- END NEW ---

  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null); // Clear previous errors

    try {
      // Your existing logic is correct
      const email = username + "@example.com";
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log("Logged in user UID:", userCredential.user.uid);

      router.push("/Home");

    } catch (err) {
      console.error("Firebase Auth Error:", err.code); // Log the specific code
      
      // --- NEW: Show a user-friendly error ---
      if (err.code === "auth/invalid-credential") {
        setError("Invalid username or password. Please try again.");
      } else {
        setError("An error occurred during login.");
      }
      setLoading(false);
      // --- END NEW ---
    }
  };

  return (
    <div className="flex h-screen bg-white">
      {/* Left side with image */}
      <div className="hidden lg:flex w-1/2 items-center justify-center bg-gray-100 p-12">
        <Image
          src="/imgs/topimg.png"
          alt="Login illustration"
          width={600}
          height={600}
          className="object-contain"
        />
      </div>

      {/* Right side with login form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 md:p-12">
        <div className="w-full max-w-md">
          <h1 className="text-4xl font-extrabold text-[#333333] mb-4 text-center">
            Welcome Back!
          </h1>
          <p className="text-gray-600 mb-8 text-center">
            Sign in to continue to your PetMate account.
          </p>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-700"
              >
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="input-style" // Use your global CSS class
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="input-style" // Use your global CSS class
              />
            </div>

            {/* --- NEW: Display Error Message --- */}
            {error && (
              <p className="text-sm text-red-600 bg-red-100 p-3 rounded-md border border-red-300">
                {error}
              </p>
            )}
            {/* --- END NEW --- */}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full" // Use your global CSS class
              >
                {loading ? "Signing In..." : "Sign In"}
              </button>
            </div>
          </form>

          <p className="mt-8 text-center text-sm text-gray-600">
            Don't have an account?{" "}
            <Link
              href="/Signup"
              className="font-medium text-[#4A90E2] hover:underline"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
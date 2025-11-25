// app/Login/page.js
"use client";
import { useState, useRef } from "react";
import { auth } from "../lib/firebase"; 
import { signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";

// Icons
const EyeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const EyeSlashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>;

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false); 
  
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const [rotate, setRotate] = useState({ x: 0, y: 0 });
  const cardRef = useRef(null);
  
  const router = useRouter();

  // --- 3D TILT LOGIC ---
  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const card = cardRef.current;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -10; 
    const rotateY = ((x - centerX) / centerX) * 10;
    setRotate({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => {
    setRotate({ x: 0, y: 0 }); 
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null); 
    try {
      const email = username + "@example.com";
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/Home");
    } catch (err) {
      console.error("Login Error:", err.code); 
      setError("Invalid username or password.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-[#E2F4EF]">
      
      {/* Animated Background */}
      <div className="bg-animation">
        {[...Array(6)].map((_, i) => <div key={i} className="paw-print"></div>)}
      </div>

      <div className="w-full max-w-4xl bg-white/90 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[550px] glass-panel z-10">

        {/* --- LEFT: 3D INTERACTIVE ZONE (Emoji Version) --- */}
        <div 
          className="hidden md:flex md:w-1/2 bg-gradient-to-br from-[#4A90E2] to-[#50E3C2] flex-col justify-center items-center p-10 relative perspective-1000 overflow-hidden"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{ perspective: "1000px" }}
        >
          {/* 3D Tilting Card */}
          <div 
            ref={cardRef}
            className="relative w-full max-w-xs aspect-square flex flex-col items-center justify-center transition-transform duration-100 ease-out preserve-3d"
            style={{ 
              transform: `rotateX(${rotate.x}deg) rotateY(${rotate.y}deg)`,
              transformStyle: "preserve-3d"
            }}
          >
            <h2 
              className="text-4xl font-extrabold mb-6 text-white drop-shadow-lg transition-transform duration-100"
              style={{ transform: "translateZ(60px)" }}
            >
              Welcome!
            </h2>
            
            {/* Interactive Emoji Container */}
            <div 
              className="w-48 h-48 relative rounded-full border-8 border-white/30 shadow-2xl mb-6 transition-transform duration-100 bg-white/20 backdrop-blur-sm flex items-center justify-center"
              style={{ transform: "translateZ(40px)" }}
            >
               {/* The Giant Emoji */}
               <span className="text-[8rem] drop-shadow-md select-none">🐱</span>

              {/* --- CSS PAWS (Privacy Mode) --- */}
              {/* Left Paw */}
              <div 
                className={`absolute bottom-[-10px] left-[10px] w-16 h-16 bg-white rounded-full shadow-lg z-20 flex items-center justify-center text-2xl transition-all duration-500 ease-in-out ${isPasswordFocused ? 'translate-y-[-60px] translate-x-[20px] rotate-12' : 'translate-y-[100px]'}`}
              >🐾</div>
              {/* Right Paw */}
              <div 
                className={`absolute bottom-[-10px] right-[10px] w-16 h-16 bg-white rounded-full shadow-lg z-20 flex items-center justify-center text-2xl transition-all duration-500 ease-in-out ${isPasswordFocused ? 'translate-y-[-60px] translate-x-[-20px] -rotate-12' : 'translate-y-[100px]'}`}
              >🐾</div>
            </div>

            {/* Floating Elements */}
            <div className="absolute top-0 left-10 text-4xl animate-bounce transition-transform duration-100" style={{ transform: "translateZ(80px)", animationDuration: '3s' }}>🧶</div>
            <div className="absolute bottom-10 right-10 text-4xl animate-bounce transition-transform duration-100" style={{ transform: "translateZ(100px)", animationDuration: '4s' }}>🐟</div>
            
            <p 
              className="text-center text-white text-lg font-medium opacity-90 px-2 transition-transform duration-100"
              style={{ transform: "translateZ(30px)" }}
            >
              {isPasswordFocused ? "Don't worry, I'm not looking!" : "Connect, Adopt, and Care."}
            </p>
          </div>
        </div>

        {/* --- RIGHT: LOGIN FORM --- */}
        <div className="w-full md:w-1/2 p-8 sm:p-12 flex flex-col justify-center bg-white/60 h-full backdrop-blur-sm">
          <div className="mb-8 text-center md:text-left">
            <h1 className="text-3xl font-bold text-gray-800 mb-1">Member Login</h1>
            <p className="text-gray-500 text-sm">Enter credentials to access PetLink</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            
            <div>
              <label htmlFor="username" className="block text-[10px] font-bold text-gray-500 uppercase mb-1 ml-1 tracking-wider">Username</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. catlover99"
                required
                className="input-field"
              />
            </div>

            <div className="relative">
              <div className="flex justify-between items-center mb-1 ml-1">
                {/* FIXED: class -> className */}
                <label htmlFor="password" className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Password</label>
                
                {/* FIXED: class -> className */}
                <Link href="/forgot-password" className="text-xs text-[#4A90E2] hover:underline font-bold">Forgot Password?</Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  // Triggers the cat hiding its eyes
                  onFocus={() => setIsPasswordFocused(true)}
                  onBlur={() => setIsPasswordFocused(false)}
                  placeholder="••••••••"
                  required
                  className="input-field pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-[#4A90E2] transition-colors"
                >
                  {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 animate-pulse">
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="auth-btn"
            >
              {loading ? "Signing In..." : "Sign In"}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600">
              New to PetLink?{" "}
              <Link href="/Signup" className="text-[#4A90E2] font-bold hover:underline">Create Account</Link>
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
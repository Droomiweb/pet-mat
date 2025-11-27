// app/Login/page.js
"use client";
import { useState, useRef, useEffect } from "react";
import { auth } from "../lib/firebase"; 
import { signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";

// --- ICONS ---
const EyeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const EyeSlashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>;

// --- ENHANCED ANIMATED MASCOT COMPONENT ---
const LoginMascot = ({ hideEyes }) => {
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-2xl overflow-visible">
      <defs>
        {/* Gradients for depth */}
        <radialGradient id="faceGrad" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
          <stop offset="30%" stopColor="#6D4C41" />
          <stop offset="100%" stopColor="#3E2723" />
        </radialGradient>
        <linearGradient id="earGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6D4C41" />
          <stop offset="100%" stopColor="#3E2723" />
        </linearGradient>
        <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
          <feOffset dx="0" dy="4" result="offsetblur" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.3" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Ears */}
      <path d="M35,60 Q20,10 75,35 Z" fill="url(#earGrad)" stroke="#3E2723" strokeWidth="2" filter="url(#softShadow)" />
      <path d="M165,60 Q180,10 125,35 Z" fill="url(#earGrad)" stroke="#3E2723" strokeWidth="2" filter="url(#softShadow)" />
      
      {/* Inner Ears */}
      <path d="M45,55 Q35,25 65,45 Z" fill="#D7CCC8" opacity="0.9" />
      <path d="M155,55 Q165,25 135,45 Z" fill="#D7CCC8" opacity="0.9" />

      {/* Head */}
      <ellipse cx="100" cy="110" rx="75" ry="65" fill="url(#faceGrad)" stroke="#3E2723" strokeWidth="2" filter="url(#softShadow)" />

      {/* Light Fur Patch around Face */}
      <ellipse cx="100" cy="125" rx="55" ry="40" fill="#D7CCC8" opacity="0.1" />

      {/* Eyes Container */}
      <g className="transition-transform duration-300" style={{ transform: hideEyes ? 'translateY(10px) scale(0.95)' : 'translateY(0) scale(1)' }}>
        {/* Eye Backgrounds (Whites) */}
        <ellipse cx="70" cy="100" rx="18" ry="22" fill="#FFF" />
        <ellipse cx="130" cy="100" rx="18" ry="22" fill="#FFF" />
        
        {/* Pupils (Breathing Animation) */}
        <circle cx="70" cy="100" r="8" fill="#000">
            <animate attributeName="r" values="8;9;8" dur="3s" repeatCount="indefinite" />
        </circle>
        <circle cx="130" cy="100" r="8" fill="#000">
            <animate attributeName="r" values="8;9;8" dur="3s" repeatCount="indefinite" />
        </circle>
        
        {/* Eye Highlights (Sparkle) */}
        <circle cx="76" cy="94" r="4" fill="white" />
        <circle cx="136" cy="94" r="4" fill="white" />
        <circle cx="66" cy="106" r="2" fill="white" opacity="0.7" />
        <circle cx="126" cy="106" r="2" fill="white" opacity="0.7" />
      </g>

      {/* Snout */}
      <ellipse cx="100" cy="135" rx="10" ry="7" fill="#FFAB91" />
      
      {/* Mouth */}
      <path d="M100,142 Q90,155 80,145" fill="none" stroke="#3E2723" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M100,142 Q110,155 120,145" fill="none" stroke="#3E2723" strokeWidth="2.5" strokeLinecap="round" />

      {/* Cheeks (Blush) */}
      <ellipse cx="60" cy="135" rx="8" ry="5" fill="#FFAB91" opacity="0.4" />
      <ellipse cx="140" cy="135" rx="8" ry="5" fill="#FFAB91" opacity="0.4" />

      {/* Whiskers */}
      <g opacity="0.6">
        <line x1="40" y1="130" x2="10" y2="120" stroke="#FFF" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="40" y1="140" x2="10" y2="140" stroke="#FFF" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="160" y1="130" x2="190" y2="120" stroke="#FFF" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="160" y1="140" x2="190" y2="140" stroke="#FFF" strokeWidth="1.5" strokeLinecap="round" />
      </g>

      {/* --- ANIMATED PAWS (Spring Physics) --- */}
      <g 
        className="transition-all duration-500 ease-[cubic-bezier(0.68,-0.55,0.27,1.55)]"
        style={{ transform: hideEyes ? 'translateY(-55px)' : 'translateY(120px)' }}
      >
        {/* Left Paw */}
        <g transform="translate(55, 160) rotate(-12)">
            <ellipse cx="0" cy="0" rx="28" ry="32" fill="#EFEBE9" stroke="#A1887F" strokeWidth="2" />
            <circle cx="-10" cy="-15" r="8" fill="#FFAB91" />
            <circle cx="10" cy="-15" r="8" fill="#FFAB91" />
            <circle cx="0" cy="-24" r="8" fill="#FFAB91" />
            <ellipse cx="0" cy="10" rx="16" ry="12" fill="#FFAB91" opacity="0.6" />
        </g>

        {/* Right Paw */}
        <g transform="translate(145, 160) rotate(12)">
            <ellipse cx="0" cy="0" rx="28" ry="32" fill="#EFEBE9" stroke="#A1887F" strokeWidth="2" />
            <circle cx="-10" cy="-15" r="8" fill="#FFAB91" />
            <circle cx="10" cy="-15" r="8" fill="#FFAB91" />
            <circle cx="0" cy="-24" r="8" fill="#FFAB91" />
            <ellipse cx="0" cy="10" rx="16" ry="12" fill="#FFAB91" opacity="0.6" />
        </g>
      </g>
    </svg>
  );
};

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

  // --- 3D TILT LOGIC (Desktop) ---
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
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 relative overflow-hidden bg-[#E2F4EF]">
      
      {/* Animated Background */}
      <div className="bg-animation">
        {[...Array(6)].map((_, i) => <div key={i} className="paw-print"></div>)}
      </div>

      {/* Main Container */}
      <div className="w-full max-w-4xl bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[600px] border border-white/60 z-10 animate-in zoom-in duration-300">

        {/* --- LEFT: 3D INTERACTIVE ZONE (Desktop) --- */}
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
            <h2 className="text-4xl font-extrabold mb-6 text-white drop-shadow-lg transition-transform duration-100" style={{ transform: "translateZ(60px)" }}>
              Welcome!
            </h2>
            
            {/* Mascot Container */}
            <div 
              className="w-64 h-64 relative transition-transform duration-100 mb-6"
              style={{ transform: "translateZ(40px)" }}
            >
               <LoginMascot hideEyes={isPasswordFocused} />
            </div>

            <p className="text-center text-white text-lg font-medium opacity-90 px-2 transition-transform duration-100" style={{ transform: "translateZ(30px)" }}>
              {isPasswordFocused ? "Don't worry, I'm not looking!" : "Connect, Adopt, and Care."}
            </p>
          </div>
        </div>

        {/* --- RIGHT: LOGIN FORM --- */}
        <div className="w-full md:w-1/2 p-8 sm:p-12 flex flex-col justify-center h-full relative">
          
          {/* Mobile Mascot Header (Visible only on small screens) */}
          <div className="md:hidden flex justify-center mb-6">
             <div className="w-40 h-40">
                <LoginMascot hideEyes={isPasswordFocused} />
             </div>
          </div>

          <div className="mb-8 text-center md:text-left">
            <h1 className="text-3xl font-extrabold text-gray-800 mb-1 tracking-tight">Member Login</h1>
            <p className="text-gray-500 text-sm font-medium">Welcome back to PetLink!</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1">
              <label htmlFor="username" className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Username</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. catlover99"
                required
                className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-base rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-[#4A90E2] block p-4 outline-none transition-all font-medium placeholder-gray-400 shadow-sm"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center ml-1">
                <label htmlFor="password" className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Password</label>
                <Link href="/forgot-password" className="text-xs text-[#4A90E2] hover:text-[#3A75B9] font-bold transition-colors">Forgot?</Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setIsPasswordFocused(true)}
                  onBlur={() => setIsPasswordFocused(false)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-base rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-[#4A90E2] block p-4 pr-12 outline-none transition-all font-medium placeholder-gray-400 shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-4 text-gray-400 hover:text-[#4A90E2] transition-colors"
                >
                  {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2 animate-pulse">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 shrink-0"><path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" /></svg>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full text-white bg-gradient-to-r from-[#4A90E2] to-[#3A75B9] hover:from-[#3A75B9] hover:to-[#2b5c94] focus:ring-4 focus:outline-none focus:ring-blue-300 font-bold rounded-xl text-base px-5 py-4 text-center shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 active:scale-95 disabled:opacity-70 disabled:scale-100"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Signing In...</span>
                </div>
              ) : "Sign In"}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              New here?{" "}
              <Link href="/Signup" className="text-[#4A90E2] font-bold hover:underline decoration-2 underline-offset-4">Create Account</Link>
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
"use client";
import { useState, useRef, useEffect } from "react";
import { auth } from "../lib/firebase"; 
import { signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";

// --- ICONS ---
const EyeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const EyeSlashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>;

// --- INTERACTIVE WATCHER CAT ---
const WatcherCat = ({ isPasswordFocused }) => {
  const svgRef = useRef(null);
  const [pupilPos, setPupilPos] = useState({ x: 0, y: 0 });
  const [isBlinking, setIsBlinking] = useState(false);

  // Handle Mouse Tracking
  useEffect(() => {
    const handleMouseMove = (e) => {
      // If password is focused, eyes are closed/sqeezed, so tracking is irrelevant visually
      // but we keep logic simple.
      
      const { clientX, clientY } = e;
      const svg = svgRef.current;
      if (!svg) return;

      const rect = svg.getBoundingClientRect();
      const catCenterX = rect.left + rect.width / 2;
      const catCenterY = rect.top + rect.height / 2;

      // Calculate angle
      const dx = clientX - catCenterX;
      const dy = clientY - catCenterY;
      const angle = Math.atan2(dy, dx);
      
      // Limit distance (contain within eye)
      const maxDist = 8; // Max pixels pupil can move
      const dist = Math.min(Math.sqrt(dx * dx + dy * dy) / 20, maxDist); // sensitivity divisor

      const moveX = Math.cos(angle) * dist;
      const moveY = Math.sin(angle) * dist;

      setPupilPos({ x: moveX, y: moveY });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Handle Blinking
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 200); // 200ms blink duration
    }, 4000); // Blink every 4 seconds

    return () => clearInterval(blinkInterval);
  }, []);

  return (
    <svg 
      ref={svgRef}
      viewBox="0 0 200 180" 
      className="w-full h-full drop-shadow-xl"
    >
      <defs>
        <linearGradient id="furGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#333" />
          <stop offset="100%" stopColor="#1a1a1a" />
        </linearGradient>
      </defs>

      {/* --- EARS --- */}
      <path d="M40,60 L20,10 L80,40 Z" fill="#333" stroke="#222" strokeWidth="2" strokeLinejoin="round" />
      <path d="M160,60 L180,10 L120,40 Z" fill="#333" stroke="#222" strokeWidth="2" strokeLinejoin="round" />
      {/* Inner Ears */}
      <path d="M45,55 L30,25 L70,45 Z" fill="#FFAB91" />
      <path d="M155,55 L170,25 L130,45 Z" fill="#FFAB91" />

      {/* --- HEAD SHAPE --- */}
      <ellipse cx="100" cy="110" rx="80" ry="65" fill="url(#furGrad)" />

      {/* --- EYES CONTAINER --- */}
      {/* If password focused, maybe we close eyes? Or look down? 
          Let's make them look down significantly if focused, overriding tracking 
      */}
      <g transform={isPasswordFocused ? "translate(0, 5)" : "translate(0,0)"}>
        {/* Left Eye Sclera */}
        <ellipse cx="65" cy="100" rx="18" ry="18" fill="white" />
        {/* Right Eye Sclera */}
        <ellipse cx="135" cy="100" rx="18" ry="18" fill="white" />

        {/* --- PUPILS (TRACKING) --- */}
        {/* We move these based on mouse position */}
        { !isPasswordFocused ? (
           <>
            <circle cx={65 + pupilPos.x} cy={100 + pupilPos.y} r="8" fill="black" />
            <circle cx={135 + pupilPos.x} cy={100 + pupilPos.y} r="8" fill="black" />
            {/* Highlights */}
            <circle cx={68 + pupilPos.x} cy={97 + pupilPos.y} r="3" fill="white" opacity="0.8" />
            <circle cx={138 + pupilPos.x} cy={97 + pupilPos.y} r="3" fill="white" opacity="0.8" />
           </>
        ) : (
            // Eyes Closed / Looking Down (Hands over eyes style implied or just squeezed shut)
            // Let's do squeezed shut for "Don't look"
            <>
             <path d="M47 100 Q65 110 83 100" stroke="#333" strokeWidth="4" fill="none" />
             <path d="M117 100 Q135 110 153 100" stroke="#333" strokeWidth="4" fill="none" />
            </>
        )}
      </g>

      {/* --- EYELIDS (BLINKING) --- */}
      <ellipse cx="65" cy="100" rx="19" ry="19" fill="#333" className={`transition-all duration-75 ${isBlinking && !isPasswordFocused ? 'scale-y-1' : 'scale-y-0'}`} />
      <ellipse cx="135" cy="100" rx="19" ry="19" fill="#333" className={`transition-all duration-75 ${isBlinking && !isPasswordFocused ? 'scale-y-1' : 'scale-y-0'}`} />

      {/* --- SNOUT --- */}
      <ellipse cx="100" cy="130" rx="8" ry="5" fill="#FFAB91" />
      <path d="M100,135 Q90,145 80,140" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round" />
      <path d="M100,135 Q110,145 120,140" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round" />

      {/* --- WHISKERS --- */}
      <g stroke="#fff" strokeWidth="1" opacity="0.5">
        <line x1="30" y1="120" x2="60" y2="125" />
        <line x1="30" y1="130" x2="60" y2="130" />
        <line x1="170" y1="120" x2="140" y2="125" />
        <line x1="170" y1="130" x2="140" y2="130" />
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
  
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null); 
    try {
      const cleanUsername = username.trim().replace(/\s+/g, '');
      const email = cleanUsername + "@example.com";
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

        {/* --- LEFT: WATCHER ZONE (Desktop) --- */}
        <div 
          className="hidden md:flex md:w-1/2 bg-gradient-to-br from-[#4A90E2] to-[#50E3C2] flex-col justify-center items-center p-10 relative overflow-hidden"
        >
          {/* Static Container (No 3D Tilt) */}
          <div className="relative w-full max-w-xs flex flex-col items-center justify-center">
            
            <h2 className="text-4xl font-extrabold mb-8 text-white drop-shadow-md text-center">
              Welcome Back!
            </h2>
            
            {/* Watcher Cat */}
            <div className="w-64 h-64 relative mb-6">
               <WatcherCat isPasswordFocused={isPasswordFocused} />
            </div>

            <p className="text-center text-white text-lg font-medium opacity-90 px-2 mt-4">
              {isPasswordFocused ? "I promise I'm not peeking!" : "I'm keeping an eye on you."}
            </p>

          </div>
        </div>

        {/* --- RIGHT: LOGIN FORM --- */}
        <div className="w-full md:w-1/2 p-8 sm:p-12 flex flex-col justify-center h-full relative">
          
          {/* Mobile Mascot Header (Visible only on small screens) */}
          <div className="md:hidden flex justify-center mb-6">
             <div className="w-40 h-40">
                <WatcherCat isPasswordFocused={isPasswordFocused} />
             </div>
          </div>

          <div className="mb-8 text-center md:text-left">
            <h1 className="text-3xl font-extrabold text-gray-800 mb-1 tracking-tight">Member Login</h1>
            <p className="text-gray-500 text-sm font-medium">Any Pet, Any Breed.</p>
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
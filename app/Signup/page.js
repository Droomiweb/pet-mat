// app/Signup/page.js
"use client";
import Link from "next/link";
import { useState, useRef } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../lib/firebase";
import { useRouter } from "next/navigation";

// Icons
const EyeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const EyeSlashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>;
const LocIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>;

// --- ANIMATED DOG COMPONENT ---
const SignupMascot = ({ isExcited }) => {
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-xl overflow-visible">
      <defs>
        <filter id="shadow">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity="0.2"/>
        </filter>
      </defs>

      {/* Ears (Animate on isExcited) */}
      <g className={`transition-transform duration-300 origin-[100px_80px] ${isExcited ? 'rotate-[-5deg] translate-y-[-10px]' : ''}`}>
        <path d="M50,80 Q30,20 80,60" fill="#E6C229" stroke="#D4B018" strokeWidth="4" />
      </g>
      <g className={`transition-transform duration-300 origin-[100px_80px] ${isExcited ? 'rotate-[5deg] translate-y-[-10px]' : ''}`}>
        <path d="M150,80 Q170,20 120,60" fill="#E6C229" stroke="#D4B018" strokeWidth="4" />
      </g>

      {/* Head */}
      <circle cx="100" cy="100" r="65" fill="#E6C229" stroke="#D4B018" strokeWidth="4" />
      
      {/* Patches */}
      <circle cx="70" cy="90" r="18" fill="white" opacity="0.8" />
      
      {/* Eyes */}
      <ellipse cx="70" cy="90" rx="8" ry="10" fill="black" />
      <ellipse cx="130" cy="90" rx="8" ry="10" fill="black" />
      
      {/* Eye Shine */}
      <circle cx="73" cy="86" r="3" fill="white" />
      <circle cx="133" cy="86" r="3" fill="white" />

      {/* Snout Area */}
      <ellipse cx="100" cy="120" rx="25" ry="18" fill="white" />
      <path d="M100,115 L90,130 L110,130 Z" fill="black" rx="5" /> {/* Nose */}
      
      {/* Mouth & Tongue */}
      <path d="M100,130 Q100,145 100,145" stroke="black" strokeWidth="2" />
      <g className={`transition-all duration-300 ${isExcited ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-[-10px]'}`}>
         {/* Tongue Animation */}
         <path d="M92,145 Q100,165 108,145" fill="#FF6B6B" stroke="#D32F2F" strokeWidth="1" />
      </g>
      
      {/* Cheeks */}
      <circle cx="60" cy="115" r="10" fill="#FFCDD2" opacity="0.5" />
      <circle cx="140" cy="115" r="10" fill="#FFCDD2" opacity="0.5" />

      {/* Floating Elements (Excitement) */}
      <g className={`transition-opacity duration-300 ${isExcited ? 'opacity-100' : 'opacity-0'}`}>
         <path d="M160,50 L170,40 M165,60 L180,55" stroke="#4A90E2" strokeWidth="3" strokeLinecap="round" className="animate-bounce" />
         <path d="M40,50 L30,40 M35,60 L20,55" stroke="#4A90E2" strokeWidth="3" strokeLinecap="round" className="animate-bounce" style={{ animationDelay: '0.1s' }} />
      </g>
    </svg>
  );
};

export default function Signup() {
  const [formData, setFormData] = useState({ name: "", username: "", phone: "", password: "", confirmPassword: "" });
  const [showPass, setShowPass] = useState(false);
  const [location, setLocation] = useState({ lat: null, lng: null, city: "" });
  const [status, setStatus] = useState({ type: "", msg: "" });
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef(null);
  
  // 3D State
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

  const handleMouseLeave = () => setRotate({ x: 0, y: 0 });

  const handleInput = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    
    // Trigger Typing Animation
    setIsTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 500);
  };

  const getLocation = () => {
    if (!navigator.geolocation) return alert("Geolocation not supported");
    
    setStatus({ type: "info", msg: "Detecting location..." });
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        let cityName = "Unknown";
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await res.json();
          cityName = data.address.city || data.address.town || data.address.village || "Unknown Location";
        } catch (e) { console.error(e); }
        
        setLocation({ lat: latitude, lng: longitude, city: cityName });
        setStatus({ type: "success", msg: `📍 ${cityName}` });
      },
      () => setStatus({ type: "error", msg: "Location access denied." })
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ type: "", msg: "" });

    if (formData.password !== formData.confirmPassword) {
      return setStatus({ type: "error", msg: "Passwords do not match!" });
    }
    if (!location.lat) {
      return setStatus({ type: "error", msg: "Please share your location." });
    }

    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, formData.username + "@example.com", formData.password);
      await fetch("/api/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          username: formData.username,
          phone: formData.phone,
          location,
          firebaseUid: cred.user.uid
        }),
      });
      router.push("/Addpet");
    } catch (err) {
      setStatus({ type: "error", msg: err.message.includes("email-already-in-use") ? "Username already taken." : err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 relative overflow-hidden bg-[#E2F4EF]">
      
      {/* Background Animation */}
      <div className="bg-animation">
        {[...Array(6)].map((_, i) => <div key={i} className="paw-print"></div>)}
      </div>

      <div className="w-full max-w-5xl bg-white/90 backdrop-blur-xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[600px] border border-white/60 z-10 animate-in slide-in-from-bottom-4 duration-500">
        
        {/* --- LEFT: 3D INTERACTIVE ZONE (Desktop) --- */}
        <div 
          className="hidden md:flex md:w-1/2 bg-[#FDF6F6] flex-col justify-center items-center p-10 relative perspective-1000 overflow-hidden"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{ perspective: "1000px" }}
        >
          <div 
            ref={cardRef}
            className="relative w-full max-w-xs aspect-square flex flex-col items-center justify-center transition-transform duration-100 ease-out preserve-3d"
            style={{ 
              transform: `rotateX(${rotate.x}deg) rotateY(${rotate.y}deg)`,
              transformStyle: "preserve-3d"
            }}
          >
            <h2 className="text-4xl font-extrabold text-[#333333] mb-4 text-center transition-transform duration-100" style={{ transform: "translateZ(50px)" }}>
                Join Us!
            </h2>
            
            {/* Mascot Container */}
            <div 
                className="w-56 h-56 mb-6 transition-transform duration-200"
                style={{ transform: "translateZ(30px)" }}
            >
                <SignupMascot isExcited={isTyping} />
            </div>

            <p className="text-gray-500 text-center font-medium px-4 transition-transform duration-100" style={{ transform: "translateZ(20px)" }}>
                {isTyping ? "Woohoo! Filling it out!" : "Find playmates and adoption matches."}
            </p>
          </div>
        </div>

        {/* --- RIGHT: FORM --- */}
        <div className="w-full md:w-1/2 p-8 sm:p-10 flex flex-col justify-center h-full overflow-y-auto">
          
          {/* Mobile Mascot Header (Replaces Emoji) */}
          <div className="md:hidden flex flex-col items-center mb-6">
             <div className="w-28 h-28 mb-2">
                <SignupMascot isExcited={isTyping} />
             </div>
             <h1 className="text-2xl font-extrabold text-gray-800">Create Account</h1>
             <p className="text-gray-500 text-xs">Start your PetLink journey</p>
          </div>

          <div className="hidden md:block text-left mb-6">
            <h1 className="text-3xl font-extrabold text-gray-800">Create Account</h1>
            <p className="text-gray-500 text-sm">Start your PetLink journey</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Row 1 */}
            <div className="grid grid-cols-2 gap-3">
              <input name="name" type="text" placeholder="Full Name" className="input-field" onChange={handleInput} required />
              <input name="username" type="text" placeholder="Username" className="input-field" onChange={handleInput} required />
            </div>

            {/* Row 2 */}
            <div>
              <label className="text-[10px] font-bold text-[#4A90E2] ml-2 mb-1 block uppercase tracking-wider">WhatsApp Number</label>
              <input name="phone" type="tel" placeholder="e.g. 9876543210" className="input-field" onChange={handleInput} required />
            </div>

            {/* Row 3 */}
            <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                    <input 
                        name="password" 
                        type={showPass ? "text" : "password"} 
                        placeholder="Password" 
                        className="input-field pr-8" 
                        onChange={handleInput} 
                        required 
                    />
                    <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-3.5 text-gray-400 hover:text-[#4A90E2]">
                        {showPass ? <EyeSlashIcon /> : <EyeIcon />}
                    </button>
                </div>
                <input name="confirmPassword" type="password" placeholder="Confirm" className="input-field" onChange={handleInput} required />
            </div>

            {/* Location Button */}
            <button 
              type="button" 
              onClick={getLocation} 
              className={`w-full py-3 rounded-xl border-2 font-bold flex items-center justify-center gap-2 transition-all text-sm ${
                location.lat 
                  ? "border-green-500 bg-green-50 text-green-600 shadow-inner" 
                  : "border-dashed border-[#4A90E2] text-[#4A90E2] hover:bg-blue-50"
              }`}
            >
              <LocIcon />
              {location.lat ? "Location Set ✅" : "Detect Location"}
            </button>

            {status.msg && (
              <div className={`p-3 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-2 ${status.type === 'error' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-600'}`}>
                {status.type === 'success' ? '🌍' : '⚠️'} {status.msg}
              </div>
            )}

            <button type="submit" disabled={loading} className="w-full text-white bg-gradient-to-r from-[#4A90E2] to-[#3A75B9] hover:from-[#3A75B9] hover:to-[#2b5c94] font-bold rounded-xl text-sm px-5 py-4 shadow-lg hover:shadow-xl transition-all active:scale-95 disabled:opacity-70">
              {loading ? "Creating..." : "Sign Up"}
            </button>
          </form>

          <p className="text-center text-gray-500 text-xs mt-6">
            Already a member? <Link href="/Login" className="text-[#4A90E2] font-bold hover:underline decoration-2 underline-offset-4">Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
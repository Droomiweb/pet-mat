"use client";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { createUserWithEmailAndPassword, deleteUser } from "firebase/auth";
import { auth } from "../lib/firebase";
import { useRouter } from "next/navigation";

// --- ICONS ---
const EyeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const EyeSlashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>;
const LocIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>;

// --- ILLUSTRATION: WELCOME PAW ---
const WelcomeIllustration = () => {
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-xl overflow-visible">
      {/* Abstract Background Blotches */}
      <circle cx="100" cy="100" r="80" fill="#FFF" opacity="0.2" className="animate-pulse" style={{ animationDuration: '3s' }} />
      <circle cx="100" cy="100" r="60" fill="#FFF" opacity="0.2" className="animate-pulse" style={{ animationDuration: '4s', animationDelay: '1s' }} />
      
      {/* Large Paw Print Center */}
      <g transform="translate(100, 100) scale(1.2)">
        <path d="M-20,-10 Q-40,-30 -20,-50 Q0,-30 -20,-10" fill="#FFF" opacity="0.9" />
        <path d="M20,-10 Q40,-30 20,-50 Q0,-30 20,-10" fill="#FFF" opacity="0.9" />
        <path d="M-35,10 Q-55,-10 -45,-30 Q-25,-10 -35,10" fill="#FFF" opacity="0.9" />
        <path d="M35,10 Q55,-10 45,-30 Q25,-10 35,10" fill="#FFF" opacity="0.9" />
        <path d="M0,20 Q-30,50 0,70 Q30,50 0,20" fill="#FFF" opacity="0.9" transform="translate(0, -10)" />
      </g>

      {/* Floating Hearts */}
      <path d="M150,50 Q160,40 170,50 Q180,60 170,70 L160,80 L150,70 Q140,60 150,50" fill="#FFE0B2" className="animate-bounce" style={{ animationDuration: '2s' }} />
      <path d="M40,150 Q50,140 60,150 Q70,160 60,170 L50,180 L40,170 Q30,160 40,150" fill="#FFE0B2" className="animate-bounce" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }} />
    </svg>
  );
};


export default function Signup() {
  const [formData, setFormData] = useState({ name: "", username: "", phone: "", password: "", confirmPassword: "" });
  
  // Visibility States
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  
  const [location, setLocation] = useState({ lat: null, lng: null, city: "" });
  const [status, setStatus] = useState({ type: "", msg: "" });
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const handleInput = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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
    let createdUser = null;

    try {
      // 1. PRE-CHECK
      const checkRes = await fetch(`/api/user?username=${formData.username}&phone=${formData.phone}`);
      const checkData = await checkRes.json();
      
      if (checkData.exists) {
          const msg = checkData.field === "phone" 
              ? "Phone number already in use." 
              : "Username already taken.";
          setLoading(false);
          return setStatus({ type: "error", msg: msg });
      }

      // 2. Create User in Firebase
      const cred = await createUserWithEmailAndPassword(auth, formData.username + "@example.com", formData.password);
      createdUser = cred.user;

      // 3. Create User in MongoDB
      const res = await fetch("/api/user", {
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

      const data = await res.json();

      if (!res.ok) {
        try { await deleteUser(createdUser); } catch(delErr) {}
        throw new Error(data.error || "Failed to create account.");
      }

      router.push("/Addpet");
    } catch (err) {
      console.error("Signup Error:", err);
      let errorMessage = err.message;
      if (err.message.includes("email-already-in-use")) errorMessage = "Username already taken.";
      setStatus({ type: "error", msg: errorMessage });
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

      <div className="w-full max-w-5xl bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[600px] border border-white/60 z-10 animate-in slide-in-from-bottom-4 duration-500">
        
        {/* --- LEFT: ILLUSTRATION ZONE (Desktop) --- */}
        <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-[#FDD835] to-[#FBC02D] flex-col justify-center items-center p-10 relative overflow-hidden">
          <div className="relative w-full max-w-xs flex flex-col items-center justify-center">
            <h2 className="text-4xl font-extrabold text-white mb-6 text-center drop-shadow-md">
                Join the Pack!
            </h2>
            
            {/* Illustration */}
            <div className="w-56 h-56 relative mb-6">
                <WelcomeIllustration />
            </div>

            <p className="text-white text-center font-bold text-lg px-4 opacity-90">
                Find playmates and adoption matches for your furry friends.
            </p>
          </div>
        </div>

        {/* --- RIGHT: FORM --- */}
        <div className="w-full md:w-1/2 p-8 sm:p-10 flex flex-col justify-center h-full overflow-y-auto">
          
          {/* Mobile Header (No Mascot, just text) */}
          <div className="md:hidden flex flex-col items-center mb-6">
             <h1 className="text-2xl font-extrabold text-gray-800">Create Account</h1>
             <p className="text-gray-500 text-xs">Start your PetLink journey</p>
          </div>

          <div className="hidden md:block text-left mb-6">
            <h1 className="text-3xl font-extrabold text-gray-800 tracking-tight">Create Account</h1>
            <p className="text-gray-500 text-sm font-medium">Start your PetLink journey today</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Row 1 */}
            <div className="grid grid-cols-2 gap-3">
              <input 
                name="name" 
                type="text" 
                placeholder="Full Name" 
                className="w-full bg-gray-50 border border-gray-200 text-gray-800 rounded-xl focus:ring-4 focus:ring-yellow-100 focus:border-[#FBC02D] block p-4 outline-none transition-all font-medium placeholder-gray-400" 
                onChange={handleInput} 
                required 
              />
              <input 
                name="username" 
                type="text" 
                placeholder="Username" 
                className="w-full bg-gray-50 border border-gray-200 text-gray-800 rounded-xl focus:ring-4 focus:ring-yellow-100 focus:border-[#FBC02D] block p-4 outline-none transition-all font-medium placeholder-gray-400" 
                onChange={handleInput} 
                required 
              />
            </div>

            {/* Row 2 */}
            <div>
              <label className="text-[10px] font-bold text-gray-400 ml-2 mb-1 block uppercase tracking-wider">WhatsApp Number</label>
              <input 
                name="phone" 
                type="number" 
                placeholder="e.g. 9876543210" 
                className="w-full bg-gray-50 border border-gray-200 text-gray-800 rounded-xl focus:ring-4 focus:ring-yellow-100 focus:border-[#FBC02D] block p-4 outline-none transition-all font-medium placeholder-gray-400" 
                onChange={handleInput} 
                required 
              />
            </div>

            {/* Row 3 - Passwords */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="relative">
                    <input 
                        name="password" 
                        type={showPass ? "text" : "password"} 
                        placeholder="Password" 
                        className="w-full bg-gray-50 border border-gray-200 text-gray-800 rounded-xl focus:ring-4 focus:ring-yellow-100 focus:border-[#FBC02D] block p-4 pr-10 outline-none transition-all font-medium placeholder-gray-400" 
                        onChange={handleInput} 
                        required 
                    />
                    <button 
                        type="button" 
                        onClick={() => setShowPass(!showPass)} 
                        className="absolute right-3 top-3.5 text-gray-400 hover:text-[#FBC02D] transition-colors"
                        tabIndex="-1"
                    >
                        {showPass ? <EyeSlashIcon /> : <EyeIcon />}
                    </button>
                </div>

                <div className="relative">
                    <input 
                        name="confirmPassword" 
                        type={showConfirmPass ? "text" : "password"} 
                        placeholder="Confirm" 
                        className="w-full bg-gray-50 border border-gray-200 text-gray-800 rounded-xl focus:ring-4 focus:ring-yellow-100 focus:border-[#FBC02D] block p-4 pr-10 outline-none transition-all font-medium placeholder-gray-400" 
                        onChange={handleInput} 
                        required 
                    />
                    <button 
                        type="button" 
                        onClick={() => setShowConfirmPass(!showConfirmPass)} 
                        className="absolute right-3 top-3.5 text-gray-400 hover:text-[#FBC02D] transition-colors"
                        tabIndex="-1"
                    >
                        {showConfirmPass ? <EyeSlashIcon /> : <EyeIcon />}
                    </button>
                </div>
            </div>

            {/* Location Button */}
            <button 
              type="button" 
              onClick={getLocation} 
              className={`w-full py-4 rounded-xl border-2 font-bold flex items-center justify-center gap-2 transition-all text-sm ${
                location.lat 
                  ? "border-green-500 bg-green-50 text-green-600 shadow-inner" 
                  : "border-dashed border-gray-300 text-gray-500 hover:bg-yellow-50 hover:border-[#FBC02D] hover:text-[#F9A825]"
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

            <button type="submit" disabled={loading} className="w-full text-white bg-gradient-to-r from-[#FBC02D] to-[#F57F17] hover:from-[#F9A825] hover:to-[#E65100] font-bold rounded-xl text-base px-5 py-4 shadow-lg hover:shadow-xl transition-all active:scale-95 disabled:opacity-70">
              {loading ? "Creating..." : "Sign Up"}
            </button>
          </form>

          <p className="text-center text-gray-500 text-sm mt-6 font-medium">
            Already a member? <Link href="/Login" className="text-[#FBC02D] font-bold hover:underline decoration-2 underline-offset-4">Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
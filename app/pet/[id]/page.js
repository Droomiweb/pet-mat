// app/pet/[id]/page.js
"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { auth } from "../../lib/firebase";
import Link from "next/link";
import Image from "next/image";
import { createConversationId } from "../../lib/chatUtils";
import ReactMarkdown from "react-markdown";
import jsPDF from "jspdf";
import { motion, AnimatePresence } from "framer-motion"; // ANIMATION LIBRARY

// --- ICONS & UI HELPERS ---
const SparklesIcon = () => <span className="text-yellow-400 text-xl animate-pulse">✨</span>;
const DownloadIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
);
const RefreshIcon = ({ spinning }) => (
  <svg className={`w-5 h-5 ${spinning ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
);
const AttributeBadge = ({ icon, label, textColor }) => (
  <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-2xl shadow-sm min-w-max border border-gray-50">
    <span className={`text-lg ${textColor}`}>{icon}</span>
    <span className="font-bold text-gray-700 text-sm">{label}</span>
  </div>
);

// --- GENETICS LOADING ANIMATION ---
const GeneticsLoader = () => (
  <div className="flex flex-col items-center justify-center py-10 space-y-4">
    <div className="relative w-20 h-20">
      <div className="absolute inset-0 border-4 border-purple-200 rounded-full animate-ping opacity-25"></div>
      <div className="absolute inset-0 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      <div className="absolute inset-0 flex items-center justify-center text-2xl">🧬</div>
    </div>
    <p className="text-sm font-bold text-purple-600 animate-pulse">Mixing Genetics...</p>
  </div>
);

// --- DR. PAWS MASCOT ANIMATION ---
const DrPawsMascot = ({ onClick }) => {
  return (
    <div className="fixed bottom-4 left-0 w-full pointer-events-none z-40 overflow-hidden h-32">
      <motion.div
        className="absolute bottom-0 cursor-pointer pointer-events-auto flex flex-col items-center"
        initial={{ x: -100 }}
        animate={{
          x: ["10vw", "80vw", "10vw"], // Walk across screen and back
          y: [0, -5, 0, -5, 0] // Bobbing effect (walking)
        }}
        transition={{
          x: { duration: 20, repeat: Infinity, ease: "linear" }, // Slow walk
          y: { duration: 0.5, repeat: Infinity, ease: "easeInOut" } // Fast bobbing
        }}
        onClick={onClick}
        whileHover={{ scale: 1.1 }}
      >
        {/* SPEECH BUBBLE */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.5 }}
          className="bg-white px-4 py-2 rounded-xl rounded-bl-none shadow-lg border border-purple-100 mb-2 relative"
        >
          <p className="text-xs font-black text-purple-600 whitespace-nowrap">Need Advice? 🐾</p>
          {/* Bubble Tail */}
          <div className="absolute -bottom-1.5 left-4 w-3 h-3 bg-white border-b border-r border-purple-100 transform rotate-45"></div>
        </motion.div>

        {/* DR PAWS SVG IMAGE (Flipped based on direction if needed, but simple CSS scaleX works for turning) */}
        <motion.div
          style={{ filter: "drop-shadow(0px 5px 5px rgba(0,0,0,0.2))" }}
          animate={{ scaleX: 1 }} // You can toggle this to -1 in the keyframes to make him face the other way if you want complex logic
        >
          <svg width="80" height="80" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Body */}
            <circle cx="50" cy="50" r="40" fill="#F3E5F5" />
            <circle cx="50" cy="50" r="35" fill="white" />

            {/* Dog Face */}
            <path d="M35 45C35 45 30 30 40 30C50 30 50 45 50 45" stroke="#333" strokeWidth="3" strokeLinecap="round" />
            <path d="M65 45C65 45 70 30 60 30C50 30 50 45 50 45" stroke="#333" strokeWidth="3" strokeLinecap="round" />
            <circle cx="40" cy="55" r="3" fill="#333" />
            <circle cx="60" cy="55" r="3" fill="#333" />
            <ellipse cx="50" cy="65" rx="6" ry="4" fill="#333" />
            <path d="M50 69V75" stroke="#333" strokeWidth="2" />
            <path d="M45 75C45 75 50 80 55 75" stroke="#333" strokeWidth="2" strokeLinecap="round" />

            {/* Stethoscope */}
            <path d="M30 80C30 80 30 90 50 90C70 90 70 80 70 80" stroke="#E91E63" strokeWidth="3" strokeLinecap="round" />
            <circle cx="50" cy="90" r="5" fill="#FFC107" />
            <path d="M30 80V60" stroke="#333" strokeWidth="2" />
            <path d="M70 80V60" stroke="#333" strokeWidth="2" />
          </svg>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default function PetDetailPage() {
  const [pet, setPet] = useState(null);

  // --- FORM STATES ---
  const [newMessage, setNewMessage] = useState("");
  const [quickMessage, setQuickMessage] = useState("");
  const [adoptForm, setAdoptForm] = useState({ housing: "Apartment", yard: "No", otherPets: "No", hoursAlone: "", vetContact: "", reason: "" });

  // --- LOADING STATES ---
  const [actionLoading, setActionLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [certLoading, setCertLoading] = useState(false);

  // --- MODAL STATES ---
  const [showAdoptionModal, setShowAdoptionModal] = useState(false);
  const [showAdvisorModal, setShowAdvisorModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);

  // --- DATA STATES ---
  const [requesterPets, setRequesterPets] = useState([]);
  const [requesterPetId, setRequesterPetId] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [generatedImage, setGeneratedImage] = useState(null);
  const [hasTriedGeneration, setHasTriedGeneration] = useState(false);

  const chatEndRef = useRef(null);
  const params = useParams();
  const router = useRouter();
  const user = auth.currentUser;

  // --- 1. DATA FETCHING ---
  const fetchPet = async () => {
    try {
      const res = await fetch(`/api/pet/${params.id}`);
      if (!res.ok) return router.push("/");
      const data = await res.json();
      setPet(data);
      if (user && data.listingType === "Mating") await fetchRequesterPets(user.uid, data.type, data.gender, data.breed);
    } catch (err) { console.error(err); }
  };

  const fetchRequesterPets = async (uid, petType, petGender, petBreed) => {
    try {
      const res = await fetch(`/api/pet/user/${uid}`);
      if (res.ok) {
        const pets = await res.json();
        // Strict Match Logic Mirroring Backend:
        // 1. Same Type, Opposite Gender
        // 2. Verified Only
        // 3. Not Pregnant
        // 4. Mating Listing
        // 5. Same Breed (Case insensitive)
        const compatible = pets.filter(p => {
          const isBreedMatch = p.breed?.trim().toLowerCase() === petBreed?.trim().toLowerCase();
          return (
            p.type === petType &&
            p.gender !== petGender &&
            p.listingType === "Mating" &&
            !p.isPregnant &&
            p.verificationStatus === 'verified' &&
            isBreedMatch
          );
        });

        setRequesterPets(compatible);
        if (compatible.length >= 1) setRequesterPetId(compatible[0]._id);
      }
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchPet(); }, [params.id, user?.uid]);

  // Auto-scroll chat
  useEffect(() => {
    if (showAdvisorModal) chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, showAdvisorModal]);

  useEffect(() => {
    if (showAdvisorModal && !generatedImage && requesterPetId && !hasTriedGeneration && !imageLoading) {
      handleGenerateOrFetchImage(false);
    }
  }, [showAdvisorModal, requesterPetId, generatedImage, hasTriedGeneration, imageLoading]);


  // --- 2. HANDLERS ---

  const handleStartChat = async () => {
    if (!user) return router.push("/Login");
    setActionLoading(true);
    try {
      const conversationId = createConversationId(pet._id, user.uid, pet.ownerId);
      await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          petId: pet._id, conversationId, senderId: user.uid,
          senderName: user.displayName || user.email.split("@")[0],
          text: quickMessage || `Hi! I'm interested in ${pet.name}.`,
        }),
      });
      router.push(`/messages/${conversationId}`);
    } catch (error) { alert("Error starting chat"); } finally { setActionLoading(false); }
  };

  const sendMatingRequest = async () => {
    if (!user) return alert("Please login first.");
    if (user.uid === pet.ownerId) return alert("Cannot request your own pet.");
    if (!requesterPetId) return alert("Please select which of your pets is making the request.");

    setActionLoading(true);
    try {
      const selectedPet = requesterPets.find(p => p._id === requesterPetId);
      const res = await fetch(`/api/pet/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "matingRequest", requesterId: user.uid, requesterName: user.email.split("@")[0],
          requesterPetId: requesterPetId, requesterPetName: selectedPet?.name, messageText: newMessage
        }),
      });
      if (res.ok) { alert("Mating request sent!"); setNewMessage(""); fetchPet(); }
    } catch (err) { console.error(err); } finally { setActionLoading(false); }
  };

  const handleAdoptionSubmit = async (e) => {
    e.preventDefault();
    if (!user) return router.push("/Login");
    setActionLoading(true);
    try {
      const res = await fetch(`/api/pet/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "adoptionRequest", requesterId: user.uid, requesterName: user.email.split("@")[0],
          messageText: adoptForm.reason, answers: Object.entries(adoptForm).map(([k, v]) => ({ question: k, answer: v }))
        }),
      });
      if (res.ok) { alert("Application submitted!"); setShowAdoptionModal(false); fetchPet(); }
      else { const data = await res.json(); alert(`Error: ${data.error}`); }
    } catch (err) { console.error(err); } finally { setActionLoading(false); }
  };

  const handleReportLost = async () => {
    const newStatus = !pet.isLost;
    if (!confirm(newStatus ? "🚨 Mark this pet as LOST?" : "✅ Confirm pet is found?")) return;
    setActionLoading(true);
    const sendStatus = async (lat, lng) => {
      try {
        await fetch("/api/pet/report-lost", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ petId: pet._id, userId: user.uid, status: newStatus, lastSeenLat: lat, lastSeenLng: lng })
        });
        alert("Status updated."); fetchPet();
      } catch (e) { console.error(e); } finally { setActionLoading(false); }
    };
    if (navigator.geolocation) navigator.geolocation.getCurrentPosition((pos) => sendStatus(pos.coords.latitude, pos.coords.longitude), () => sendStatus(null, null));
    else sendStatus(null, null);
  };

  const handleFoundPet = async () => {
    if (!user) return router.push("/Login");
    if (!confirm("Notify owner regarding found pet?")) return;
    setActionLoading(true);
    const sendAlert = async (lat, lng) => {
      try {
        const cid = createConversationId(pet._id, user.uid, pet.ownerId);
        let txt = `🚨 URGENT: I found ${pet.name}!`;
        if (lat) txt += ` Location: http://googleusercontent.com/maps.google.com/?q=${lat},${lng}`;
        await fetch("/api/chat", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ petId: pet._id, conversationId: cid, senderId: user.uid, senderName: user.displayName, text: txt })
        });
        router.push(`/messages/${cid}`);
      } catch (e) { alert("Error sending alert"); } finally { setActionLoading(false); }
    };
    if (navigator.geolocation) navigator.geolocation.getCurrentPosition((pos) => sendAlert(pos.coords.latitude, pos.coords.longitude), () => sendAlert(null, null));
    else sendAlert(null, null);
  };

  const handleViewLocation = () => {
    if (!pet.ownerLocation?.coordinates) return alert("Location unavailable.");
    const [lng, lat] = pet.ownerLocation.coordinates;
    window.open(`http://googleusercontent.com/maps.google.com/?q=${lat},${lng}`, "_blank");
  };

  const generateCertificate = () => {
    setCertLoading(true);
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    doc.setFontSize(22);
    doc.text(`Official PetLink Certificate: ${pet.name}`, 105, 100, { align: "center" });
    doc.save(`${pet.name}_Certificate.pdf`);
    setCertLoading(false);
  };

  // --- AI HANDLERS ---
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;
    const msg = chatInput;
    setChatInput("");
    setChatLoading(true);
    const userMsg = { role: "user", text: msg };
    setChatHistory(prev => [...prev, userMsg]);

    try {
      const myPetId = requesterPetId || requesterPets[0]?._id;
      const res = await fetch("/api/ai-advisor/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          petAId: myPetId,
          petBId: pet._id,
          userId: user.uid, // NEW: SECURITY ID
          history: chatHistory.map(h => ({ role: h.role, parts: [{ text: h.text || "..." }] })),
          message: msg
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.text) throw new Error(data.error || "Failed");
      setChatHistory(prev => [...prev, { role: "model", text: data.text }]);
    } catch (err) {
      console.error("Chat Error:", err);
      setChatHistory(prev => [...prev, { role: "model", text: "⚠️ *I'm having trouble connecting right now. Please try asking again in a moment.*" }]);
    } finally { setChatLoading(false); }
  };

  const handleGenerateOrFetchImage = async (forceRegenerate = false) => {
    const myPetId = requesterPetId || requesterPets[0]?._id;
    if (!myPetId) return;
    setImageLoading(true);
    setHasTriedGeneration(true);
    try {
      const res = await fetch("/api/ai-advisor/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          petAId: myPetId, petBId: pet._id, userId: user.uid, regenerate: forceRegenerate
        }),
      });
      const data = await res.json();
      if (data.imageUrl) setGeneratedImage(data.imageUrl);
      else console.warn("No image returned:", data.error);
    } catch (err) { console.error("Generation failed:", err); }
    finally { setImageLoading(false); }
  };

  const downloadImage = async () => {
    if (!generatedImage) return;
    try {
      const response = await fetch(generatedImage);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${pet.name}_offspring_prediction.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) { console.error("Download failed", err); }
  };

  // --- RENDER ---
  if (!pet) return <div className="min-h-screen flex items-center justify-center bg-[#E2F4EF]"><div className="w-12 h-12 border-4 border-[#4A90E2] border-t-transparent rounded-full animate-spin"></div></div>;

  const isOwner = user && user.uid === pet.ownerId;
  const isAdoption = pet.listingType === "Adoption";
  const hasPending = pet.adoptionRequests?.some(r => r.requesterId === user?.uid && r.status === "pending");

  return (
    <div className="min-h-screen bg-[#E2F4EF] font-sans pb-20 overflow-x-hidden selection:bg-pink-200 relative">

      {/* --- FLOATING MASCOT (Entry Point) --- */}
      {/* Only show if not already chatting and if user is logged in (optional) */}
      {!showAdvisorModal && (
        <DrPawsMascot onClick={() => setShowAdvisorModal(true)} />
      )}

      {/* --- IMAGE VIEWER MODAL --- */}
      {showImageModal && pet.imageUrls?.[0] && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md" onClick={() => setShowImageModal(false)}>
          <div className="relative w-[90%] h-[90%]"><Image src={pet.imageUrls[0]} alt={pet.name} fill className="object-contain" /></div>
        </div>
      )}

      {/* --- ADOPTION MODAL --- */}
      {showAdoptionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] p-8 max-w-lg w-full shadow-2xl border-4 border-white">
            <h2 className="text-2xl font-black text-gray-800 mb-4">Adopt {pet.name}</h2>
            <form onSubmit={handleAdoptionSubmit}>
              <textarea className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 mb-4 text-sm focus:ring-2 ring-blue-100 outline-none" rows={4} placeholder="Why are you a good fit?" value={adoptForm.reason} onChange={e => setAdoptForm({ ...adoptForm, reason: e.target.value })} required />
              <button disabled={actionLoading} className="w-full bg-[#4A90E2] text-white font-bold py-4 rounded-xl shadow-lg hover:scale-[1.02] transition">
                {actionLoading ? "Submitting..." : "Submit Application"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- DR. PAWS & GENETICS MODAL (REDESIGNED) --- */}
      {showAdvisorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md transition-all duration-300">
          <div className="bg-white rounded-[2rem] w-full max-w-5xl h-[85vh] flex overflow-hidden shadow-2xl ring-4 ring-white/50">
            {/* LEFT SIDE: VISUALIZER */}
            <div className="w-[40%] bg-gray-900 relative hidden md:flex flex-col border-r border-gray-800">
              <div className="p-6">
                <h2 className="text-white font-bold text-xl flex items-center gap-2">🧬 Genetic Prediction</h2>
                <p className="text-gray-400 text-xs mt-1">Based on phenotype analysis of both parents.</p>
              </div>
              <div className="flex-1 flex flex-col items-center justify-center p-6">
                {imageLoading ? (
                  <GeneticsLoader />
                ) : generatedImage ? (
                  <div className="relative w-full aspect-square rounded-xl overflow-hidden shadow-2xl ring-2 ring-purple-500/50 group">
                    <Image src={generatedImage} alt="Predicted Offspring" width={1024} height={1024} className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-110" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center p-4">
                      <p className="text-white text-xs font-bold">Generated with AI Flux Model</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-6 border-2 border-dashed border-gray-700 rounded-xl">
                    <span className="text-4xl">📸</span>
                    <p className="text-gray-400 text-sm mt-3">Visualize potential offspring</p>
                    <button onClick={() => handleGenerateOrFetchImage(false)} className="mt-4 px-6 py-2 bg-purple-600 text-white font-bold rounded-lg text-sm hover:bg-purple-500 transition">
                      Generate Preview
                    </button>
                  </div>
                )}
              </div>
              {generatedImage && (
                <div className="p-6 bg-gray-800/50 flex gap-3">
                  <button onClick={downloadImage} className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-sm transition"><DownloadIcon /> Save</button>
                  <button onClick={() => handleGenerateOrFetchImage(true)} className="flex-1 flex items-center justify-center gap-2 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-sm transition"><RefreshIcon spinning={imageLoading} /> Regenerate</button>
                </div>
              )}
            </div>

            {/* RIGHT SIDE: CHAT */}
            <div className="flex-1 flex flex-col bg-[#F8FAFC]">
              <div className="p-5 bg-white border-b border-gray-100 flex justify-between items-center shadow-sm z-10">
                <div>
                  <h2 className="font-black text-xl text-gray-800 flex items-center gap-2">Dr. Paws <span className="text-green-500 text-xs bg-green-50 px-2 py-1 rounded-full border border-green-100">Online</span></h2>
                  <p className="text-xs text-gray-500">Expert Geneticist & Vet Advisor</p>
                </div>
                <button onClick={() => setShowAdvisorModal(false)} className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center transition">✕</button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {chatHistory.length === 0 && (
                  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-center">
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl">🐶</div>
                    <h3 className="font-bold text-gray-800">Welcome to the Lab!</h3>
                    <p className="text-gray-600 text-sm mt-2">I can analyze compatibility, predict traits, and answer medical questions about {pet.name}.</p>
                  </div>
                )}
                {chatHistory.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${m.role === 'user' ? 'bg-purple-600 text-white rounded-br-none' : 'bg-white text-gray-700 border border-gray-100 rounded-bl-none'}`}>
                      <ReactMarkdown>{m.text}</ReactMarkdown>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-gray-100 flex gap-3">
                <input className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-5 py-3 outline-none focus:bg-white focus:ring-2 ring-purple-100 transition text-sm" value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Ask about health, temperament, or compatibility..." />
                <button disabled={chatLoading} className="bg-gray-900 text-white w-12 h-12 rounded-xl flex items-center justify-center hover:bg-black transition shadow-lg disabled:opacity-50">{chatLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "↑"}</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================================
          HERO & CONTENT
      ===================================================================================== */}
      <div className="max-w-[1200px] mx-auto pt-6 px-4 md:px-8">
        <div className="relative w-full rounded-[3rem] overflow-hidden shadow-sm bg-gray-200 h-[450px]">
          {pet.imageUrls?.[0] ? (
            <Image src={pet.imageUrls[0]} alt="Cover" fill className="object-cover" priority />
          ) : (
            <div className="w-full h-full bg-gray-300 flex items-center justify-center text-gray-400 font-bold">No Image</div>
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-white/90 via-white/40 to-transparent"></div>
          <div className="absolute inset-0 p-8 md:p-12 flex flex-col md:flex-row items-center">
            <div className="w-0 md:w-[280px] shrink-0"></div>
            <div className="flex-1 w-full z-10 pt-4 md:pt-0 pl-4">
              {pet.listingType !== "Adoption" && (
                <span className="inline-block bg-[#F48FB1] text-white text-[10px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-md mb-2 shadow-sm">
                  {pet.listingType} Listing
                </span>
              )}
              <h1 className="text-5xl md:text-7xl font-black text-[#2D3648] tracking-tight mb-2 drop-shadow-sm">{pet.name}</h1>
              <div className="flex items-center gap-3 text-lg font-bold text-gray-700 mb-6">
                <span>{pet.breed}</span><span className="w-2 h-2 rounded-full bg-gray-400"></span><span>{pet.age} Years Old</span>
              </div>
              <div className="flex flex-wrap gap-3 mb-6">
                <AttributeBadge icon={pet.gender === "Male" ? "♂" : "♀"} label={pet.gender} textColor={pet.gender === "Male" ? "text-blue-500" : "text-pink-500"} />
                <AttributeBadge icon="🛡️" label={pet.verificationStatus === "verified" ? "Verified" : "Unverified"} textColor="text-green-500" />
                <AttributeBadge icon="⚡" label={pet.energyLevel} textColor="text-yellow-500" />
              </div>
            </div>
            {!isOwner && (
              <button onClick={handleViewLocation} className="absolute right-8 top-1/2 -translate-y-1/2 bg-white px-6 py-3 rounded-full font-bold text-gray-700 shadow-lg hover:scale-105 transition flex items-center gap-2 hidden md:flex">
                <span className="text-red-500">📍</span> View Owner Location
              </button>
            )}
          </div>
        </div>

        <div className="relative -mt-36 ml-8 md:ml-16 z-20 w-max">
          <div className="w-56 h-56 md:w-72 md:h-72 rounded-full border-[10px] border-white shadow-2xl overflow-hidden bg-white relative">
            <button onClick={() => setShowImageModal(true)} className="w-full h-full relative block group cursor-zoom-in">
              <Image src={pet.imageUrls?.[0] || "/imgs/dog.jpg"} alt={pet.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-4 md:px-8 mt-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-8">
            {/* Personality */}
            <div className="bg-white rounded-[2.5rem] p-10 shadow-sm relative overflow-hidden">
              <h3 className="text-xl font-extrabold text-[#2D3648] mb-6 flex items-center gap-2"><SparklesIcon /> Personality Profile</h3>
              <div className="text-gray-600 text-lg leading-relaxed italic relative z-10">"{pet.aiProfileString || "No personality description provided."}"</div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-50 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
            </div>
            {/* History */}
            <div className="bg-white rounded-[2.5rem] p-10 shadow-sm">
              <h3 className="text-xl font-extrabold text-[#2D3648] mb-8">Activity History</h3>
              <div className="mb-8">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Medical History</h4>
                <div className="bg-[#F8FAFC] rounded-2xl p-6 border border-gray-100 text-sm text-gray-600">{pet.medicalHistoryLog || "No medical history recorded yet."}</div>
              </div>
              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">{isAdoption ? "Requests" : "Mating History"}</h4>
                {(!pet.matingHistory?.length && !pet.adoptionRequests?.length) ? (
                  <p className="text-gray-400 text-sm italic">No history.</p>
                ) : (
                  <div className="space-y-3">
                    {(isAdoption ? pet.adoptionRequests : pet.matingHistory).map((item, i) => (
                      <div key={i} className="flex justify-between items-center bg-[#F8FAFC] p-4 rounded-2xl text-sm border border-gray-100">
                        <span className="font-bold text-gray-700">{item.requesterName}</span>
                        <span className={`uppercase text-[10px] font-bold px-3 py-1 rounded-full ${item.status === 'accepted' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>{item.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-[2.5rem] p-8 shadow-sm">
              <h3 className="text-lg font-extrabold text-[#2D3648] mb-6">{isOwner ? "Owner Controls" : (isAdoption ? "Adoption Request" : "Mating Request")}</h3>
              {isOwner ? (
                <div className="space-y-3">
                  <Link href="/Profile" className="flex items-center justify-center w-full py-4 bg-gray-800 text-white font-bold rounded-2xl hover:bg-black transition">Edit Profile</Link>
                  <button onClick={handleReportLost} disabled={actionLoading} className={`w-full py-4 rounded-2xl font-bold text-white shadow-lg ${pet.isLost ? "bg-green-500" : "bg-red-500"}`}>{pet.isLost ? "Mark Found" : "Report Lost"}</button>
                  <button onClick={generateCertificate} disabled={certLoading} className="w-full py-4 border-2 border-[#4A90E2] text-[#4A90E2] font-bold rounded-2xl hover:bg-blue-50 transition">{certLoading ? "Generating..." : "Download Certificate"}</button>
                </div>
              ) : (
                <>
                  {pet.listingType === "Mating" && !requesterPets.length ? (
                    <div className="bg-[#FFF5F5] border border-red-100 rounded-2xl p-6 text-center">
                      <div className="text-red-500 font-bold text-lg mb-2">No Eligible Pets</div>
                      <p className="text-red-400 text-xs leading-relaxed font-medium">You need a non-pregnant, verified pet of the same species & opposite gender.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {pet.listingType === "Mating" && requesterPets.length > 1 && (
                        <select onChange={e => setRequesterPetId(e.target.value)} className="w-full p-4 bg-[#F8FAFC] rounded-2xl font-bold text-sm text-gray-700 outline-none focus:ring-2 ring-blue-100">
                          {requesterPets.map(p => <option key={p._id} value={p._id}>Use: {p.name}</option>)}
                        </select>
                      )}
                      {pet.listingType === "Mating" ? (
                        <>
                          <textarea value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Send a note..." className="w-full p-4 bg-[#F8FAFC] rounded-2xl text-sm h-32 resize-none outline-none focus:bg-white border border-transparent focus:border-blue-100 transition" />
                          <button onClick={sendMatingRequest} disabled={actionLoading} className="w-full py-4 bg-[#333333] text-white font-bold rounded-2xl shadow-lg hover:bg-black transition hover:scale-[1.02]">{actionLoading ? "Sending..." : "Send Request"}</button>
                          {/* REPLACED THE OLD BUTTON WITH THIS SUBTLE ONE, AS MASCOT IS NOW MAIN ENTRY */}
                          <button onClick={() => setShowAdvisorModal(true)} className="w-full py-4 bg-purple-50 text-purple-600 font-bold rounded-2xl hover:bg-purple-100 transition">AI Advisor Available (Click Mascot)</button>
                        </>
                      ) : (
                        <button onClick={() => setShowAdoptionModal(true)} disabled={hasPending || actionLoading} className={`w-full py-4 font-bold rounded-2xl shadow-lg text-white transition hover:scale-[1.02] ${hasPending ? "bg-green-500" : "bg-[#4A90E2]"}`}>
                          {hasPending ? "Pending..." : "Apply to Adopt"}
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
            {!isOwner && (
              <div className="bg-white rounded-[2.5rem] p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-6"><span className="text-2xl opacity-50">💬</span><h3 className="text-lg font-extrabold text-[#2D3648]">Contact Owner</h3></div>
                <input value={quickMessage} onChange={(e) => setQuickMessage(e.target.value)} type="text" placeholder={`Say hi to ${pet.name}'s owner...`} className="w-full bg-[#F8FAFC] text-gray-700 text-sm rounded-2xl px-5 py-5 mb-4 outline-none focus:bg-white focus:ring-2 ring-blue-50 transition-all" />
                <button onClick={pet.isLost ? handleFoundPet : handleStartChat} disabled={actionLoading} className="w-full bg-[#333333] hover:bg-black text-white font-bold py-4 rounded-2xl shadow-lg transition-transform active:scale-95">{actionLoading ? "Processing..." : (pet.isLost ? "I Found Them!" : "Send Message & Chat")}</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
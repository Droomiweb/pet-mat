"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { auth } from "../../lib/firebase";
import Link from "next/link";
import Image from "next/image";
import { createConversationId } from "../../lib/chatUtils";
import DownloadCertificate from "../../components/DownloadCertificate";
import ReactMarkdown from "react-markdown";

// --- UI COMPONENTS ---

const FeaturePill = ({ icon, label, value, color }) => (
  <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-3 sm:py-4 rounded-2xl border shadow-sm transition-all hover:scale-105 bg-white border-gray-100 min-w-0">
    <div
      className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-base sm:text-lg shrink-0 ${
        color || "bg-gray-100 text-gray-600"
      }`}
    >
      {icon}
    </div>
    <div className="flex flex-col leading-none min-w-0 overflow-hidden">
      <span className="text-[9px] sm:text-[10px] font-bold uppercase text-gray-400 tracking-wider mb-0.5 sm:mb-1 truncate">
        {label}
      </span>
      <span className="font-bold text-gray-800 text-xs sm:text-sm truncate">{value || "N/A"}</span>
    </div>
  </div>
);

const DNALoading = () => (
  <div className="flex flex-col items-center justify-center py-4">
    <div className="flex space-x-2 animate-pulse mb-2">
      <div className="w-3 h-3 rounded-full animate-bounce bg-pink-500"></div>
      <div className="w-3 h-3 rounded-full animate-bounce delay-75 bg-purple-500"></div>
      <div className="w-3 h-3 rounded-full animate-bounce delay-150 bg-blue-500"></div>
    </div>
    <p className="text-xs font-bold text-purple-600 animate-pulse">
      Analyzing Genes...
    </p>
  </div>
);

const SparklesIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 inline-block text-yellow-500 animate-pulse">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
  </svg>
);

export default function PetDetailPage() {
  const [pet, setPet] = useState(null);
  const [pedigree, setPedigree] = useState(null);

  // --- MESSAGE STATES ---
  const [newMessage, setNewMessage] = useState(""); 
  const [quickMessage, setQuickMessage] = useState(""); 

  // --- ADOPTION FORM STATES ---
  const [showAdoptionModal, setShowAdoptionModal] = useState(false);
  const [adoptForm, setAdoptForm] = useState({
    housing: "Apartment",
    yard: "No",
    otherPets: "No",
    hoursAlone: "",
    vetContact: "",
    reason: "",
  });
  const [actionLoading, setActionLoading] = useState(false);

  // --- AI ADVISOR STATES ---
  const [requesterPets, setRequesterPets] = useState([]);
  const [requesterPetId, setRequesterPetId] = useState("");
  const [showAdvisorModal, setShowAdvisorModal] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [geminiHistory, setGeminiHistory] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState(null);
  const [imageLoading, setImageLoading] = useState(false);

  // --- IMAGE MODAL STATE ---
  const [showImageModal, setShowImageModal] = useState(false);

  const chatEndRef = useRef(null);
  const params = useParams();
  const router = useRouter();
  const user = auth.currentUser;

  // --- HELPERS ---
  const getStatusBadge = (status) => {
    switch (status) {
      case "verified": return "bg-green-100 text-green-700 border-green-200";
      case "rejected": return "bg-red-100 text-red-700 border-red-200";
      default: return "bg-yellow-100 text-yellow-700 border-yellow-200";
    }
  };

  const handleViewLocation = () => {
    if (!pet.ownerLocation?.coordinates) return alert("Location unavailable.");
    const [lng, lat] = pet.ownerLocation.coordinates;
    window.open(`http://googleusercontent.com/maps.google.com/?q=${lat},${lng}`, "_blank");
  };

  // --- DATA FETCHING ---
  const fetchPet = async () => {
    try {
      const res = await fetch(`/api/pet/${params.id}`);
      if (!res.ok) return router.push("/");
      const data = await res.json();
      setPet(data);

      // Fetch Pedigree if parent data exists
      if (data.damId || data.sireId) {
        fetchPedigree(data._id);
      }

      if (user && data.listingType === "Mating") {
        await fetchRequesterPets(user.uid, data.type, data.gender);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPedigree = async (id) => {
    try {
      const res = await fetch(`/api/pedigree/${id}`);
      if (res.ok) {
        const data = await res.json();
        setPedigree(data);
      }
    } catch (err) {
      console.error("Pedigree fetch error:", err);
    }
  };

  const fetchRequesterPets = async (uid, petType, petGender) => {
    try {
      const petsRes = await fetch(`/api/pet/user/${uid}`);
      if (petsRes.ok) {
        const allPets = await petsRes.json();
        const compatiblePets = allPets.filter(
          (p) =>
            p.type === petType &&
            p.gender !== petGender &&
            p.listingType === "Mating" &&
            !p.isPregnant
        );
        setRequesterPets(compatiblePets);
        if (compatiblePets.length === 1) setRequesterPetId(compatiblePets[0]._id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchPet();
  }, [params.id, user?.uid]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  // --- ACTION HANDLERS ---

  // LOST & FOUND
  const handleReportLost = async () => {
    const newStatus = !pet.isLost;
    const confirmMsg = newStatus
      ? "🚨 ACTIVATE LOST MODE?\n\nThis will alert nearby users via WhatsApp."
      : "✅ Confirm pet is found?";

    if (!confirm(confirmMsg)) return;
    setActionLoading(true);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => { await sendLostRequest(newStatus, pos.coords.latitude, pos.coords.longitude); },
        async () => { await sendLostRequest(newStatus, null, null); }
      );
    } else {
      await sendLostRequest(newStatus, null, null);
    }
  };

  const sendLostRequest = async (status, lat, lng) => {
    try {
      const res = await fetch("/api/pet/report-lost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          petId: pet._id,
          userId: user.uid,
          status: status,
          lastSeenLat: lat,
          lastSeenLng: lng,
        }),
      });
      const data = await res.json();
      alert(data.message);
      fetchPet();
    } catch (err) {
      alert("Error updating status");
    } finally {
      setActionLoading(false);
    }
  };

  const handleFoundPet = async () => {
    if (!user) return router.push("/Login");
    const confirmFound = confirm("Send location to owner?");
    if (!confirmFound) return;

    setActionLoading(true);
    const sendFoundMessage = async (lat, lng) => {
      try {
        const conversationId = createConversationId(pet._id, user.uid, pet.ownerId);
        let messageText = `🚨 URGENT: I believe I have found your pet, ${pet.name}!`;
        if (lat && lng) {
            const mapLink = `http://googleusercontent.com/maps.google.com/?q=${lat},${lng}`;
            messageText += `\n\n📍 My Location: ${mapLink}`;
        } else {
            messageText += `\n\nPlease reply so we can coordinate.`;
        }

        await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            petId: pet._id,
            conversationId: conversationId,
            senderId: user.uid,
            senderName: user.displayName || user.email.split("@")[0],
            text: messageText,
          }),
        });

        alert("Alert sent! Redirecting to chat...");
        router.push(`/messages/${conversationId}`);
      } catch (error) {
        console.error(error);
        alert("Could not send message.");
      } finally {
        setActionLoading(false);
      }
    };

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => sendFoundMessage(pos.coords.latitude, pos.coords.longitude),
            () => sendFoundMessage(null, null)
        );
    } else {
        sendFoundMessage(null, null);
    }
  };

  // GENERAL CHAT
  const handleStartChat = async () => {
    if (!user) return router.push("/Login");
    setActionLoading(true);
    try {
      const conversationId = createConversationId(pet._id, user.uid, pet.ownerId);
      await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          petId: pet._id,
          conversationId: conversationId,
          senderId: user.uid,
          senderName: user.displayName || user.email.split("@")[0],
          text: quickMessage || "👋 Hi! I'd like to know more about your pet.",
        }),
      });
      router.push(`/messages/${conversationId}`);
    } catch (error) {
      console.error(error);
      alert("Could not start chat.");
    } finally {
      setActionLoading(false);
    }
  };

  // MATING REQUEST
  const sendMatingRequest = async () => {
    if (!user) return alert("Login first");
    if (user.uid === pet.ownerId) return alert("Cannot request your own pet.");
    if (pet.verificationStatus !== "verified") return alert("This pet is not verified.");

    const selectedRequesterPetId = requesterPets.length === 1 ? requesterPets[0]._id : requesterPetId;
    if (!selectedRequesterPetId) return alert("Please select your pet.");

    const selectedPet = requesterPets.find((p) => p._id === selectedRequesterPetId);

    try {
      const res = await fetch(`/api/pet/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "matingRequest",
          requesterId: user.uid,
          requesterName: user.email.split("@")[0],
          requesterPetId: selectedRequesterPetId,
          requesterPetName: selectedPet?.name,
          messageText: newMessage.trim() ? newMessage : undefined,
        }),
      });
      if (res.ok) {
        alert("Request sent!");
        setNewMessage("");
        fetchPet();
      } else alert("Failed to send.");
    } catch (err) { console.error(err); }
  };

  // ADOPTION REQUEST
  const handleAdoptionSubmit = async (e) => {
    e.preventDefault();
    if (!user) return router.push("/Login");
    setActionLoading(true);

    const answers = [
      { question: "Housing Type", answer: adoptForm.housing },
      { question: "Has Yard/Outdoor Space?", answer: adoptForm.yard },
      { question: "Has Other Pets?", answer: adoptForm.otherPets },
      { question: "Hours Pet will be Alone", answer: adoptForm.hoursAlone },
      { question: "Veterinarian Contact", answer: adoptForm.vetContact || "N/A" },
    ];

    try {
      const res = await fetch(`/api/pet/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "adoptionRequest",
          requesterId: user.uid,
          requesterName: user.email.split("@")[0],
          messageText: adoptForm.reason,
          answers: answers,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        alert("Application submitted!");
        setShowAdoptionModal(false);
        fetchPet();
      } else {
        alert(`Failed: ${data.error}`);
      }
    } catch (err) { console.error(err); } finally { setActionLoading(false); }
  };

  // AI ADVISOR
  const openAiAdvisor = () => {
    if (!requesterPetId && requesterPets.length !== 1) return alert("Select your pet first.");
    setShowAdvisorModal(true);
    if (chatHistory.length === 0) {
      setChatHistory([{ role: "model", text: `Hello! I'm Dr. Paws. How can I help compare ${pet.name} with your pet?` }]);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;
    const myPetId = requesterPetId || requesterPets[0]?._id;
    const userMsg = chatInput;
    setChatHistory((prev) => [...prev, { role: "user", text: userMsg }]);
    setChatInput("");
    setChatLoading(true);
    try {
      const res = await fetch("/api/ai-advisor/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          petAId: myPetId,
          petBId: pet._id,
          history: geminiHistory,
          message: userMsg,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setChatHistory((prev) => [...prev, { role: "model", text: data.text }]);
        setGeminiHistory((prev) => [
          ...prev.slice(-10),
          { role: "user", parts: [{ text: userMsg }] },
          { role: "model", parts: [{ text: data.text }] },
        ]);
      }
    } catch (err) { console.error(err); } finally { setChatLoading(false); }
  };

  const generateOffspringImage = async () => {
    const myPetId = requesterPetId || requesterPets[0]?._id;
    setImageLoading(true);
    setGeneratedImage(null);
    try {
      const res = await fetch("/api/ai-advisor/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ petAId: myPetId, petBId: pet._id }),
      });
      const data = await res.json();
      if (res.ok) setGeneratedImage(data.imageUrl);
    } catch (err) { console.error(err); } finally { setImageLoading(false); }
  };

  if (!pet)
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#E2F4EF]">
        <div className="w-12 h-12 border-4 border-[#4A90E2] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );

  const isOwner = user && user.uid === pet.ownerId;
  const isAdoptionListing = pet.listingType === "Adoption";
  const hasPendingAdoptionRequest = pet.adoptionRequests?.some(
    (req) => req.requesterId === user?.uid && req.status === "pending"
  );
  const isAdopted = !!pet.adoptionLog?.newOwnerId;
  const amINewOwner = isAdopted && user && user.uid === pet.adoptionLog?.newOwnerId;
  const showAdvisorButton = !isOwner && !isAdoptionListing && requesterPets.length > 0;

  const genderColor = pet.gender === "Male" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-pink-50 text-pink-700 border-pink-200";

  // --- FAMILY TREE NODE RENDERER ---
  const renderFamilyNode = (node, role) => {
    if (!node) return (
      <div className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-xl border border-dashed border-gray-200 h-full">
        <div className="w-10 h-10 rounded-full bg-gray-200 mb-2 opacity-50"></div>
        <span className="text-xs text-gray-400 font-bold text-center">{role}<br/><span className="font-normal text-[9px]">(Unknown)</span></span>
      </div>
    );
    return (
      <div className="flex flex-col items-center p-4 bg-white rounded-xl border border-gray-100 shadow-sm h-full hover:shadow-md transition-all">
        <div className="relative w-12 h-12 mb-2">
          <Image 
            src={node.imageUrls?.[0] || "/imgs/dog.jpg"} 
            alt={node.name} 
            fill 
            className="rounded-full object-cover border-2 border-white shadow-sm"
          />
        </div>
        <span className="text-sm font-bold text-gray-800 text-center leading-tight mb-1">{node.name}</span>
        <span className="text-[9px] text-[#4A90E2] uppercase tracking-wider font-bold mb-0.5">{role}</span>
        <span className="text-[9px] text-gray-400 text-center px-1 truncate w-full">{node.breed}</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#E2F4EF] pb-20">
      {/* --- LOST PET BANNER --- */}
      {pet.isLost && (
        <div className="bg-red-600 text-white p-4 text-center animate-pulse font-bold sticky top-0 z-50 shadow-xl">
          🚨 THIS PET IS REPORTED LOST! PLEASE CONTACT OWNER IF SEEN.
        </div>
      )}

      {/* --- IMAGE MODAL --- */}
      {showImageModal && pet.imageUrls?.[0] && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setShowImageModal(false)}
        >
          <button
            onClick={() => setShowImageModal(false)}
            className="absolute top-6 right-6 text-white/80 hover:text-white text-4xl font-bold z-10 transition-colors"
          >
            ×
          </button>
          <div className="relative w-full h-full max-w-6xl max-h-[90vh] p-4">
            <Image src={pet.imageUrls[0]} alt={pet.name} fill className="object-contain" priority />
          </div>
        </div>
      )}

      {/* --- ADOPTION MODAL --- */}
      {showAdoptionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl animate-in fade-in zoom-in max-h-[90vh] overflow-y-auto border border-white/20">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-extrabold text-gray-800">Adoption Form</h2>
              <button onClick={() => setShowAdoptionModal(false)} className="text-2xl text-gray-400 hover:text-gray-600 transition-colors">×</button>
            </div>
            <form onSubmit={handleAdoptionSubmit} className="space-y-4">
              <div>
                <label className="block mb-1 text-xs font-bold text-gray-500 uppercase tracking-wider">Reason</label>
                <textarea required className="input-field h-32 resize-none" placeholder="Tell us about your home..." value={adoptForm.reason} onChange={(e) => setAdoptForm({ ...adoptForm, reason: e.target.value })} />
              </div>
              {/* Additional fields can be added here */}
              <button type="submit" disabled={actionLoading} className="auth-btn mt-4 shadow-lg">{actionLoading ? "Sending..." : "Submit Application"}</button>
            </form>
          </div>
        </div>
      )}

      {/* --- AI ADVISOR MODAL --- */}
      {showAdvisorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] w-full max-w-2xl h-[90dvh] flex flex-col shadow-2xl overflow-hidden border-4 border-purple-50 animate-in zoom-in-95">
            <div className="p-5 bg-gradient-to-r from-purple-600 to-indigo-600 flex justify-between items-center text-white shadow-md shrink-0">
              <h2 className="font-bold text-lg flex items-center gap-2"><SparklesIcon /> AI Genetic Advisor</h2>
              <button onClick={() => setShowAdvisorModal(false)} className="text-2xl hover:text-gray-200 transition-colors">×</button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/50">
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-purple-100 text-center">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Offspring Prediction</h3>
                {generatedImage ? (
                  <div className="relative w-full h-56 rounded-xl overflow-hidden shadow-md group">
                    <img src={generatedImage} alt="Offspring" className="object-cover w-full h-full" />
                    <button onClick={generateOffspringImage} className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm px-4 py-1.5 rounded-full text-xs font-bold shadow-sm hover:bg-white transition-all text-purple-600">Regenerate</button>
                  </div>
                ) : imageLoading ? (
                  <DNALoading />
                ) : (
                  <button onClick={generateOffspringImage} className="px-6 py-3 bg-purple-50 text-purple-600 rounded-xl font-bold text-sm hover:bg-purple-100 transition shadow-sm border border-purple-100">Generate Visual Prediction</button>
                )}
              </div>
              <div className="space-y-4">
                {chatHistory.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${msg.role === "user" ? "bg-purple-600 text-white rounded-br-none" : "bg-white border border-gray-200 rounded-bl-none text-gray-700"}`}>
                      <ReactMarkdown>{msg.text}</ReactMarkdown>
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start"><div className="bg-white p-4 rounded-2xl shadow-sm"><div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce"></div></div></div>
                )}
              </div>
              <div ref={chatEndRef} />
            </div>
            <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-gray-100 flex gap-3 shrink-0">
              <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Ask Dr. Paws about genetics..." className="flex-1 input-field mb-0 bg-gray-50 border-gray-200" />
              <button type="submit" disabled={chatLoading} className="bg-purple-600 text-white w-12 h-12 rounded-xl flex items-center justify-center hover:bg-purple-700 transition shadow-lg disabled:opacity-50">→</button>
            </form>
          </div>
        </div>
      )}

      {/* --- HEADER IMAGE --- */}
      <button onClick={() => setShowImageModal(true)} className="relative h-[50vh] w-full overflow-hidden block group cursor-zoom-in outline-none">
        {pet.imageUrls?.[0] ? (
          <>
            <Image src={pet.imageUrls[0]} alt={pet.name} fill className={`object-cover transition-transform duration-700 group-hover:scale-105 ${pet.isLost ? "grayscale" : ""}`} priority />
            <div className="absolute inset-0 bg-gradient-to-t from-[#E2F4EF] via-transparent to-transparent pointer-events-none"></div>
            {pet.isLost && <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center"><h2 className="text-4xl md:text-6xl font-extrabold text-white drop-shadow-lg tracking-widest border-4 border-white p-4 rounded-xl -rotate-12">LOST</h2></div>}
          </>
        ) : (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400 font-bold">No Image Available</div>
        )}
      </button>

      {/* Floating Title Card */}
      <div className="absolute top-[50vh] -translate-y-full left-0 w-full p-4 sm:p-6 md:p-10 pointer-events-none">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-4 pointer-events-auto">
          <div className="animate-in slide-in-from-bottom duration-700">
            <span className={`inline-block px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider mb-2 sm:mb-3 text-white shadow-lg backdrop-blur-md ${pet.listingType === "Adoption" ? "bg-blue-500/90" : "bg-pink-500/90"}`}>
              {pet.listingType} Listing
            </span>
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold text-gray-900 mb-2 sm:mb-3 drop-shadow-sm tracking-tight break-words">
              {pet.name}
            </h1>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-gray-700 font-bold text-base sm:text-lg">
              <span>{pet.breed}</span>
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-gray-400"></span>
              <span>{pet.age} Years Old</span>
            </div>
          </div>
          {pet.ownerLocation?.coordinates && pet.ownerLocation.coordinates.length > 0 && !isOwner && (
            <button onClick={handleViewLocation} className="bg-white/90 backdrop-blur-xl text-[#333333] px-6 py-3 rounded-full font-bold shadow-xl hover:scale-105 transition-transform flex items-center gap-2 text-sm border border-white/50 w-full sm:w-auto justify-center">
              <span>📍</span> View Owner Location
            </button>
          )}
        </div>
      </div>

      {/* --- CONTENT CONTAINER --- */}
      <div className="max-w-5xl mx-auto px-4 md:px-8 -mt-8 relative z-10">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-10 animate-in slide-in-from-bottom duration-1000 delay-100">
          <FeaturePill icon={pet.gender === "Male" ? "♂️" : "♀️"} label="Gender" value={pet.gender} color={genderColor} />
          <FeaturePill icon="🛡️" label="Status" value={pet.verificationStatus === "verified" ? "Verified" : "Pending"} color={getStatusBadge(pet.verificationStatus)} />
          <FeaturePill icon="⚡" label="Energy" value={pet.energyLevel} />
          <FeaturePill icon="😊" label="Mood" value={pet.temperament} />
        </div>

        <div className="flex flex-col md:grid md:grid-cols-3 gap-6 md:gap-8">
          {/* --- LEFT COLUMN: INFO --- */}
          <div className="md:col-span-2 space-y-6 md:space-y-8 order-2 md:order-1">
            {/* AI Personality */}
            {pet.aiProfileString && (
              <div className="bg-white/80 backdrop-blur-xl p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-white animate-in fade-in duration-700">
                <h3 className="text-xl font-extrabold text-[#333333] mb-4 flex items-center gap-2"><span className="text-2xl">✨</span> Personality Profile</h3>
                <p className="text-base md:text-lg text-gray-600 italic leading-relaxed">"{pet.aiProfileString}"</p>
              </div>
            )}

            {/* Family Tree (Only if lineage exists) */}
            {pedigree && (
              <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                <h3 className="text-xl font-extrabold text-[#333333] mb-6 flex items-center gap-2"><span className="text-2xl">🌳</span> Family Tree</h3>
                <div className="flex flex-col items-center gap-4">
                  {/* Grandparents */}
                  <div className="grid grid-cols-4 gap-2 w-full">
                    {renderFamilyNode(pedigree.sire?.sire, "Grand-Sire")}
                    {renderFamilyNode(pedigree.sire?.dam, "Grand-Dam")}
                    {renderFamilyNode(pedigree.dam?.sire, "Grand-Sire")}
                    {renderFamilyNode(pedigree.dam?.dam, "Grand-Dam")}
                  </div>
                  {/* Parents */}
                  <div className="grid grid-cols-2 gap-4 w-full md:w-2/3">
                    {renderFamilyNode(pedigree.sire, "Sire (Father)")}
                    {renderFamilyNode(pedigree.dam, "Dam (Mother)")}
                  </div>
                  {/* The Pet */}
                  <div className="w-full md:w-1/3">
                    {renderFamilyNode(pet, "This Pet")}
                  </div>
                </div>
              </div>
            )}

            {/* History Sections (Cleaned up: No Public Messages) */}
            <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
              <h3 className="text-xl font-extrabold text-[#333333] mb-6">Activity History</h3>

              {/* Requests Log */}
              {!isAdoptionListing && (
                <div>
                  <h4 className="font-bold text-gray-400 text-xs uppercase tracking-wider mb-4">Mating History</h4>
                  {pet.matingHistory?.length === 0 ? (
                    <p className="text-gray-400 text-sm italic">No history.</p>
                  ) : (
                    <ul className="space-y-3">
                      {pet.matingHistory.map((mh, idx) => (
                        <li key={idx} className="text-sm text-gray-600 flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
                          <span className="font-medium truncate mr-2">{mh.requesterName} ({mh.requesterPetName})</span>
                          <span className={`font-bold uppercase text-[10px] px-2 py-1 rounded-md shrink-0 ${mh.status === "accepted" ? "bg-green-100 text-green-600" : "bg-gray-200 text-gray-500"}`}>{mh.status}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {isAdoptionListing && (
                <div>
                  <h4 className="font-bold text-gray-400 text-xs uppercase tracking-wider mb-4">Adoption Requests</h4>
                  {pet.adoptionRequests?.length === 0 ? (
                    <p className="text-gray-400 text-sm italic">No history.</p>
                  ) : (
                    <ul className="space-y-3">
                      {pet.adoptionRequests.map((req, idx) => (
                        <li key={idx} className="text-sm text-gray-600 flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
                          <span className="font-medium">Request #{idx + 1}</span>
                          <span className="font-bold uppercase text-[10px] px-2 py-1 rounded-md bg-blue-100 text-blue-600">{req.status}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* --- RIGHT COLUMN: ACTIONS (Sticky on Desktop) --- */}
          <div className="md:col-span-1 order-1 md:order-2">
            <div className="md:sticky md:top-24 space-y-6">
              {/* Primary Action Card */}
              <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-gray-100 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#4A90E2] to-[#50E3C2]"></div>
                <h3 className="font-extrabold text-gray-800 mb-6 text-lg">
                  {isOwner ? "Owner Controls" : isAdoptionListing ? "Adopt This Pet" : "Mating Request"}
                </h3>

                {isOwner ? (
                  <div className="space-y-3">
                    <Link href="/Profile" className="flex items-center justify-center w-full py-4 bg-gray-100 text-gray-700 font-bold rounded-xl text-center hover:bg-gray-200 transition gap-2"><span>⚙️</span> Manage in Profile</Link>
                    <button onClick={handleReportLost} disabled={actionLoading} className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 ${pet.isLost ? "bg-green-500 hover:bg-green-600" : "bg-red-600 hover:bg-red-700 animate-pulse"}`}>
                      {pet.isLost ? <><span>🏠</span> Mark as Found</> : <><span>🚨</span> Report Lost</>}
                    </button>
                  </div>
                ) : pet.isBanned ? (
                  <div className="bg-red-50 text-red-600 p-4 rounded-xl font-bold text-center border border-red-100">Listing Unavailable</div>
                ) : isAdoptionListing ? (
                  <button onClick={() => setShowAdoptionModal(true)} disabled={hasPendingAdoptionRequest} className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition transform active:scale-95 ${hasPendingAdoptionRequest ? "bg-green-500" : "bg-[#4A90E2] hover:bg-[#3A75B9]"}`}>
                    {hasPendingAdoptionRequest ? "Application Sent ✅" : "Apply to Adopt"}
                  </button>
                ) : (
                  <div className="space-y-4">
                    {requesterPets.length > 0 ? (
                      <>
                        {requesterPets.length > 1 && (
                          <div>
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1 mb-1 block">Select Your Pet</label>
                            <select className="input-field mb-0 bg-gray-50 border-gray-200 font-bold text-gray-700 cursor-pointer" onChange={(e) => setRequesterPetId(e.target.value)} value={requesterPetId}>
                              <option value="">Choose...</option>
                              {requesterPets.map((p) => (<option key={p._id} value={p._id}>{p.name}</option>))}
                            </select>
                          </div>
                        )}
                        <textarea value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Hi! I'd like to propose..." className="input-field min-h-[120px] bg-gray-50 border-gray-200 resize-none" />
                        <button onClick={sendMatingRequest} className="auth-btn w-full py-4 shadow-lg text-lg">Send Request</button>
                        {showAdvisorButton && (
                          <button onClick={openAiAdvisor} className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-2 hover:scale-[1.02] hover:shadow-xl"><span>🧬</span> AI Compatibility Check</button>
                        )}
                      </>
                    ) : (
                      <div className="bg-red-50 text-red-600 p-5 rounded-2xl text-sm text-center border border-red-100 shadow-sm"><strong className="block text-lg mb-1">No Eligible Pets</strong>You need a non-pregnant, verified pet of the same species & opposite gender.</div>
                    )}
                  </div>
                )}
              </div>

              {/* Contact Owner & Actions */}
              {!isOwner && (
                <div className="space-y-6">
                  {pet.isLost && (
                    <div className="bg-green-50 border-2 border-green-500 p-6 rounded-[2.5rem] shadow-lg text-center animate-pulse">
                      <h3 className="text-green-800 font-extrabold text-xl mb-2">Did you find {pet.name}?</h3>
                      <p className="text-green-700 text-sm mb-4">Help reunite them with their family!</p>
                      <button onClick={handleFoundPet} disabled={actionLoading} className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-lg">{actionLoading ? "Sending Alert..." : "👋 I Found This Pet!"}</button>
                    </div>
                  )}
                  <div className="bg-white/90 backdrop-blur-sm p-6 rounded-[2.5rem] shadow-md border border-gray-100">
                    <h3 className="font-extrabold text-gray-800 mb-4 flex items-center gap-2"><span>💬</span> Contact Owner</h3>
                    <textarea value={quickMessage} onChange={(e) => setQuickMessage(e.target.value)} placeholder={`Say hi to ${pet.name}'s owner...`} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm mb-3 resize-none outline-none focus:border-[#4A90E2] focus:bg-white transition-all" rows={2} />
                    <button onClick={handleStartChat} disabled={actionLoading} className="w-full py-3 bg-[#333333] text-white font-bold rounded-xl shadow-lg hover:bg-black transition-all flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95">{actionLoading ? "Connecting..." : "Send Message & Chat"}</button>
                  </div>
                </div>
              )}

              {/* Certificate Download (If Adopted) */}
              {isAdopted && amINewOwner && (
                <div className="bg-green-50 p-6 rounded-[2rem] border border-green-200 text-center shadow-md">
                  <h4 className="font-extrabold text-green-800 mb-1 text-lg">🎉 Adoption Complete!</h4>
                  <p className="text-green-600 text-sm mb-4">Welcome home, {pet.name}.</p>
                  <DownloadCertificate pet={pet} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
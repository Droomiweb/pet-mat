// app/pet/[id]/page.js
"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { auth } from "../../lib/firebase";
import Link from "next/link";
import Image from "next/image";
import { createConversationId } from "../../lib/chatUtils";
import DownloadCertificate from "../../components/DownloadCertificate";
import ReactMarkdown from "react-markdown"; // For rendering AI text

// --- ICONS ---
const MessageIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2}
    stroke="currentColor"
    className="w-5 h-5"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
    />
  </svg>
);
const HeartIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2}
    stroke="currentColor"
    className="w-5 h-5"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
    />
  </svg>
);
const LocationIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2}
    stroke="currentColor"
    className="w-5 h-5"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
    />
  </svg>
);
const DnaIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2}
    stroke="currentColor"
    className="w-5 h-5"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.327 24.327 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5"
    />
  </svg>
);

// --- UI SUB-COMPONENTS ---
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

const FeaturePill = ({ icon, label, value, color }) => (
  <div className="flex items-center gap-3 px-5 py-4 rounded-2xl border shadow-sm transition-all hover:scale-105 bg-white border-gray-100">
    <div
      className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
        color || "bg-gray-100 text-gray-600"
      }`}
    >
      {icon}
    </div>
    <div className="flex flex-col leading-none">
      <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider mb-1">
        {label}
      </span>
      <span className="font-bold text-gray-800 text-sm">{value || "N/A"}</span>
    </div>
  </div>
);

const VaccineRow = ({ name, date, status }) => {
  const statusColors = {
    active: "text-green-600 bg-green-50 border-green-200",
    upcoming: "text-yellow-600 bg-yellow-50 border-yellow-200",
    expired: "text-red-600 bg-red-50 border-red-200",
    "needs-review": "text-gray-600 bg-gray-50 border-gray-200",
  };
  return (
    <div className="flex justify-between items-center p-3 rounded-xl border border-dashed border-gray-200 hover:bg-gray-50 transition-colors">
      <div>
        <p className="font-bold text-gray-700 text-sm">{name}</p>
        <p className="text-[10px] text-gray-400">
          Given: {new Date(date).toLocaleDateString()}
        </p>
      </div>
      <span
        className={`text-[10px] font-extrabold px-2 py-1 rounded-lg border uppercase ${
          statusColors[status] || statusColors["needs-review"]
        }`}
      >
        {status}
      </span>
    </div>
  );
};

export default function PetDetailPage() {
  const [pet, setPet] = useState(null);

  // --- MESSAGE STATES ---
  const [newMessage, setNewMessage] = useState(""); // For Mating Proposals
  const [quickMessage, setQuickMessage] = useState(""); // For General Chat

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
      case "verified":
        return "bg-green-100 text-green-700 border-green-200";
      case "rejected":
        return "bg-red-100 text-red-700 border-red-200";
      default:
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
    }
  };

  const handleViewLocation = () => {
    if (!pet.ownerLocation?.coordinates)
      return alert("Location unavailable.");
    const [lng, lat] = pet.ownerLocation.coordinates;
    window.open(
      `http://googleusercontent.com/maps.google.com/?q=${lat},${lng}`,
      "_blank"
    );
  };

  // --- DATA FETCHING ---
  const fetchPet = async () => {
    try {
      const res = await fetch(`/api/pet/${params.id}`);
      if (!res.ok) return router.push("/");
      const data = await res.json();
      setPet(data);

      if (user && data.listingType === "Mating") {
        await fetchRequesterPets(user.uid, data.type, data.gender);
      }
    } catch (err) {
      console.error(err);
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
        if (compatiblePets.length === 1)
          setRequesterPetId(compatiblePets[0]._id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // --- ACTION HANDLERS ---

  // 1. LOST & FOUND LOGIC
  const handleReportLost = async () => {
    const newStatus = !pet.isLost;
    const confirmMsg = newStatus
      ? "🚨 ACTIVATE LOST MODE?\n\nThis will alert all nearby users via WhatsApp and display a high-priority banner."
      : "✅ Confirm pet is found?";

    if (!confirm(confirmMsg)) return;

    setActionLoading(true);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          await sendLostRequest(
            newStatus,
            pos.coords.latitude,
            pos.coords.longitude
          );
        },
        async (err) => {
          // If location denied, proceed without specific coords
          await sendLostRequest(newStatus, null, null);
        }
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

  // 2. START GENERAL CHAT
  const handleStartChat = async () => {
    if (!user) return router.push("/Login");
    setActionLoading(true);
    try {
      const conversationId = createConversationId(
        pet._id,
        user.uid,
        pet.ownerId
      );

      await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          petId: pet._id,
          conversationId: conversationId,
          senderId: user.uid,
          senderName: user.displayName || user.email.split("@")[0],
          text:
            quickMessage ||
            "👋 Hi! I'd like to know more about your pet.",
        }),
      });
      router.push(`/messages/${conversationId}`);
    } catch (error) {
      console.error("Chat error", error);
      alert("Could not start chat.");
    } finally {
      setActionLoading(false);
    }
  };

  // 3. MATING REQUEST
  const sendMatingRequest = async () => {
    if (!user) return alert("Login first");
    if (user.uid === pet.ownerId)
      return alert("Cannot request your own pet.");
    if (pet.verificationStatus !== "verified")
      return alert("This pet's certificate is not verified.");

    const selectedRequesterPetId =
      requesterPets.length === 1 ? requesterPets[0]._id : requesterPetId;
    if (!selectedRequesterPetId) return alert("Please select your pet.");

    const selectedPet = requesterPets.find(
      (p) => p._id === selectedRequesterPetId
    );

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
        alert("Mating request sent successfully!");
        setNewMessage("");
        fetchPet();
      } else alert("Failed to send request.");
    } catch (err) {
      console.error(err);
    }
  };

  // 4. ADOPTION REQUEST
  const handleAdoptionSubmit = async (e) => {
    e.preventDefault();
    if (!user) return router.push("/Login");
    setActionLoading(true);

    const answers = [
      { question: "Housing Type", answer: adoptForm.housing },
      { question: "Has Yard/Outdoor Space?", answer: adoptForm.yard },
      { question: "Has Other Pets?", answer: adoptForm.otherPets },
      {
        question: "Hours Pet will be Alone",
        answer: adoptForm.hoursAlone,
      },
      {
        question: "Veterinarian Contact",
        answer: adoptForm.vetContact || "N/A",
      },
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
        alert("Application submitted successfully!");
        setShowAdoptionModal(false);
        fetchPet();
      } else {
        alert(`Failed: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  // --- AI ADVISOR HANDLERS ---
  const openAiAdvisor = () => {
    if (!requesterPetId && requesterPets.length !== 1)
      return alert("Select your pet first.");
    setShowAdvisorModal(true);
    if (chatHistory.length === 0) {
      setChatHistory([
        {
          role: "model",
          text: `Hello! I'm Dr. Paws. How can I help compare ${pet.name} with your pet?`,
        },
      ]);
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
        setChatHistory((prev) => [
          ...prev,
          { role: "model", text: data.text },
        ]);
        setGeminiHistory((prev) => [
          ...prev.slice(-10),
          { role: "user", parts: [{ text: userMsg }] },
          { role: "model", parts: [{ text: data.text }] },
        ]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setChatLoading(false);
    }
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
    } catch (err) {
      console.error(err);
    } finally {
      setImageLoading(false);
    }
  };

  // --- EFFECTS ---
  useEffect(() => {
    fetchPet();
  }, [params.id, user?.uid]);
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  if (!pet)
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#E2F4EF]">
        <div className="w-12 h-12 border-4 border-[#4A90E2] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );

  // --- VIEW LOGIC ---
  const isOwner = user && user.uid === pet.ownerId;
  const isAdoptionListing = pet.listingType === "Adoption";
  const hasPendingAdoptionRequest = pet.adoptionRequests?.some(
    (req) => req.requesterId === user?.uid && req.status === "pending"
  );
  const isAdopted = !!pet.adoptionLog?.newOwnerId;
  const amINewOwner =
    isAdopted && user && user.uid === pet.adoptionLog?.newOwnerId;
  const showAdvisorButton =
    !isOwner && !isAdoptionListing && requesterPets.length > 0;

  const genderColor =
    pet.gender === "Male"
      ? "bg-blue-50 text-blue-700 border-blue-200"
      : "bg-pink-50 text-pink-700 border-pink-200";

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
            <Image
              src={pet.imageUrls[0]}
              alt={pet.name}
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>
      )}

      {/* --- ADOPTION MODAL --- */}
      {showAdoptionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl animate-in fade-in zoom-in max-h-[90vh] overflow-y-auto border border-white/20">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-extrabold text-gray-800">
                Adoption Form
              </h2>
              <button
                onClick={() => setShowAdoptionModal(false)}
                className="text-2xl text-gray-400 hover:text-gray-600 transition-colors"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleAdoptionSubmit} className="space-y-4">
              <div>
                <label className="block mb-1 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Why do you want to adopt?
                </label>
                <textarea
                  required
                  className="input-field h-32 resize-none"
                  placeholder="Tell us about your home..."
                  value={adoptForm.reason}
                  onChange={(e) =>
                    setAdoptForm({ ...adoptForm, reason: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Housing
                  </label>
                  <select
                    className="input-field"
                    value={adoptForm.housing}
                    onChange={(e) =>
                      setAdoptForm({
                        ...adoptForm,
                        housing: e.target.value,
                      })
                    }
                  >
                    <option>Apartment</option>
                    <option>House</option>
                    <option>Farm</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Yard?
                  </label>
                  <select
                    className="input-field"
                    value={adoptForm.yard}
                    onChange={(e) =>
                      setAdoptForm({ ...adoptForm, yard: e.target.value })
                    }
                  >
                    <option>No</option>
                    <option>Yes, Fenced</option>
                    <option>Yes, Unfenced</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Other Pets?
                  </label>
                  <select
                    className="input-field"
                    value={adoptForm.otherPets}
                    onChange={(e) =>
                      setAdoptForm({
                        ...adoptForm,
                        otherPets: e.target.value,
                      })
                    }
                  >
                    <option>No</option>
                    <option>Yes</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Hours Alone
                  </label>
                  <input
                    type="number"
                    className="input-field"
                    required
                    placeholder="e.g. 4"
                    value={adoptForm.hoursAlone}
                    onChange={(e) =>
                      setAdoptForm({
                        ...adoptForm,
                        hoursAlone: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div>
                <label className="block mb-1 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Vet Contact (Optional)
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Name & Phone"
                  value={adoptForm.vetContact}
                  onChange={(e) =>
                    setAdoptForm({
                      ...adoptForm,
                      vetContact: e.target.value,
                    })
                  }
                />
              </div>
              <button
                type="submit"
                disabled={actionLoading}
                className="auth-btn mt-4 shadow-lg"
              >
                {actionLoading ? "Sending..." : "Submit Application"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- AI ADVISOR MODAL --- */}
      {showAdvisorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] w-full max-w-2xl h-[85vh] flex flex-col shadow-2xl overflow-hidden border-4 border-purple-50 animate-in zoom-in-95">
            <div className="p-5 bg-gradient-to-r from-purple-600 to-indigo-600 flex justify-between items-center text-white shadow-md shrink-0">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <span>🧬</span> AI Genetic Advisor
              </h2>
              <button
                onClick={() => setShowAdvisorModal(false)}
                className="text-2xl hover:text-gray-200 transition-colors"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/50">
              {/* Image Gen Area */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-purple-100 text-center">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                  Offspring Prediction
                </h3>
                {generatedImage ? (
                  <div className="relative w-full h-56 rounded-xl overflow-hidden shadow-md group">
                    <img
                      src={generatedImage}
                      alt="Offspring"
                      className="object-cover w-full h-full"
                    />
                    <button
                      onClick={generateOffspringImage}
                      className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm px-4 py-1.5 rounded-full text-xs font-bold shadow-sm hover:bg-white transition-all text-purple-600"
                    >
                      Regenerate
                    </button>
                  </div>
                ) : imageLoading ? (
                  <DNALoading />
                ) : (
                  <button
                    onClick={generateOffspringImage}
                    className="px-6 py-3 bg-purple-50 text-purple-600 rounded-xl font-bold text-sm hover:bg-purple-100 transition shadow-sm border border-purple-100"
                  >
                    Generate Visual Prediction
                  </button>
                )}
              </div>
              {/* Chat */}
              <div className="space-y-4">
                {chatHistory.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${
                      msg.role === "user"
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                        msg.role === "user"
                          ? "bg-purple-600 text-white rounded-br-none"
                          : "bg-white border border-gray-200 rounded-bl-none text-gray-700"
                      }`}
                    >
                      {msg.role === "model" ? (
                        <ReactMarkdown
                          components={{
                            strong: ({ node, ...props }) => (
                              <span
                                className="font-bold text-gray-900"
                                {...props}
                              />
                            ),
                            ul: ({ node, ...props }) => (
                              <ul
                                className="list-disc pl-5 my-2"
                                {...props}
                              />
                            ),
                            li: ({ node, ...props }) => (
                              <li className="mb-1" {...props} />
                            ),
                            p: ({ node, ...props }) => (
                              <p className="mb-2 last:mb-0" {...props} />
                            ),
                          }}
                        >
                          {msg.text}
                        </ReactMarkdown>
                      ) : (
                        msg.text
                      )}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white p-4 rounded-2xl rounded-bl-none border border-gray-200 shadow-sm">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce delay-75"></div>
                        <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce delay-150"></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div ref={chatEndRef} />
            </div>
            <form
              onSubmit={handleSendMessage}
              className="p-4 bg-white border-t border-gray-100 flex gap-3 shrink-0"
            >
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask Dr. Paws about genetics..."
                className="flex-1 input-field mb-0 bg-gray-50 border-gray-200"
              />
              <button
                type="submit"
                disabled={chatLoading}
                className="bg-purple-600 text-white w-12 h-12 rounded-xl flex items-center justify-center hover:bg-purple-700 transition shadow-lg disabled:opacity-50"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-5 h-5"
                >
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- HEADER IMAGE & INFO (CLICKABLE FOR LIGHTBOX) --- */}
      <button
        onClick={() => setShowImageModal(true)}
        className="relative h-[50vh] w-full overflow-hidden block group cursor-zoom-in outline-none"
      >
        {pet.imageUrls?.[0] ? (
          <>
            <Image
              src={pet.imageUrls[0]}
              alt={pet.name}
              fill
              className={`object-cover transition-transform duration-700 group-hover:scale-105 ${
                pet.isLost ? "grayscale" : ""
              }`}
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#E2F4EF] via-transparent to-transparent pointer-events-none"></div>

            {/* LOST overlay */}
            {pet.isLost && (
              <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
                <h2 className="text-6xl font-extrabold text-white drop-shadow-lg tracking-widest border-4 border-white p-4 rounded-xl transform -rotate-12">
                  LOST
                </h2>
              </div>
            )}

            {/* Hover Hint */}
            <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10 flex items-center justify-center opacity-0 group-hover:opacity-100">
              <span className="bg-black/50 text-white px-4 py-2 rounded-full text-sm font-bold backdrop-blur-md flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-4 h-4"
                >
                  <path
                    fillRule="evenodd"
                    d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
                    clipRule="evenodd"
                  />
                </svg>
                View Full Photo
              </span>
            </div>
          </>
        ) : (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400 font-bold">
            No Image Available
          </div>
        )}
      </button>

      {/* Floating Title Card */}
      <div className="absolute top-[50vh] -translate-y-full left-0 w-full p-6 md:p-10 pointer-events-none">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-4 pointer-events-auto">
          <div className="animate-in slide-in-from-bottom duration-700">
            <span
              className={`inline-block px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider mb-3 text-white shadow-lg backdrop-blur-md ${
                pet.listingType === "Adoption"
                  ? "bg-blue-500/90"
                  : "bg-pink-500/90"
              }`}
            >
              {pet.listingType} Listing
            </span>
            <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 mb-3 drop-shadow-sm tracking-tight">
              {pet.name}
            </h1>
            <div className="flex items-center gap-4 text-gray-700 font-bold text-lg">
              <span>{pet.breed}</span>
              <span className="w-2 h-2 rounded-full bg-gray-400"></span>
              <span>{pet.age} Years Old</span>
            </div>
          </div>

          {/* Location Action */}
          {pet.ownerLocation?.coordinates &&
            pet.ownerLocation.coordinates.length > 0 &&
            !isOwner && (
              <button
                onClick={handleViewLocation}
                className="bg-white/90 backdrop-blur-xl text-[#333333] px-6 py-3 rounded-full font-bold shadow-xl hover:scale-105 transition-transform flex items-center gap-2 text-sm border border-white/50"
              >
                <span>📍</span> View Owner Location
              </button>
            )}
        </div>
      </div>

      {/* --- CONTENT CONTAINER --- */}
      <div className="max-w-5xl mx-auto px-4 md:px-8 -mt-8 relative z-10">
        {/* --- STATS GRID --- */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10 animate-in slide-in-from-bottom duration-1000 delay-100">
          <FeaturePill
            icon={pet.gender === "Male" ? "♂️" : "♀️"}
            label="Gender"
            value={pet.gender}
            color={genderColor}
          />
          <FeaturePill
            icon="🛡️"
            label="Status"
            value={
              pet.verificationStatus === "verified"
                ? "Verified"
                : "Pending"
            }
            color={getStatusBadge(pet.verificationStatus)}
          />
          <FeaturePill icon="⚡" label="Energy" value={pet.energyLevel} />
          <FeaturePill
            icon="😊"
            label="Mood"
            value={pet.temperament}
          />
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* --- LEFT COLUMN: INFO --- */}
          <div className="md:col-span-2 space-y-8">
            {/* AI Personality */}
            {pet.aiProfileString && (
              <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-sm border border-white animate-in fade-in duration-700">
                <h3 className="text-xl font-extrabold text-[#333333] mb-4 flex items-center gap-2">
                  <span className="text-2xl">✨</span> Personality
                  Profile
                </h3>
                <p className="text-lg text-gray-600 italic leading-relaxed">
                  "{pet.aiProfileString}"
                </p>
              </div>
            )}

            {/* History Sections */}
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
              <h3 className="text-xl font-extrabold text-[#333333] mb-6">
                Activity History
              </h3>

              {/* Message Log */}
              <div className="mb-8">
                <h4 className="font-bold text-gray-400 text-xs uppercase tracking-wider mb-4">
                  Public Messages
                </h4>
                {pet.messages?.length === 0 ? (
                  <p className="text-gray-400 text-sm italic">
                    No messages yet.
                  </p>
                ) : (
                  <div className="space-y-4 max-h-64 overflow-y-auto pr-2">
                    {pet.messages?.map((msg, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-2xl bg-gray-50 border border-gray-100 text-sm shadow-sm"
                      >
                        <div className="flex justify-between mb-1">
                          <span className="font-bold text-gray-800">
                            {msg.senderName}
                          </span>
                          <span className="text-[10px] text-gray-400 font-medium uppercase">
                            {new Date(
                              msg.sentAt
                            ).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-gray-600 leading-relaxed">
                          {msg.text}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Requests Log */}
              {!isAdoptionListing && (
                <div>
                  <h4 className="font-bold text-gray-400 text-xs uppercase tracking-wider mb-4">
                    Mating History
                  </h4>
                  {pet.matingHistory?.length === 0 ? (
                    <p className="text-gray-400 text-sm italic">
                      No history.
                    </p>
                  ) : (
                    <ul className="space-y-3">
                      {pet.matingHistory.map((mh, idx) => (
                        <li
                          key={idx}
                          className="text-sm text-gray-600 flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100"
                        >
                          <span className="font-medium">
                            {mh.requesterName} ({mh.requesterPetName})
                          </span>
                          <span
                            className={`font-bold uppercase text-[10px] px-2 py-1 rounded-md ${
                              mh.status === "accepted"
                                ? "bg-green-100 text-green-600"
                                : "bg-gray-200 text-gray-500"
                            }`}
                          >
                            {mh.status}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {isAdoptionListing && (
                <div>
                  <h4 className="font-bold text-gray-400 text-xs uppercase tracking-wider mb-4">
                    Adoption Requests
                  </h4>
                  {pet.adoptionRequests?.length === 0 ? (
                    <p className="text-gray-400 text-sm italic">
                      No history.
                    </p>
                  ) : (
                    <ul className="space-y-3">
                      {pet.adoptionRequests.map((req, idx) => (
                        <li
                          key={idx}
                          className="text-sm text-gray-600 flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100"
                        >
                          <span className="font-medium">
                            Request #{idx + 1}
                          </span>
                          <span className="font-bold uppercase text-[10px] px-2 py-1 rounded-md bg-blue-100 text-blue-600">
                            {req.status}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* --- RIGHT COLUMN: ACTIONS (Sticky) --- */}
          <div className="md:col-span-1">
            <div className="sticky top-24 space-y-6">
              {/* Primary Action Card */}
              <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-gray-100 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#4A90E2] to-[#50E3C2]"></div>
                <h3 className="font-extrabold text-gray-800 mb-6 text-lg">
                  {isOwner
                    ? "Owner Controls"
                    : isAdoptionListing
                    ? "Adopt This Pet"
                    : "Mating Request"}
                </h3>

                {isOwner ? (
                  <div className="space-y-3">
                    <Link
                      href="/Profile"
                      className="flex items-center justify-center w-full py-4 bg-gray-100 text-gray-700 font-bold rounded-xl text-center hover:bg-gray-200 transition gap-2"
                    >
                      <span>⚙️</span> Manage in Profile
                    </Link>

                    {/* LOST PET BUTTON */}
                    <button
                      onClick={handleReportLost}
                      disabled={actionLoading}
                      className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 ${
                        pet.isLost
                          ? "bg-green-500 hover:bg-green-600"
                          : "bg-red-600 hover:bg-red-700 animate-pulse"
                      }`}
                    >
                      {pet.isLost ? (
                        <>
                          <span>🏠</span> Mark as Found
                        </>
                      ) : (
                        <>
                          <span>🚨</span> Report Lost
                        </>
                      )}
                    </button>
                  </div>
                ) : pet.isBanned ? (
                  <div className="bg-red-50 text-red-600 p-4 rounded-xl font-bold text-center border border-red-100">
                    Listing Unavailable
                  </div>
                ) : isAdoptionListing ? (
                  // Adoption Action
                  <button
                    onClick={() => setShowAdoptionModal(true)}
                    disabled={hasPendingAdoptionRequest}
                    className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition transform active:scale-95 ${
                      hasPendingAdoptionRequest
                        ? "bg-green-500"
                        : "bg-[#4A90E2] hover:bg-[#3A75B9]"
                    }`}
                  >
                    {hasPendingAdoptionRequest
                      ? "Application Sent ✅"
                      : "Apply to Adopt"}
                  </button>
                ) : (
                  // Mating Action
                  <div className="space-y-4">
                    {requesterPets.length > 0 ? (
                      <>
                        {requesterPets.length > 1 && (
                          <div>
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1 mb-1 block">
                              Select Your Pet
                            </label>
                            <select
                              className="input-field mb-0 bg-gray-50 border-gray-200 font-bold text-gray-700 cursor-pointer"
                              onChange={(e) =>
                                setRequesterPetId(e.target.value)
                              }
                              value={requesterPetId}
                            >
                              <option value="">Choose...</option>
                              {requesterPets.map((p) => (
                                <option key={p._id} value={p._id}>
                                  {p.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                        <textarea
                          value={newMessage}
                          onChange={(e) =>
                            setNewMessage(e.target.value)
                          }
                          placeholder="Hi! I'd like to propose..."
                          className="input-field min-h-[120px] bg-gray-50 border-gray-200 resize-none"
                        />
                        <button
                          onClick={sendMatingRequest}
                          className="auth-btn w-full py-4 shadow-lg text-lg"
                        >
                          Send Request
                        </button>

                        {showAdvisorButton && (
                          <button
                            onClick={openAiAdvisor}
                            className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-2 hover:scale-[1.02] hover:shadow-xl"
                          >
                            <span>🧬</span> AI Compatibility Check
                          </button>
                        )}
                      </>
                    ) : (
                      <div className="bg-red-50 text-red-600 p-5 rounded-2xl text-sm text-center border border-red-100 shadow-sm">
                        <strong className="block text-lg mb-1">
                          No Eligible Pets
                        </strong>
                        You need a non-pregnant, verified pet of the
                        same species & opposite gender.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Contact Owner */}
              {!isOwner && (
                <div className="bg-white/90 backdrop-blur-sm p-6 rounded-[2.5rem] shadow-md border border-gray-100">
                  <h3 className="font-extrabold text-gray-800 mb-4 flex items-center gap-2">
                    <span>💬</span> Contact Owner
                  </h3>
                  <textarea
                    value={quickMessage}
                    onChange={(e) =>
                      setQuickMessage(e.target.value)
                    }
                    placeholder={`Say hi to ${pet.name}'s owner...`}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm mb-3 resize-none outline-none focus:border-[#4A90E2] focus:bg-white transition-all"
                    rows={2}
                  />
                  <button
                    onClick={handleStartChat}
                    disabled={actionLoading}
                    className="w-full py-3 bg-[#333333] text-white font-bold rounded-xl shadow-lg hover:bg-black transition-all flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95"
                  >
                    {actionLoading
                      ? "Connecting..."
                      : "Send Message & Chat"}
                  </button>
                </div>
              )}

              {/* Certificate Download (If Adopted) */}
              {isAdopted && amINewOwner && (
                <div className="bg-green-50 p-6 rounded-[2rem] border border-green-200 text-center shadow-md">
                  <h4 className="font-extrabold text-green-800 mb-1 text-lg">
                    🎉 Adoption Complete!
                  </h4>
                  <p className="text-green-600 text-sm mb-4">
                    Welcome home, {pet.name}.
                  </p>
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

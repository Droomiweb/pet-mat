// app/pet/[id]/page.js
"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { auth } from "../../lib/firebase";
import Link from "next/link";
import { createConversationId } from "../../lib/chatUtils";
import DownloadCertificate from "../../components/DownloadCertificate"; // <-- NEW IMPORT

// --- Helper Component: DNA Loading ---
const DNALoading = () => (
  <div className="flex flex-col items-center justify-center py-4">
    <div className="flex space-x-2 animate-pulse mb-2">
      <div className="w-3 h-3 rounded-full animate-bounce bg-pink-500"></div>
      <div className="w-3 h-3 rounded-full animate-bounce delay-75 bg-purple-500"></div>
      <div className="w-3 h-3 rounded-full animate-bounce delay-150 bg-blue-500"></div>
    </div>
    <p className="text-xs font-bold text-purple-600 animate-pulse">Mixing Genes...</p>
  </div>
);

// --- Helper Component: Pedigree Card ---
function PedigreeCard({ pet, title }) {
  if (!pet) {
    return (
      <div className="p-3 text-center bg-gray-50 rounded-lg shadow-inner">
        <p className="font-bold text-gray-500">{title}</p>
        <p className="text-sm text-gray-400">Unknown</p>
      </div>
    );
  }
  return (
    <Link
      href={`/pet/${pet._id}`}
      className="block p-3 bg-white rounded-lg shadow-md hover:shadow-lg hover:scale-105 transition-transform"
    >
      <p className="font-bold text-[#4A90E2]">{title}</p>
      <div className="flex items-center gap-3 mt-2">
        <img
          src={pet.imageUrls?.[0] || "/imgs/profile.jpg"}
          alt={pet.name}
          className="w-12 h-12 border-2 border-[#50E3C2] rounded-full object-cover"
        />
        <div>
          <p className="font-semibold text-primary">{pet.name}</p>
          <p className="text-sm text-gray-600">{pet.breed}</p>
        </div>
      </div>
    </Link>
  );
}

export default function PetDetailPage() {
  const [pet, setPet] = useState(null);
  const [pedigree, setPedigree] = useState(null);
  const [newMessage, setNewMessage] = useState(""); // Used for mating message

  // --- NEW: ADOPTION FORM STATES ---
  const [showAdoptionModal, setShowAdoptionModal] = useState(false);
  const [adoptForm, setAdoptForm] = useState({
    housing: "Apartment",
    yard: "No",
    otherPets: "No",
    hoursAlone: "",
    vetContact: "",
    reason: "",
  });
  const [adoptLoading, setAdoptLoading] = useState(false);

  // --- AI CHAT ADVISOR STATES ---
  const [requesterPets, setRequesterPets] = useState([]);
  const [requesterPetId, setRequesterPetId] = useState("");
  const [showAdvisorModal, setShowAdvisorModal] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [geminiHistory, setGeminiHistory] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState(null);
  const [imageLoading, setImageLoading] = useState(false);

  const chatEndRef = useRef(null);
  const params = useParams();
  const router = useRouter();
  const user = auth.currentUser;

  // --- Helpers ---
  const handleStartChat = () => {
    if (!user) return router.push("/Login");
    if (!pet) return;
    const conversationId = createConversationId(pet._id, user.uid, pet.ownerId);
    router.push(`/messages/${conversationId}`);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "verified":
        return "bg-green-100 text-green-700 border-green-400";
      case "rejected":
        return "bg-red-100 text-red-700 border-red-400";
      default:
        return "bg-yellow-100 text-yellow-700 border-yellow-400";
    }
  };

  // --- Data Fetching ---
  const fetchPet = async () => {
    try {
      const res = await fetch(`/api/pet/${params.id}`);
      if (!res.ok) return router.push("/");
      const data = await res.json();
      setPet(data);

      if (user && data.listingType === "Mating") {
        await fetchRequesterPets(user.uid, data.type, data.gender);
      }
      await fetchPedigree(params.id);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPedigree = async (petId) => {
    try {
      const res = await fetch(`/api/pedigree/${petId}`);
      if (res.ok) setPedigree(await res.json());
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
            p.listingType === "Mating"
        );
        setRequesterPets(compatiblePets);
        if (compatiblePets.length === 1) setRequesterPetId(compatiblePets[0]._id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // --- Actions ---
  const sendMatingRequest = async () => {
    if (!user) return alert("Login first");
    if (user.uid === pet.ownerId) return alert("Cannot request your own pet.");
    if (pet.verificationStatus !== "verified")
      return alert("This pet's certificate is not yet verified.");

    const selectedRequesterPetId =
      requesterPets.length === 1 ? requesterPets[0]._id : requesterPetId;
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
        alert("Mating request sent successfully!");
        setNewMessage("");
        fetchPet();
      } else alert("Failed to send request.");
    } catch (err) {
      console.error(err);
    }
  };

  const handleAdoptionSubmit = async (e) => {
    e.preventDefault();
    if (!user) return router.push("/Login");
    setAdoptLoading(true);

    // Prepare the QA array
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
          messageText: adoptForm.reason, // Main reason is the 'message'
          answers: answers, // Send structured data
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
      setAdoptLoading(false);
    }
  };

  const handleViewLocation = () => {
    if (!pet.ownerLocation?.coordinates)
      return alert("Location unavailable.");
    const [lng, lat] = pet.ownerLocation.coordinates;
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, "_blank");
  };

  // --- AI Advisor Handlers ---
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

  useEffect(() => {
    fetchPet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, user?.uid]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  if (!pet) return <p className="mt-20 text-center">Loading...</p>;

  const isOwner = user && user.uid === pet.ownerId;
  const genderColor =
    pet.gender === "Male"
      ? "bg-blue-200 text-blue-800"
      : "bg-pink-200 text-pink-800";
  const isAdoptionListing = pet.listingType === "Adoption";
  const canSendRequest =
    pet.verificationStatus === "verified" && requesterPets.length > 0;
  const hasPendingAdoptionRequest = pet.adoptionRequests?.some(
    (req) => req.requesterId === user?.uid && req.status === "pending"
  );

  // --- NEW: Adoption status + new owner check ---
  const isAdopted = !!pet.adoptionLog?.newOwnerId;
  const amINewOwner =
    isAdopted && user && user.uid === pet.adoptionLog?.newOwnerId;

  // Determine if advisor button should be shown
  const showAdvisorButton =
    !isOwner && !isAdoptionListing && requesterPets.length > 0;

  return (
    <div className="relative min-h-screen p-4 bg-[#F4F7F9] md:p-10">
      {/* --- ADOPTION APPLICATION MODAL (NEW) --- */}
      {showAdoptionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl animate-in fade-in zoom-in overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between mb-6 border-b pb-2">
              <h2 className="text-2xl font-bold text-[#333333]">
                Adoption Application
              </h2>
              <button
                onClick={() => setShowAdoptionModal(false)}
                className="text-3xl text-gray-400"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAdoptionSubmit} className="space-y-4">
              <div>
                <label className="block mb-1 text-sm font-bold text-gray-700">
                  Why do you want to adopt {pet.name}?
                </label>
                <textarea
                  required
                  className="input-style w-full h-24"
                  placeholder="Tell us about yourself and why you are a good match..."
                  value={adoptForm.reason}
                  onChange={(e) =>
                    setAdoptForm({ ...adoptForm, reason: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 text-sm font-bold text-gray-700">
                    Housing
                  </label>
                  <select
                    className="input-style w-full"
                    value={adoptForm.housing}
                    onChange={(e) =>
                      setAdoptForm({ ...adoptForm, housing: e.target.value })
                    }
                  >
                    <option>Apartment</option>
                    <option>House</option>
                    <option>Farm</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1 text-sm font-bold text-gray-700">
                    Has Yard?
                  </label>
                  <select
                    className="input-style w-full"
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
                  <label className="block mb-1 text-sm font-bold text-gray-700">
                    Other Pets?
                  </label>
                  <select
                    className="input-style w-full"
                    value={adoptForm.otherPets}
                    onChange={(e) =>
                      setAdoptForm({ ...adoptForm, otherPets: e.target.value })
                    }
                  >
                    <option>No</option>
                    <option>Yes</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1 text-sm font-bold text-gray-700">
                    Hours Alone (Daily)
                  </label>
                  <input
                    type="number"
                    className="input-style w-full"
                    required
                    placeholder="e.g. 4"
                    value={adoptForm.hoursAlone}
                    onChange={(e) =>
                      setAdoptForm({ ...adoptForm, hoursAlone: e.target.value })
                    }
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1 text-sm font-bold text-gray-700">
                  Veterinarian Contact (Optional)
                </label>
                <input
                  type="text"
                  className="input-style w-full"
                  placeholder="Name & Phone of Vet"
                  value={adoptForm.vetContact}
                  onChange={(e) =>
                    setAdoptForm({ ...adoptForm, vetContact: e.target.value })
                  }
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAdoptionModal(false)}
                  className="flex-1 py-3 font-bold text-gray-700 bg-gray-200 rounded-xl hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adoptLoading}
                  className="flex-1 py-3 font-bold text-white bg-[#4A90E2] rounded-xl hover:bg-[#3A75B9] shadow-lg"
                >
                  {adoptLoading ? "Submitting..." : "Submit Application"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- AI ADVISOR MODAL --- */}
      {showAdvisorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-2xl w-full h-[85vh] flex flex-col shadow-2xl overflow-hidden border-4 border-purple-100">
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-600 to-indigo-600 shrink-0">
              <h2 className="flex items-center gap-2 text-xl font-bold text-white">
                🧬 Genetic Mating Advisor
              </h2>
              <button
                onClick={() => setShowAdvisorModal(false)}
                className="text-2xl text-white"
              >
                ×
              </button>
            </div>
            <div className="flex-1 p-4 space-y-4 overflow-y-auto bg-gray-50">
              <div className="p-4 text-center bg-white rounded-xl shadow-sm border border-purple-100">
                <h3 className="mb-3 text-sm font-bold text-gray-700">
                  Predicted Offspring Look
                </h3>
                {generatedImage ? (
                  <div className="relative w-full h-64 overflow-hidden rounded-lg shadow-md group">
                    <img
                      src={generatedImage}
                      alt="Offspring"
                      className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-105"
                    />
                    <button
                      onClick={generateOffspringImage}
                      className="absolute bottom-2 right-2 p-2 text-xs font-bold bg-white/90 rounded-full hover:bg-white"
                    >
                      🔄 Regenerate
                    </button>
                  </div>
                ) : imageLoading ? (
                  <DNALoading />
                ) : (
                  <div className="flex flex-col items-center justify-center h-32 bg-purple-50 rounded-lg border-2 border-dashed border-purple-200">
                    <button
                      onClick={generateOffspringImage}
                      className="flex items-center gap-2 px-6 py-2 font-bold text-white bg-gradient-to-r from-pink-500 to-purple-600 rounded-full shadow-lg hover:scale-105 transition transform"
                    >
                      <span>✨</span> Generate Offspring Image
                    </button>
                    <p className="mt-2 text-xs text-gray-500">
                      AI will predict features based on both parents
                    </p>
                  </div>
                )}
              </div>
              {chatHistory.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-purple-600 text-white rounded-br-none"
                        : "bg-white text-gray-800 border border-gray-200 rounded-bl-none shadow-sm"
                    }`}
                  >
                    {msg.role === "model" && (
                      <span className="block mb-1 text-xs font-bold text-purple-600">
                        Dr. Paws AI
                      </span>
                    )}
                    {msg.text}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="p-3 bg-white rounded-2xl rounded-bl-none shadow-sm border border-gray-200">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 rounded-full animate-bounce bg-gray-400"></div>
                      <div className="w-2 h-2 rounded-full animate-bounce delay-75 bg-gray-400"></div>
                      <div className="w-2 h-2 rounded-full animate-bounce delay-150 bg-gray-400"></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <form
              onSubmit={handleSendMessage}
              className="flex gap-2 p-4 bg-white border-t border-gray-200 shrink-0"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask about lineage, health risks, or compatibility..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              />
              <button
                type="submit"
                disabled={chatLoading || !chatInput.trim()}
                className="p-2 text-white bg-purple-600 rounded-full hover:bg-purple-700 disabled:bg-gray-300 transition"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-6 h-6"
                >
                  <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- MAIN CONTENT --- */}
      <div className="max-w-4xl p-6 mx-auto bg-white border-t-8 border-[#4A90E2] rounded-2xl shadow-2xl md:p-10">
        {/* Header Section */}
        <div className="mb-4">
          <span
            className={`font-bold px-4 py-2 rounded-full text-sm uppercase tracking-wider ${
              isAdoptionListing
                ? "bg-blue-100 text-blue-700 border-blue-400 border"
                : "bg-pink-100 text-pink-700 border-pink-400 border"
            }`}
          >
            {pet.listingType}
          </span>
        </div>

        {pet.imageUrls?.length > 0 && (
          <img
            src={pet.imageUrls[0]}
            alt={pet.name}
            className="object-cover w-full h-96 rounded-xl mb-6 shadow-md"
          />
        )}

        <h1 className="mb-3 text-4xl font-extrabold text-[#333333]">
          {pet.name}
        </h1>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-4">
          <p className="text-lg text-[#333333]">
            Gender:
            <span
              className={`font-semibold px-3 py-1 ml-2 rounded-full ${genderColor}`}
            >
              {pet.gender}
            </span>
          </p>
          <p className="text-lg text-[#333333]">
            Verified:
            <span
              className={`font-bold px-3 py-1 ml-2 rounded-full text-sm border ${getStatusBadge(
                pet.verificationStatus
              )} uppercase tracking-wider`}
            >
              {pet.verificationStatus}
            </span>
          </p>
        </div>
        <p className="text-lg text-[#333333]">Breed: {pet.breed}</p>
        <p className="mb-4 text-lg text-[#333333]">Age: {pet.age}</p>

        <div className="flex flex-wrap items-center gap-4 mb-6">
          {pet.certificateUrl && (
            <a
              href={pet.certificateUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline text-[#4A90E2] hover:text-[#50E3C2] transition"
            >
              View Certificate
            </a>
          )}

          {pet.ownerLocation?.coordinates &&
            pet.ownerLocation.coordinates.length > 0 &&
            !isOwner && (
              <button
                onClick={handleViewLocation}
                className="flex items-center gap-2 px-4 py-2 font-medium text-white bg-[#4A90E2] rounded-lg shadow-md hover:bg-[#3A75B9] transition"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    fillRule="evenodd"
                    d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 10A7 7 0 103 10c0 2.493 1.698 4.988 3.355 6.584a13.733 13.733 0 002.273 1.765 11.842 11.842 0 00.757.433.62.62 0 00.28.14l.018.008.006.003zM10 11.25a1.25 1.25 0 100-2.5 1.25 1.25 0 000 2.5z"
                    clipRule="evenodd"
                  />
                </svg>
                View Owner&apos;s Location
              </button>
            )}
        </div>

        {/* AI Personality Profile Section */}
        {pet.aiProfileString && (
          <div className="relative mt-8 mb-8 p-6 bg-gradient-to-r from-[#F4F7F9] to-white rounded-2xl border border-[#4A90E2]/30 shadow-md overflow-hidden">
            <div className="absolute top-0 left-0 w-2 h-full bg-[#4A90E2]"></div>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">✨</span>
              <h2 className="text-2xl font-bold text-[#333333]">
                Personality Profile
              </h2>
            </div>
            <p className="mb-4 text-lg italic leading-relaxed text-gray-700">
              &quot;{pet.aiProfileString}&quot;
            </p>

            <div className="flex flex-wrap gap-3">
              {pet.temperament && (
                <span className="px-4 py-1 text-sm font-bold bg-white border border-[#4A90E2] rounded-full shadow-sm text-[#4A90E2]">
                  Temperament: {pet.temperament}
                </span>
              )}
              {pet.energyLevel && (
                <span className="px-4 py-1 text-sm font-bold bg-white border border-[#FF9A00] rounded-full shadow-sm text-[#FF9A00]">
                  Energy: {pet.energyLevel}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Pedigree Section */}
        {pedigree && (pedigree.dam || pedigree.sire) && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h2 className="mb-4 text-2xl font-bold text-[#333333]">Pedigree</h2>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              <PedigreeCard pet={pedigree.sire} title="Sire (Father)" />
              <PedigreeCard pet={pedigree.dam} title="Dam (Mother)" />
              <PedigreeCard
                pet={pedigree.sire?.sire}
                title="Grand-Sire (Father's Side)"
              />
              <PedigreeCard
                pet={pedigree.sire?.dam}
                title="Grand-Dam (Father's Side)"
              />
              <PedigreeCard
                pet={pedigree.dam?.sire}
                title="Grand-Sire (Mother's Side)"
              />
              <PedigreeCard
                pet={pedigree.dam?.dam}
                title="Grand-Dam (Mother's Side)"
              />
            </div>
          </div>
        )}

        {/* --- NEW CERTIFICATE SECTION --- */}
        {/* Only show if the pet is adopted and I am the new owner */}
        {isAdopted && amINewOwner && (
          <div className="mt-8 mb-6 p-6 text-center bg-green-50 border border-green-200 rounded-xl">
            <h2 className="mb-2 text-2xl font-bold text-green-800">
              🎉 Adoption Complete!
            </h2>
            <p className="mb-4 text-green-700">
              Congratulations on adopting {pet.name}. You can now download your
              official adoption certificate.
            </p>
            <DownloadCertificate pet={pet} />
          </div>
        )}

        {/* Request Action Section */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h2 className="mb-3 text-2xl font-bold text-[#4A90E2]">
            {isOwner
              ? "Owner Dashboard"
              : isAdoptionListing
              ? "Adopt This Pet"
              : "Mating Request"}
          </h2>

          {isOwner ? (
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
              <p className="mb-2 font-semibold text-[#333333]">
                This is your pet.
              </p>
              <Link
                href="/Profile"
                className="font-bold underline text-[#4A90E2]"
              >
                Go to Profile to manage requests
              </Link>
            </div>
          ) : pet.isBanned ? (
            <p className="text-lg font-bold text-red-500">
              This pet listing is currently banned and cannot receive requests.
            </p>
          ) : isAdoptionListing ? (
            // --- UPDATED: ADOPTION ACTION ---
            <div className="p-6 text-center bg-blue-50 rounded-xl border border-blue-100">
              <p className="mb-4 text-lg text-gray-700">
                Interested in adopting {pet.name}? Please fill out an
                application.
              </p>
              <button
                onClick={() => setShowAdoptionModal(true)}
                disabled={hasPendingAdoptionRequest}
                className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition ${
                  hasPendingAdoptionRequest
                    ? "bg-green-500 text-white cursor-default"
                    : "bg-[#4A90E2] hover:bg-[#3A75B9] text-white"
                }`}
              >
                {hasPendingAdoptionRequest
                  ? "Application Pending Review ✅"
                  : "Apply for Adoption"}
              </button>
              {hasPendingAdoptionRequest && (
                <p className="mt-2 text-sm font-medium text-green-600">
                  The owner will review your answers soon.
                </p>
              )}
            </div>
          ) : (
            // --- MATING ACTION ---
            <>
              {requesterPets.length > 0 ? (
                <div className="space-y-4">
                  {requesterPets.length > 1 && (
                    <div className="mb-2">
                      <label className="block mb-1 text-lg font-semibold text-[#333333]">
                        Which of your pets is this request for?
                      </label>
                      <select
                        value={requesterPetId}
                        onChange={(e) => setRequesterPetId(e.target.value)}
                        className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-[#4A90E2] transition-colors"
                      >
                        <option value="">-- Select Your Pet --</option>
                        {requesterPets.map((p) => (
                          <option key={p._id} value={p._id}>
                            {p.name} ({p.gender})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {requesterPets.length === 1 && (
                    <p className="mb-2 text-sm text-gray-600">
                      Requesting on behalf of:{" "}
                      <strong>{requesterPets[0].name}</strong>
                    </p>
                  )}

                  <textarea
                    placeholder="Write an introductory message for the owner..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-[#4A90E2] transition-colors"
                    rows="3"
                  />

                  <div className="flex flex-col gap-4 sm:flex-row">
                    <button
                      onClick={sendMatingRequest}
                      className={`flex-1 py-3 px-6 rounded-xl font-bold transition shadow-md ${
                        canSendRequest
                          ? "bg-[#4A90E2] hover:bg-[#3A75B9] text-white"
                          : "bg-gray-400 text-gray-700 cursor-not-allowed"
                      }`}
                      disabled={!canSendRequest}
                    >
                      Send Mating Request
                    </button>

                    {showAdvisorButton && (
                      <button
                        onClick={openAiAdvisor}
                        className="flex-1 flex items-center justify-center gap-2 py-3 px-6 font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl shadow-lg transition transform hover:from-purple-700 hover:to-indigo-700 hover:scale-[1.02]"
                      >
                        <span>🤖</span> Chat with Mating Advisor
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <p className="mt-4 font-semibold text-red-500">
                  You have no registered pets of type {pet.type} with the
                  opposite gender to request a mating.
                </p>
              )}
            </>
          )}
        </div>

        {/* --- RESTORED: Message History Section --- */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h2 className="mb-3 text-2xl font-bold text-[#333333]">
            Message History
          </h2>
          {pet.messages?.length === 0 ? (
            <p className="text-[#333333]">No messages yet.</p>
          ) : (
            <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
              {pet.messages?.map((msg, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl shadow-sm ${
                    msg.text.startsWith("ADOPTION INQUIRY:")
                      ? "bg-blue-50 border-l-4 border-blue-400"
                      : msg.senderId === "system"
                      ? "bg-yellow-50 border-l-4 border-yellow-400"
                      : msg.senderId === pet.ownerId
                      ? "bg-gray-100 border-l-4 border-gray-400"
                      : "bg-green-50 border-l-4 border-green-400"
                  }`}
                >
                  <p className="flex justify-between text-sm font-bold text-[#4F200D]">
                    {msg.senderName}
                    <span className="text-xs font-normal text-gray-500">
                      {new Date(msg.sentAt).toLocaleString()}
                    </span>
                  </p>
                  <p className="mt-1 text-[#333333]">{msg.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* --- RESTORED: History Sections --- */}
        {!isAdoptionListing && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h2 className="mb-3 text-2xl font-bold text-[#333333]">
              Mating History
            </h2>
            {pet.matingHistory?.length === 0 ? (
              <p className="text-[#333333]">No mating requests yet.</p>
            ) : (
              <ul className="space-y-2 list-disc list-inside">
                {pet.matingHistory.map((mh, idx) => (
                  <li
                    key={idx}
                    className={`text-[#333333] ${
                      mh.status === "accepted"
                        ? "text-green-600 font-medium"
                        : mh.status === "rejected"
                        ? "text-red-600"
                        : "text-gray-600"
                    }`}
                  >
                    {mh.requesterName} ({mh.requesterPetName}) -{" "}
                    <span className="uppercase">{mh.status}</span> -{" "}
                    <span className="text-sm italic">
                      {new Date(mh.requestedAt).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {isAdoptionListing && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h2 className="mb-3 text-2xl font-bold text-[#333333]">
              Adoption Requests
            </h2>
            {pet.adoptionRequests?.length === 0 ? (
              <p className="text-[#333333]">No adoption requests yet.</p>
            ) : (
              <ul className="space-y-2 list-disc list-inside">
                {pet.adoptionRequests.map((req, idx) => (
                  <li
                    key={idx}
                    className={`text-[#333333] ${
                      req.status === "approved"
                        ? "text-green-600 font-medium"
                        : req.status === "rejected"
                        ? "text-red-600"
                        : "text-gray-600"
                    }`}
                  >
                    {isOwner ? `${req.requesterName}` : `Request ${idx + 1}`} -{" "}
                    <span className="uppercase">{req.status}</span>
                    {(isOwner || req.requesterId === user?.uid) && (
                      <p className="pl-4 text-sm italic text-gray-500">
                        &quot;{req.message}&quot;
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// app/pet/[id]/page.js
"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { auth } from "../../lib/firebase";
import Link from "next/link";
import { createConversationId } from '../../lib/chatUtils'; 

// --- Cute DNA/Loading Animation Component ---
const DNALoading = () => (
  <div className="flex flex-col items-center justify-center py-4">
    <div className="flex space-x-2 animate-pulse mb-2">
        <div className="w-3 h-3 bg-pink-500 rounded-full animate-bounce"></div>
        <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce delay-75"></div>
        <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce delay-150"></div>
    </div>
    <p className="text-xs text-purple-600 font-bold animate-pulse">Mixing Genes...</p>
  </div>
);

export default function PetDetailPage() {
  const [pet, setPet] = useState(null);
  const [pedigree, setPedigree] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [requesterPets, setRequesterPets] = useState([]);
  const [requesterPetId, setRequesterPetId] = useState("");
  
  // --- AI CHAT ADVISOR STATES ---
  const [showAdvisorModal, setShowAdvisorModal] = useState(false);
  const [chatHistory, setChatHistory] = useState([]); // Stores UI messages
  const [geminiHistory, setGeminiHistory] = useState([]); // Stores API context
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  
  // --- IMAGE GEN STATES ---
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
      if (res.ok) {
        const data = await res.json();
        setPedigree(data);
      }
    } catch (err) {
      console.error("Error fetching pedigree:", err);
    }
  };

  const fetchRequesterPets = async (uid, petType, petGender) => {
    try {
      const petsRes = await fetch(`/api/pet/user/${uid}`);
      if (petsRes.ok) {
        const allPets = await petsRes.json();
        const compatiblePets = allPets.filter(
          (p) => p.type === petType && p.gender !== petGender && p.listingType === "Mating"
        );
        setRequesterPets(compatiblePets);
        if (compatiblePets.length === 1) {
          setRequesterPetId(compatiblePets[0]._id);
        } else {
          setRequesterPetId("");
        }
      }
    } catch (err) {
      console.error("Error fetching requester pets:", err);
    }
  };

  // --- Actions ---
  const sendMatingRequest = async () => {
    if (!user) return alert("Login first");
    if (user.uid === pet.ownerId) return alert("You cannot send a mating request to your own pet.");
    if (pet.verificationStatus !== "verified") return alert("This pet's certificate is not yet verified.");

    const selectedRequesterPetId = requesterPets.length === 1 ? requesterPets[0]._id : requesterPetId;

    if (!selectedRequesterPetId) {
      return alert("Please select which of your compatible pets this request is for.");
    }

    const selectedPet = requesterPets.find((p) => p._id === selectedRequesterPetId);

    const existingRequest = pet.matingHistory.find(
      (mh) => mh.requesterPetId === selectedRequesterPetId && mh.status === "pending"
    );

    if (existingRequest) return alert("You already have a pending mating request for this pet.");

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
        alert(`Mating request for your pet ${selectedPet?.name} sent successfully!`);
        setNewMessage("");
        fetchPet();
      } else {
        alert("Failed to send request. Check console for details.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const sendAdoptionRequest = async () => {
    if (!user) return alert("Login first");
    if (user.uid === pet.ownerId) return alert("This is your pet.");
    if (!newMessage.trim()) return alert("Please write a message with your inquiry.");

    try {
      const res = await fetch(`/api/pet/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "adoptionRequest",
          requesterId: user.uid,
          requesterName: user.email.split("@")[0],
          messageText: newMessage,
        }),
      });
      
      const data = await res.json();

      if (res.ok) {
        alert("Your adoption request has been sent to the owner!");
        setNewMessage("");
        fetchPet(); 
      } else {
        alert(`Failed to send request: ${data.error || 'Check console for details.'}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleViewLocation = () => {
    if (!pet.ownerLocation || !pet.ownerLocation.coordinates || pet.ownerLocation.coordinates.length < 2) {
      return alert("Owner's location is not available.");
    }
    const lng = pet.ownerLocation.coordinates[0];
    const lat = pet.ownerLocation.coordinates[1];
    const url = `https://www.google.com/maps?q=${lat},${lng}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // --- AI ADVISOR LOGIC ---
  const openAiAdvisor = () => {
    if (!requesterPetId && requesterPets.length !== 1) {
        return alert("Please select YOUR pet from the dropdown first (under 'Send Mating Request').");
    }
    
    const myPetId = requesterPetId || requesterPets[0]?._id;
    if (!myPetId) return alert("No compatible pet found to compare.");

    setShowAdvisorModal(true);
    
    // Initial greeting if empty
    if (chatHistory.length === 0) {
        const initialMsg = { 
            role: 'model', 
            text: `Hello! I'm Dr. Paws, your AI Mating Advisor. I have analyzed the medical records, vaccination history, and lineage of both ${pet.name} and your pet. What would you like to know about their compatibility?` 
        };
        setChatHistory([initialMsg]);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const myPetId = requesterPetId || requesterPets[0]?._id;
    const userMsg = chatInput;
    
    // Update UI immediately
    setChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatInput("");
    setChatLoading(true);

    try {
        const res = await fetch('/api/ai-advisor/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                petAId: myPetId, 
                petBId: pet._id,
                history: geminiHistory, // Send context history
                message: userMsg
            })
        });
        
        const data = await res.json();
        if (res.ok) {
            const botMsg = { role: 'model', text: data.text };
            setChatHistory(prev => [...prev, botMsg]);
            
            // Update Gemini history context (limit to last 10 turns to save tokens)
            setGeminiHistory(prev => [
                ...prev.slice(-10), 
                { role: 'user', parts: [{ text: userMsg }] },
                { role: 'model', parts: [{ text: data.text }] }
            ]);
        } else {
            alert("AI Error: " + data.error);
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
        const res = await fetch('/api/ai-advisor/generate-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                petAId: myPetId, 
                petBId: pet._id
            })
        });
        const data = await res.json();
        if (res.ok) {
            setGeneratedImage(data.imageUrl);
        } else {
            alert("Failed to generate image.");
        }
    } catch (err) {
        console.error(err);
    } finally {
        setImageLoading(false);
    }
  };

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, generatedImage, imageLoading]);


  // --- Lifecycle ---
  useEffect(() => {
    fetchPet();
  }, [params.id, user?.uid]);

  if (!pet) return <p className="text-[#333333] text-center mt-20 text-xl">Loading pet details...</p>;

  const isOwner = user && user.uid === pet.ownerId;
  const genderColor = pet.gender === "Male" ? "bg-blue-200 text-blue-800" : "bg-pink-200 text-pink-800";

  const isAdoptionListing = pet.listingType === "Adoption";
  const canSendRequest = pet.verificationStatus === "verified" && requesterPets.length > 0 && !!requesterPetId;

  const hasPendingAdoptionRequest = pet.adoptionRequests?.some(
      (req) => req.requesterId === user?.uid && req.status === "pending"
  );

  // Determine if advisor button should be shown
  const showAdvisorButton = !isOwner && !isAdoptionListing && (requesterPets.length > 0);

  return (
    <div className="min-h-screen bg-[#F4F7F9] p-4 md:p-10 relative">
      
      {/* --- AI CHATBOT MODAL --- */}
      {showAdvisorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl max-w-2xl w-full h-[85vh] flex flex-col shadow-2xl animate-in fade-in zoom-in duration-300 overflow-hidden border-4 border-purple-100">
                
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 flex justify-between items-center shrink-0">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        🧬 Genetic Mating Advisor
                    </h2>
                    <button onClick={() => setShowAdvisorModal(false)} className="text-white/80 hover:text-white text-2xl">×</button>
                </div>

                {/* Scrollable Content Area */}
                <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-4">
                    
                    {/* Image Generation Section */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-purple-100 text-center">
                        <h3 className="text-sm font-bold text-gray-700 mb-3">Predicted Offspring Look</h3>
                        
                        {generatedImage ? (
                            <div className="relative w-full h-64 rounded-lg overflow-hidden shadow-md group">
                                <img src={generatedImage} alt="Offspring" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                <button 
                                    onClick={generateOffspringImage}
                                    className="absolute bottom-2 right-2 bg-white/90 p-2 rounded-full shadow-lg text-xs font-bold hover:bg-white"
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
                                    className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-6 py-2 rounded-full font-bold shadow-lg hover:scale-105 transition transform flex items-center gap-2"
                                >
                                    <span>✨</span> Generate Offspring Image
                                </button>
                                <p className="text-xs text-gray-500 mt-2">AI will predict features based on both parents</p>
                            </div>
                        )}
                    </div>

                    {/* Chat Messages */}
                    <div className="space-y-4 pb-2">
                        {chatHistory.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed ${
                                    msg.role === 'user' 
                                    ? 'bg-purple-600 text-white rounded-br-none' 
                                    : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none shadow-sm'
                                }`}>
                                    {msg.role === 'model' && <span className="text-xs font-bold text-purple-600 block mb-1">Dr. Paws AI</span>}
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        {chatLoading && (
                            <div className="flex justify-start">
                                <div className="bg-white p-3 rounded-2xl rounded-bl-none shadow-sm border border-gray-200">
                                    <div className="flex space-x-1">
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></div>
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>
                </div>

                {/* Input Area */}
                <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-gray-200 flex gap-2 shrink-0">
                    <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Ask about lineage, health risks, or compatibility..."
                        className="flex-1 border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                    />
                    <button 
                        type="submit" 
                        disabled={chatLoading || !chatInput.trim()}
                        className="bg-purple-600 text-white p-2 rounded-full hover:bg-purple-700 disabled:bg-gray-300 transition"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                            <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                        </svg>
                    </button>
                </form>
            </div>
        </div>
      )}
      {/* --- END MODAL --- */}

      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-2xl p-6 md:p-10 border-t-8 border-[#4A90E2]">
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
            className="w-full h-96 object-cover rounded-xl mb-6 shadow-md"
          />
        )}

        <h1 className="text-4xl font-extrabold text-[#333333] mb-3">{pet.name}</h1>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-4">
          <p className="text-lg text-[#333333]">
            Gender:
            <span className={`font-semibold px-3 py-1 ml-2 rounded-full ${genderColor}`}>{pet.gender}</span>
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
        <p className="text-lg text-[#333333] mb-4">Age: {pet.age}</p>
        
        <div className="flex flex-wrap gap-4 items-center mb-6">
          {pet.certificateUrl && (
            <a
              href={pet.certificateUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#4A90E2] font-medium underline hover:text-[#50E3C2] transition"
            >
              View Certificate
            </a>
          )}

          {pet.ownerLocation?.coordinates && pet.ownerLocation.coordinates.length > 0 && !isOwner && (
            <button
              onClick={handleViewLocation}
              className="flex items-center gap-2 text-white bg-[#4A90E2] hover:bg-[#3A75B9] font-medium rounded-lg px-4 py-2 transition shadow-md"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 10A7 7 0 103 10c0 2.493 1.698 4.988 3.355 6.584a13.733 13.733 0 002.273 1.765 11.842 11.842 0 00.757.433.62.62 0 00.28.14l.018.008.006.003zM10 11.25a1.25 1.25 0 100-2.5 1.25 1.25 0 000 2.5z" clipRule="evenodd" />
              </svg>
              View Owner's Location
            </button>
          )}
        </div>

        {/* AI Personality Profile Section */}
        {pet.aiProfileString && (
          <div className="mt-8 mb-8 p-6 bg-gradient-to-r from-[#F4F7F9] to-white rounded-2xl border border-[#4A90E2]/30 shadow-md relative overflow-hidden">
            <div className="absolute top-0 left-0 w-2 h-full bg-[#4A90E2]"></div>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">✨</span>
              <h2 className="text-2xl font-bold text-[#333333]">Personality Profile</h2>
            </div>
            <p className="text-gray-700 italic text-lg leading-relaxed mb-4">
              "{pet.aiProfileString}"
            </p>
            
            <div className="flex flex-wrap gap-3">
               {pet.temperament && (
                 <span className="px-4 py-1 bg-white text-[#4A90E2] text-sm font-bold rounded-full border border-[#4A90E2] shadow-sm">
                   Temperament: {pet.temperament}
                 </span>
               )}
               {pet.energyLevel && (
                 <span className="px-4 py-1 bg-white text-[#FF9A00] text-sm font-bold rounded-full border border-[#FF9A00] shadow-sm">
                   Energy: {pet.energyLevel}
                 </span>
               )}
            </div>
          </div>
        )}

        {/* Pedigree Section */}
        {pedigree && (pedigree.dam || pedigree.sire) && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h2 className="text-2xl font-bold text-[#333333] mb-4">Pedigree</h2>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              <PedigreeCard pet={pedigree.sire} title="Sire (Father)" />
              <PedigreeCard pet={pedigree.dam} title="Dam (Mother)" />
              <PedigreeCard pet={pedigree.sire?.sire} title="Grand-Sire (Father's Side)" />
              <PedigreeCard pet={pedigree.sire?.dam} title="Grand-Dam (Father's Side)" />
              <PedigreeCard pet={pedigree.dam?.sire} title="Grand-Sire (Mother's Side)" />
              <PedigreeCard pet={pedigree.dam?.dam} title="Grand-Dam (Mother's Side)" />
            </div>
          </div>
        )}

        {/* Request Section */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h2 className="text-2xl font-bold text-[#4A90E2] mb-3">
            {isOwner ? "Owner Actions" : isAdoptionListing ? "Inquire About Adoption" : "Send Mating Request"}
          </h2>

          {isOwner ? (
            <p className="text-[#333333] text-lg">
              This is your pet. You can manage requests from your{" "}
              <Link href="/Profile" className="text-[#4A90E2] font-semibold underline hover:text-[#50E3C2]">
                Profile Page
              </Link>
              .
            </p>
          ) : pet.isBanned ? (
            <p className="text-red-500 font-bold text-lg">
              This pet listing is currently banned and cannot receive requests.
            </p>
          ) : isAdoptionListing ? (
            <>
              <textarea
                placeholder="Write an inquiry message to the owner..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="w-full border-2 border-gray-300 p-3 rounded-lg mb-4 focus:border-[#4A90E2] transition-colors"
                rows="3"
                disabled={hasPendingAdoptionRequest}
              />
              <button
                onClick={sendAdoptionRequest}
                className={`py-3 px-6 rounded-xl font-bold transition shadow-md ${
                  hasPendingAdoptionRequest 
                    ? "bg-gray-400 text-gray-700 cursor-not-allowed"
                    : "bg-[#4A90E2] hover:bg-[#3A75B9] text-white"
                }`}
                disabled={!newMessage.trim() || hasPendingAdoptionRequest}
              >
                {hasPendingAdoptionRequest ? "Request Pending" : "Send Adoption Request"}
              </button>
            </>
          ) : (
            <>
              {requesterPets.length > 1 && (
                <div className="mb-4">
                  <label className="text-lg font-semibold text-[#333333] block mb-1">
                    Which of your pets is this request for?
                  </label>
                  <select
                    value={requesterPetId}
                    onChange={(e) => setRequesterPetId(e.target.value)}
                    className="w-full border-2 border-gray-300 p-3 rounded-lg focus:border-[#4A90E2] transition-colors"
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
                <p className="text-sm text-gray-600 mb-4">
                  Request will be sent for your pet: **{requesterPets[0].name}**.
                </p>
              )}
              
              {/* --- ACTION BUTTONS CONTAINER --- */}
              <div className="flex flex-col sm:flex-row gap-4">
                  {requesterPets.length > 0 && (
                    <button
                        onClick={sendMatingRequest}
                        className={`flex-1 py-3 px-6 rounded-xl font-bold transition shadow-md ${
                        canSendRequest ? "bg-[#4A90E2] hover:bg-[#3A75B9] text-white" : "bg-gray-400 text-gray-700 cursor-not-allowed"
                        }`}
                        disabled={!canSendRequest}
                    >
                        Send Mating Request {pet.verificationStatus !== "verified" && `(${pet.verificationStatus})`}
                    </button>
                  )}

                  {/* --- NEW AI ADVISOR BUTTON --- */}
                  {showAdvisorButton && (
                      <button
                        onClick={openAiAdvisor}
                        className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white py-3 px-6 rounded-xl font-bold shadow-lg transition flex items-center justify-center gap-2 transform hover:scale-[1.02]"
                      >
                        <span>🤖</span> Chat with Mating Advisor
                      </button>
                  )}
              </div>

              {requesterPets.length === 0 && user && (
                <p className="text-red-500 font-semibold mt-4">
                  You have no registered pets of type {pet.type} with the opposite gender to request a mating.
                </p>
              )}

              <textarea
                placeholder="Write an introductory message for the owner (optional)..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="w-full border-2 border-gray-300 p-3 rounded-lg my-4 focus:border-[#4A90E2] transition-colors"
                rows="3"
                disabled={pet.verificationStatus !== "verified"}
              />
            </>
          )}
        </div>

        {/* Message History Section */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h2 className="text-2xl font-bold text-[#333333] mb-3">Message History</h2>
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
                  <p className="font-bold text-[#4F200D] text-sm flex justify-between">
                    {msg.senderName}
                    <span className="text-xs text-gray-500 font-normal">
                      {new Date(msg.sentAt).toLocaleString()}
                    </span>
                  </p>
                  <p className="text-[#333333] mt-1">{msg.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* History Sections */}
        {!isAdoptionListing && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h2 className="text-2xl font-bold text-[#333333] mb-3">Mating History</h2>
            {pet.matingHistory?.length === 0 ? (
              <p className="text-[#333333]">No mating requests yet.</p>
            ) : (
              <ul className="list-disc list-inside space-y-2">
                {pet.matingHistory.map((mh, idx) => (
                  <li
                    key={idx}
                    className={`text-[#333333] ${
                      mh.status === "accepted" ? "text-green-600 font-medium" : mh.status === "rejected" ? "text-red-600" : "text-gray-600"
                    }`}
                  >
                    {mh.requesterName} ({mh.requesterPetName}) - <span className="uppercase">{mh.status}</span> -{" "}
                    <span className="text-sm italic">{new Date(mh.requestedAt).toLocaleDateString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {isAdoptionListing && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h2 className="text-2xl font-bold text-[#333333] mb-3">Adoption Requests</h2>
            {pet.adoptionRequests?.length === 0 ? (
              <p className="text-[#333333]">No adoption requests yet.</p>
            ) : (
              <ul className="list-disc list-inside space-y-2">
                {pet.adoptionRequests.map((req, idx) => (
                  <li
                    key={idx}
                    className={`text-[#333333] ${
                      req.status === "approved" ? "text-green-600 font-medium" : 
                      req.status === "rejected" ? "text-red-600" : "text-gray-600"
                    }`}
                  >
                    {isOwner ? `${req.requesterName}` : `Request ${idx + 1}`} 
                    - <span className="uppercase">{req.status}</span>
                    {(isOwner || req.requesterId === user?.uid) && (
                        <p className="text-sm italic pl-4 text-gray-500">"{req.message}"</p>
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

function PedigreeCard({ pet, title }) {
  if (!pet) {
    return (
      <div className="p-3 bg-gray-50 rounded-lg text-center shadow-inner">
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
          className="w-12 h-12 rounded-full object-cover border-2 border-[#50E3C2]"
        />
        <div>
          <p className="font-semibold text-primary">{pet.name}</p>
          <p className="text-sm text-gray-600">{pet.breed}</p>
        </div>
      </div>
    </Link>
  );
}
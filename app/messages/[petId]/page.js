// app/messages/[petId]/page.js
"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { auth, db } from "../../../app/lib/firebase"; 
import { collection, query, orderBy } from "firebase/firestore"; 
import { useCollection } from "react-firebase-hooks/firestore"; 

export default function ChatSessionPage() {
  const [pet, setPet] = useState(null); 
  const [replyText, setReplyText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const params = useParams();
  const router = useRouter();
  const user = auth.currentUser;
  const messagesEndRef = useRef(null);

  const conversationId = params.petId;

  const [messagesSnapshot, messagesLoading] = useCollection(
    conversationId && user ? 
    query(
      collection(db, "conversations", conversationId, "messages"),
      orderBy("createdAt", "asc")
    ) : null
  );

  const messages = messagesSnapshot?.docs.map(doc => ({ ...doc.data(), id: doc.id })) || [];

  const fetchPetData = useCallback(async () => {
    if (!conversationId) return;
    const petIdStr = conversationId.split("_")[0];
    if (!petIdStr) return;

    try {
      const timestamp = new Date().getTime();
      const res = await fetch(`/api/pet/${petIdStr}?t=${timestamp}`, { 
          cache: 'no-store',
          headers: { 'Pragma': 'no-cache' }
      }); 
      if (!res.ok) return;
      const data = await res.json();
      setPet(data);
    } catch (err) {
      console.error("Error fetching chat data:", err);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    if (user) fetchPetData();
  }, [conversationId, user, fetchPetData]);

  useEffect(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]); 

  const sendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || sending || !user || !conversationId) return;
    setSending(true);
    const petId = conversationId.split("_")[0];

    try {
      const res = await fetch(`/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          petId: petId,
          conversationId: conversationId,
          senderId: user.uid,
          senderName: user.displayName || user.email.split("@")[0],
          text: replyText,
        }),
      });
      if (res.ok) setReplyText("");
    } catch (err) { console.error(err); } 
    finally { setSending(false); }
  };
  
  const handleRequestStatus = async (newStatus, requestId, requesterId, type) => {
      if (!user || !pet) return;
      if(!window.confirm(newStatus === 'accepted' || newStatus === 'approved' ? "Accept this request?" : "Reject this request?")) return;

      try {
        const res = await fetch('/api/pet/requests', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ownerId: user.uid,
            petId: pet._id,
            requestId: requestId,
            requesterId: requesterId,
            requestType: type, // 'mating' or 'adoption'
            newStatus: newStatus,    
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          alert(`Error: ${data.error}`);
        } else {
            // Success
            fetchPetData(); // Refresh to hide banner
        }
      } catch (err) {
        console.error("Request update error:", err);
        alert("Failed to update request status.");
      }
  };

  if (loading || !pet) {
    return <p className="text-[#333333] text-center mt-20 text-xl">Loading chat session...</p>;
  }
  
  const isOwner = user?.uid === pet.ownerId;
  const partnerId = conversationId.split("_").find(uid => uid !== pet._id && uid !== user.uid);
  
  // Check for Pending Mating
  const pendingMating = isOwner ? pet.matingHistory?.find(
      (mh) => mh.status === "pending" && mh.requesterId === partnerId
  ) : null;

  // Check for Pending Adoption
  const pendingAdoption = isOwner ? pet.adoptionRequests?.find(
      (ar) => ar.status === "pending" && ar.requesterId === partnerId
  ) : null;

  return (
    <div className="h-screen w-screen bg-[#E2F4EF] flex justify-center items-stretch p-0">
      <div className="w-full max-w-xl glass-container rounded-none sm:rounded-2xl shadow-2xl flex flex-col h-full sm:h-[95vh] border-t-8 border-[#4A90E2] sm:my-4 p-0">
        
        <div className="sticky top-0 bg-[#4A90E2] p-4 text-white shadow-md flex items-center justify-between z-20">
            <button onClick={() => router.push("/messages")} className="text-xl hover:text-gray-200">&larr;</button>
            <h1 className="text-xl font-bold truncate">Chat about {pet.name}</h1>
            <div className="w-6"></div>
        </div>
        
        {/* --- MATING BANNER --- */}
        {isOwner && pendingMating && (
             <div className="bg-yellow-50 p-4 border-b-2 border-yellow-200 flex flex-col items-center text-sm font-semibold sticky top-14 z-10 shadow-sm">
                <p className="text-[#333333] mb-3 text-center text-base">
                    Mating request from <strong>{pendingMating.requesterPetName}</strong>
                </p>
                <div className="flex gap-4 w-full justify-center">
                    <button 
                        onClick={() => handleRequestStatus('accepted', pendingMating._id, partnerId, 'mating')}
                        className="bg-green-500 text-white px-6 py-2 rounded-full text-sm font-bold hover:bg-green-600 shadow-md"
                    >
                        Accept
                    </button>
                    <button 
                        onClick={() => handleRequestStatus('rejected', pendingMating._id, partnerId, 'mating')}
                        className="bg-red-500 text-white px-6 py-2 rounded-full text-sm font-bold hover:bg-red-600 shadow-md"
                    >
                        Reject
                    </button>
                </div>
            </div>
        )}

        {/* --- ADOPTION BANNER --- */}
        {isOwner && pendingAdoption && (
             <div className="bg-blue-50 p-4 border-b-2 border-blue-200 flex flex-col items-center text-sm font-semibold sticky top-14 z-10 shadow-sm">
                <p className="text-[#333333] mb-1 text-center text-base">
                    Adoption request from <strong>{pendingAdoption.requesterName}</strong>
                </p>
                <p className="text-gray-500 italic text-xs mb-3">"{pendingAdoption.message}"</p>
                <div className="flex gap-4 w-full justify-center">
                    <button 
                        onClick={() => handleRequestStatus('approved', pendingAdoption._id, partnerId, 'adoption')}
                        className="bg-green-500 text-white px-6 py-2 rounded-full text-sm font-bold hover:bg-green-600 shadow-md"
                    >
                        Approve Adoption
                    </button>
                    <button 
                        onClick={() => handleRequestStatus('rejected', pendingAdoption._id, partnerId, 'adoption')}
                        className="bg-red-500 text-white px-6 py-2 rounded-full text-sm font-bold hover:bg-red-600 shadow-md"
                    >
                        Reject
                    </button>
                </div>
            </div>
        )}
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
          {messages.map((msg) => {
              const isSender = msg.senderId === user.uid;
              const isSystem = msg.senderId === "system";
              
              if (isSystem) {
                  return (
                    <div key={msg.id} className="flex justify-center my-4">
                        <div className="bg-green-100 text-green-800 border border-green-300 px-4 py-2 rounded-full text-xs font-bold shadow-sm text-center">
                            {msg.text}
                        </div>
                    </div>
                  );
              }

              return (
                <div key={msg.id} className={`flex ${isSender ? "justify-end" : "justify-start"}`}>
                  <div className={`p-3 rounded-2xl max-w-[85%] shadow-md text-sm ${isSender ? "bg-[#50E3C2] text-[#333333] rounded-br-none" : "bg-white border border-gray-200 text-[#333333] rounded-tl-none"}`}>
                    <p className="font-semibold text-xs mb-1 opacity-70">{isSender ? "You" : (msg.senderName || "Friend")}</p>
                    <p>{msg.text}</p>
                    <span className="block text-right text-[10px] text-gray-500 mt-1 opacity-70">
                        {msg.createdAt ? new Date(msg.createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "..."}
                    </span>
                  </div>
                </div>
              );
          })}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={sendReply} className="sticky bottom-0 flex p-4 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
          <input
            type="text"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            className="flex-1 p-3 rounded-l-xl border-2 border-gray-300 focus:border-[#4A90E2] focus:ring-0 outline-none transition-colors text-[#333333]"
            placeholder="Type your reply..."
            disabled={sending}
          />
          <button type="submit" className="bg-[#4A90E2] text-white p-3 rounded-r-xl font-bold hover:bg-[#3A75B9] transition shadow-md px-6" disabled={sending || !replyText.trim()}>
            {sending ? "..." : "Send"}
          </button>
        </form>
      </div>
    </div>
  );
}
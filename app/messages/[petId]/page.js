// app/messages/[petId]/page.js
"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { auth, db } from "../../../app/lib/firebase"; // 👈 IMPORT DB
import { collection, query, orderBy, serverTimestamp } from "firebase/firestore"; // 👈 IMPORT FIRESTORE & serverTimestamp
import { useCollection } from "react-firebase-hooks/firestore"; // 👈 IMPORT HOOKS

export default function ChatSessionPage() {
  const [pet, setPet] = useState(null); // Keep pet data for context
  const [replyText, setReplyText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const params = useParams();
  const router = useRouter();
  const user = auth.currentUser;
  const messagesEndRef = useRef(null);

  // We assume the URL param [petId] IS the stable Conversation ID
  // e.g., "PET_ID_SORTED_UID_1_SORTED_UID_2"
  const conversationId = params.petId;

  // --- NEW REAL-TIME MESSAGE LISTENER ---
  const [messagesSnapshot, messagesLoading, messagesError] = useCollection(
    conversationId && user ? // Only query if we have a convo ID and user
    query(
      collection(db, "conversations", conversationId, "messages"),
      orderBy("createdAt", "asc")
    ) : null
  );

  const messages = messagesSnapshot?.docs.map(doc => ({ ...doc.data(), id: doc.id })) || [];

  // --- Fetch Pet Data (for context) ---
  useEffect(() => {
    if (!conversationId || !user) return;

    // Extract petId from the conversation ID (it's the first part)
    const petId = conversationId.split("_")[0];
    
    if (!petId) {
        console.error("Invalid conversation ID, no petId found.");
        router.push("/messages");
        return;
    }

    const fetchPetData = async () => {
        try {
          const res = await fetch(`/api/pet/${petId}`); 
          if (!res.ok) {
            console.error("Failed to fetch pet data, redirecting.");
            return router.push("/messages");
          }
          const data = await res.json();
          setPet(data);
        } catch (err) {
          console.error("Error fetching chat data:", err);
        } finally {
          setLoading(false);
        }
    };
    
    fetchPetData();
  }, [conversationId, user, router]); // Add router to dependency array


  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const sendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || sending || !user || !conversationId) return;
    
    setSending(true);
    
    // Extract petId from the conversation ID
    const petId = conversationId.split("_")[0];

    try {
      // Use the NEW API route that writes to Firestore
      // This API route will use `addDoc` and `serverTimestamp()`
      const res = await fetch(`/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          petId: petId,
          conversationId: conversationId, // Pass this to the new API
          senderId: user.uid,
          senderName: user.displayName || user.email.split("@")[0], // Use displayName if available
          text: replyText,
          // 'createdAt' will be set by the API using serverTimestamp()
        }),
      });

      if (res.ok) {
        setReplyText("");
        // No need to re-fetch, the listener will update automatically!
      } else {
        alert("Failed to send reply. Check console for details.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };
  
  // NOTE: This function was incomplete in your original file.
  // You must copy the logic from your other files here.
  const handleRequestStatus = async (status, requestId) => {
      console.log(`Handling request ${requestId} with status ${status}`);
      // ... (your existing handleRequestStatus logic from your project) ...
      // Example:
      // try {
      //   const res = await fetch('/api/pet/requests', {
      //     method: 'PUT',
      //     headers: { 'Content-Type': 'application/json' },
      //     body: JSON.stringify({ requestId, status, petId: pet._id }),
      //   });
      //   if (res.ok) {
      //     alert(`Request ${status}!`);
      //     // You might need to refetch pet data or optimistically update UI
      //     fetchPetData(); // Assuming you extract this to a reusable function
      //   }
      // } catch (err) {
      //   console.error(err);
      // }
  };

  useEffect(() => {
      scrollToBottom();
  }, [messages]); // Trigger scroll on new messages from hook

  if (loading || !pet) {
    return <p className="text-[#333333] text-center mt-20 text-xl">Loading chat session...</p>;
  }
  
  // --- UI ---
  
  const isOwner = user?.uid === pet.ownerId;
  
  // Try to find the partner's name from matingHistory
  // This logic is from your original file.
  const partnerName = pet.matingHistory?.find(mh => mh.requesterId !== user.uid)?.requesterName || "Requester";
  
  const latestPendingRequest = isOwner ? pet.matingHistory?.find(
      (mh) => mh.status === "pending"
  ) : null;

  return (
    <div className="h-screen w-screen bg-[#E2F4EF] flex justify-center items-stretch p-0">
      <div className="w-full max-w-xl glass-container rounded-none sm:rounded-2xl shadow-2xl flex flex-col h-full sm:h-[95vh] border-t-8 border-[#4A90E2] sm:my-4 p-0">
        
        {/* Header (Fixed) */}
        <div className="sticky top-0 bg-[#4A90E2] p-4 text-white shadow-md flex items-center justify-between z-20">
            <button onClick={() => router.push("/messages")} className="text-xl hover:text-gray-200">
                &larr;
            </button>
            <h1 className="text-xl font-bold truncate">
                Chat about {pet.name} with {partnerName}
            </h1>
            <div className="w-6"></div>
        </div>
        
        {/* Request Management Banner */}
        {isOwner && latestPendingRequest && (
             <div className="bg-yellow-50 p-3 border-b border-yellow-200 flex flex-col sm:flex-row justify-between items-center text-sm font-semibold sticky top-14 z-10">
                <p className="text-[#333333] mb-2 sm:mb-0">
                    Mating request from **{latestPendingRequest.requesterPetName || latestPendingRequest.requesterName}**
                </p>
                <div className="flex space-x-3">
                    <button 
                        onClick={() => handleRequestStatus('accepted', latestPendingRequest._id)}
                        className="bg-green-500 text-white px-3 py-1 rounded-full text-xs hover:bg-green-600 transition-colors shadow-sm"
                    >
                        Accept Request
                    </button>
                    <button 
                        onClick={() => handleRequestStatus('rejected', latestPendingRequest._id)}
                        className="bg-red-500 text-white px-3 py-1 rounded-full text-xs hover:bg-red-600 transition-colors shadow-sm"
                    >
                        Reject
                    </button>
                </div>
            </div>
        )}
        
        {/* Messages Area (Scrolling) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
          {messagesLoading && <p className="text-center text-gray-500">Loading messages...</p>}
          
          {!messagesLoading && messages.length === 0 ? (
            <p className="text-center text-gray-500 mt-4">Start the conversation!</p>
          ) : (
            messages.map((msg) => {
              const isSender = msg.senderId === user.uid;
              return (
                <div
                  key={msg.id} // Use Firestore doc ID as key
                  className={`flex ${isSender ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`p-3 rounded-2xl max-w-[85%] shadow-md text-sm ${
                      isSender
                        ? "bg-[#50E3C2] text-[#333333] rounded-br-none" 
                        : "bg-white border border-gray-200 text-[#333333] rounded-tl-none"
                    }`}
                  >
                    <p className="font-semibold text-xs mb-1">
                      {isSender ? "You" : (msg.senderName || "Friend")}
                    </p>
                    <p>{msg.text}</p>
                    <span className="block text-right text-xs text-gray-500 mt-1">
                        {msg.createdAt ? new Date(msg.createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "sending..."}
                    </span>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input/Reply Bar (Fixed to Bottom) */}
        <form onSubmit={sendReply} className="sticky bottom-0 flex p-4 bg-white border-t border-gray-200 shadow-lg">
          <input
            type="text"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            className="flex-1 p-3 rounded-l-xl border-2 border-gray-300 focus:border-[#4A90E2] focus:ring-0 outline-none transition-colors text-[#333333]"
            placeholder="Type your reply..."
            disabled={sending}
          />
          <button
            type="submit"
            className="bg-[#4A90E2] text-white p-3 rounded-r-xl font-bold hover:bg-[#3A75B9] transition shadow-md"
            disabled={sending || !replyText.trim()}
          >
            {sending ? "Sending..." : "Send"}
          </button>
        </form>
      </div>
    </div>
  );
}
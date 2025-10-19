// app/messages/[petId]/page.js
"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { auth } from "../../../app/lib/firebase"; // Note: Adjusted relative path

export default function ChatSessionPage() {
  const [pet, setPet] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const params = useParams();
  const router = useRouter();
  const user = auth.currentUser;
  const messagesEndRef = useRef(null);

  const petId = params.petId; // The ID of the pet whose messages we are viewing/replying to

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchPetMessages = async () => {
    if (!user) return router.push("/Login");

    try {
      const res = await fetch(`/api/pet/${petId}`); 
      if (!res.ok) return router.push("/messages");
      
      const data = await res.json();
      
      // Determine the partner ID from the message history for security and display
      const firstMessageSenderId = data.messages?.find(msg => msg.senderId !== data.ownerId)?.senderId;

      if (user.uid !== data.ownerId && user.uid !== firstMessageSenderId) {
          // Prevent unauthorized users from viewing the chat
          return router.push("/messages");
      }
      
      setPet(data);
    } catch (err) {
      console.error("Error fetching chat data:", err);
    } finally {
      setLoading(false);
    }
  };

  const sendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || sending) return;
    if (!user || !pet) return alert("Session expired. Please log in.");
    
    setSending(true);
    
    try {
      const res = await fetch(`/api/pet/${petId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "addMessage",
          requesterId: user.uid,
          requesterName: user.email.split("@")[0],
          messageText: replyText,
        }),
      });

      if (res.ok) {
        setReplyText("");
        fetchPetMessages(); 
      } else {
        alert("Failed to send reply.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };
  
  // NEW: Function to handle request status change
  const handleRequestStatus = async (status, requestId) => {
      if (!requestId) return alert("No request ID provided.");
      
      try {
          const res = await fetch(`/api/pet/${petId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                  action: "updateRequestStatus", // New API action
                  requestId: requestId,
                  newStatus: status,
              }),
          });
          
          if (res.ok) {
              alert(`Mating request has been ${status}.`);
              fetchPetMessages(); // Refresh chat
          } else {
              alert(`Failed to ${status} request.`);
          }
      } catch (err) {
          console.error(err);
      }
  };

  useEffect(() => {
    fetchPetMessages();
    const intervalId = setInterval(fetchPetMessages, 5000); 
    return () => clearInterval(intervalId);
  }, [user]);
  
  useEffect(() => {
      scrollToBottom();
  }, [pet?.messages]);

  if (loading || !pet) {
    return <p className="text-[#333333] text-center mt-20 text-xl">Loading chat session...</p>;
  }

  // --- UI START ---
  
  const isOwner = user?.uid === pet.ownerId;
  // Determine the conversation partner and the pending request
  const conversationPartnerId = pet.messages.find(msg => msg.senderId !== pet.ownerId)?.senderId;
  const partnerName = pet.messages.find(msg => msg.senderId !== pet.ownerId)?.senderName || "Requester";
  
  // Find the latest PENDING request involving this partner (identified by requesterId)
  const latestPendingRequest = pet.matingHistory?.find(
      (mh) => mh.requesterId === conversationPartnerId && mh.status === "pending"
  );
  
  return (
    <div className="h-screen w-screen bg-[#F4F7F9] flex justify-center items-stretch p-0">
      <div className="w-full max-w-xl bg-white rounded-none sm:rounded-2xl shadow-2xl flex flex-col h-full sm:h-[95vh] border-t-8 border-[#4A90E2] sm:my-4">
        
        {/* Header (Fixed) */}
        <div className="sticky top-0 bg-[#4A90E2] p-4 text-white shadow-md flex items-center justify-between">
            <button onClick={() => router.push("/messages")} className="text-xl hover:text-gray-200">
                &larr;
            </button>
            <h1 className="text-xl font-bold truncate">
                Chat about {pet.name} with {partnerName}
            </h1>
            <div className="w-6"></div>
        </div>
        
        {/* NEW: Request Management Banner (Only for Owner and if a pending request exists) */}
        {isOwner && latestPendingRequest && (
            <div className="bg-yellow-50 p-3 border-b border-yellow-200 flex flex-col sm:flex-row justify-between items-center text-sm font-semibold sticky top-14 z-10">
                <p className="text-[#333333] mb-2 sm:mb-0">
                    Mating request from **{latestPendingRequest.requesterPetName}** ({latestPendingRequest.requesterName})
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
          {pet.messages.length === 0 ? (
            <p className="text-center text-gray-500 mt-4">Start the conversation!</p>
          ) : (
            pet.messages.map((msg, index) => {
              const isSender = msg.senderId === user.uid;
              return (
                <div
                  key={index}
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
                      {isSender ? "You" : msg.senderName}
                    </p>
                    <p>{msg.text}</p>
                    <span className="block text-right text-xs text-gray-500 mt-1">
                        {new Date(msg.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
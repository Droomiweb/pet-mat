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

  // Helper function to scroll to the bottom of the messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchPetMessages = async () => {
    if (!user) return router.push("/Login");

    try {
      // Use the existing GET /api/pet/[id] to fetch all pet details including messages
      const res = await fetch(`/api/pet/${petId}`); 
      if (!res.ok) {
        return router.push("/messages"); // Redirect if pet not found
      }
      const data = await res.json();
      
      // Security check: Only the pet owner can view this page (or the initial requester)
      // For simplicity, we only allow the pet owner to reply here, 
      // as the initial requester replies via the /pet/[id] page.
      if (user.uid !== data.ownerId) {
          // This path is for the OWNER of the pet to manage their messages.
          // Implement proper authorization for the requester if needed later.
          // For now, if you are not the owner, redirect to the pet view.
          return router.push(`/pet/${petId}`);
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
      // Use the existing PATCH endpoint with action: "addMessage"
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
        // Re-fetch messages to simulate chat update
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

  useEffect(() => {
    fetchPetMessages();
    // Set up polling to fetch new messages every 5 seconds (simulates live chat)
    const intervalId = setInterval(fetchPetMessages, 5000); 
    return () => clearInterval(intervalId); // Cleanup interval on component unmount
  }, [user]);
  
  useEffect(() => {
      scrollToBottom(); // Scroll to bottom whenever messages update
  }, [pet?.messages]);

  if (loading || !pet) {
    return <p className="text-[#333333] text-center mt-20 text-xl">Loading chat session for {petId}...</p>;
  }

  // --- UI START ---
  
  // Find the conversation partner ID
  const conversationPartnerId = pet.messages.find(msg => msg.senderId !== user.uid)?.senderId;
  const partnerName = pet.messages.find(msg => msg.senderId !== user.uid)?.senderName || "Unknown Partner";
  
  return (
    // Full screen chat layout
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
            <div className="w-6"></div> {/* Spacer */}
        </div>
        
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
          <div ref={messagesEndRef} /> {/* Invisible element to anchor the scroll */}
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
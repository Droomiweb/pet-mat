// app/aichat/page.js
"use client";
import React, { useState, useEffect, useRef } from "react";
import { auth } from "../lib/firebase";
import model from "../lib/gemini"; 
import { useRouter } from "next/navigation";

export default function AIChat() {
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const textareaRef = useRef(null);
  const chatScrollRef = useRef(null);

  // Fetch user + pets for initial AI message
  const fetchUserDataAndPets = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      router.push("/Login");
      return;
    }
    setUser(currentUser);

    try {
      const res = await fetch(`/api/pet/user/${currentUser.uid}`);
      if (res.ok) {
        const petsData = await res.json();
        const petContext = petsData.map(p => `${p.name} (${p.breed}, ${p.age} years old)`).join("; ");
        
        setMessages([
          {
            sender: "ai",
            text: `Hello! I'm Dr. Paws, your personal pet care assistant. I see you have ${petsData.length} pets registered. Your companion${petsData.length === 1 ? '' : 's'} include: ${petContext || "no pets yet"}. How can I help you ensure their well-being today?`
          },
        ]);
      } else {
        setMessages([
          {
            sender: "ai",
            text: "Hello! I'm Dr. Paws. I couldn't load your pet data, but I'm ready to answer any general pet care questions you have!"
          },
        ]);
      }
    } catch (err) {
      console.error("Error fetching pet data for AI context:", err);
    }
  };

  useEffect(() => {
    fetchUserDataAndPets();
  }, []);

  // autosize textarea so it grows like WhatsApp
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    const newHeight = Math.min(ta.scrollHeight, 160); // cap height
    ta.style.height = `${newHeight}px`;
  }, [input]);

  // scroll to bottom on new message / loading
  useEffect(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    // small timeout so layout settles (instant scroll often works too)
    setTimeout(() => {
      el.scrollTop = el.scrollHeight;
    }, 40);
  }, [messages, loading]);

  // Send message function (kept your logic)
  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const currentUser = auth.currentUser;
    if (!currentUser) return router.push("/Login");

    setLoading(true);
    const newMessage = { sender: "user", text: input };
    setMessages((prev) => [...prev, newMessage]);
    setInput("");

    try {
      const res = await fetch(`/api/pet/user/${currentUser.uid}`);
      const petsData = res.ok ? await res.json() : [];

      const petContext = petsData.map(p => `${p.name} the ${p.breed} with age ${p.age} and gender ${p.gender}`).join(", ");
      
      const contextPrompt = `
You are "Dr. Paws", a friendly, experienced, and highly knowledgeable virtual veterinarian.
Your goal is to provide helpful, general pet-care advice and suggestions.
Always speak with confidence, empathy, and professionalism.
Focus on preventative care, nutrition, behavior, and common non-emergency ailments.
Always keep the context of the user's pets in mind. The user's registered pets are: ${petContext}.
If the user's question doesn't specify a pet, please ask them which pet they are referring to.
If the advice involves what sounds like a serious medical condition (e.g., severe lethargy, non-stop vomiting, injury), you MUST politely and firmly recommend that the user immediately consult a licensed, in-person veterinarian.
Do not use disclaimers about not being a real doctor in your response; instead, let your helpful tone and context-aware advice guide the user.
`;

      const result = await model.generateContent([contextPrompt, newMessage.text]);
      const response = await result.response;
      const text = await response.text();

      setMessages((prev) => [...prev, { sender: "ai", text }]);
    } catch (error) {
      console.error("Error generating AI response:", error);
      setMessages((prev) => [...prev, { sender: "ai", text: "Dr. Paws is taking a nap! Sorry, I am unable to respond right now." }]);
    } finally {
      setLoading(false);
    }
  };

  // handle enter to send (shift+enter to newline)
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="h-screen w-screen bg-[#F4F7F9] flex justify-center items-stretch p-0">
      <div className="w-full max-w-xl bg-white rounded-none sm:rounded-2xl shadow-2xl flex flex-col h-full sm:h-[95vh] border-t-8 border-[#4A90E2] sm:my-4 relative">
        
        {/* Header */}
        <div className="sticky top-0 bg-white p-4 border-b border-gray-200 z-10">
            <h1 className="text-3xl font-extrabold text-[#333333] text-center">
                Dr. Paws Chat 🩺
            </h1>
        </div>
        
        {/* Chat window (give bottom padding so messages are not hidden by fixed input) */}
        <div
          ref={chatScrollRef}
          className="flex-1 overflow-y-auto space-y-4 p-4 pb-[140px]" 
          // pb must be >= input bar height + safe-area; 140px is safe default
        >
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`p-3 rounded-2xl max-w-[85%] shadow-md break-words ${
                  msg.sender === "user"
                    ? "bg-[#50E3C2] text-[#0f1724] rounded-br-none" 
                    : "bg-[#4A90E2] text-white rounded-tl-none" 
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-200 text-[#4A90E2] p-3 rounded-xl animate-pulse font-medium">
                Dr. Paws is thinking...
              </div>
            </div>
          )}
        </div>

        {/* FIXED bottom input — WhatsApp-like style */}
        <div
          className="fixed left-0 right-0 bottom-0 flex justify-center z-50 pointer-events-auto"
          // Use inline style to preserve safe-area padding (this centers the bar)
          style={{ padding: "12px 12px", paddingBottom: `calc(env(safe-area-inset-bottom, 0) + 12px)` }}
        >
          <div className="w-full max-w-xl px-2">
            <div className="flex items-end gap-3">
              {/* Textarea */}
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask Dr. Paws about your pets' health..."
                rows={1}
                className="flex-1 resize-none min-h-[44px] max-h-[160px] px-4 py-3 rounded-full border border-gray-300 focus:outline-none focus:ring-0 focus:border-[#4A90E2] text-[#333333] text-sm bg-white shadow-sm"
                disabled={loading}
                aria-label="Message"
              />

              {/* Circular Send button */}
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                aria-label="Send message"
                className={`flex items-center justify-center h-11 w-11 rounded-full transition-all ${
                  input.trim() ? "bg-[#4A90E2] text-white shadow-lg hover:bg-[#3A75B9]" : "bg-gray-300 text-white cursor-default opacity-80"
                }`}
                title={input.trim() ? "Send" : "Type a message to enable"}
              >
                {/* simple paper-plane icon */}
                <svg viewBox="0 0 24 24" width="18" height="18" className="fill-current">
                  <path d="M2 21l21-9L2 3v7l15 2-15 2z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

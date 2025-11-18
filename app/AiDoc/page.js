// app/AiDoc/page.js
"use client";
import React, { useState, useEffect, useRef } from "react";
import { auth } from "../lib/firebase";
import { useRouter } from "next/navigation";

export default function AIChat() {
  // UI Messages
  const [messages, setMessages] = useState([]);
  // Gemini History (for API context)
  const [geminiHistory, setGeminiHistory] = useState([]);
  
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const router = useRouter();
  const textareaRef = useRef(null);
  const chatScrollRef = useRef(null); // Points to the scrollable container

  // 1. Initialize Chat & Context on Load
  useEffect(() => {
    const initChat = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        router.push("/Login");
        return;
      }

      try {
        // Fetch User's Pets for Context
        const res = await fetch(`/api/pet/user/${currentUser.uid}`);
        const petsData = res.ok ? await res.json() : [];
        
        const petContext = petsData.length > 0 
          ? petsData.map(p => `- ${p.name} (${p.breed}, ${p.age}y, ${p.gender})`).join("\n")
          : "No registered pets found.";

        // Specialized Vet System Prompt (Same as before)
        const systemInstruction = `
          You are Dr. Paws, a virtual veterinarian assistant. Your goal is to triage pet health concerns professionally.

          **User's Registered Pets:**
          ${petContext}

          **Your Clinical Protocol:**
          1.  **Context Check:** If the user asks a health question without naming a pet, check the list above. If ambiguous, ask "Which pet are we talking about?" first.
          2.  **Triage Phase (CRITICAL):** DO NOT jump to a diagnosis immediately. If the user gives vague symptoms (e.g., "My dog is vomiting"), ask 2-3 clarifying questions first (Duration? Frequency? Behavior? Eating habits?) like a real vet would.
          3.  **Emergency Detection:** If symptoms indicate an emergency (pale gums, bloating, seizure, difficulty breathing, blocked cat), STOP and tell them to go to an ER vet immediately.
          4.  **Advice Structure:**
              * **Observation:** "It sounds like [Pet Name] might be experiencing..."
              * **Home Care:** Give safe, non-medical supportive care steps (e.g., bland diet, hydration).
              * **Warning Signs:** "If you see X, Y, or Z, see a vet."
          5.  **Tone:** Empathetic, calm, professional, but clear. Keep responses concise (under 150 words) unless detailed instructions are needed.
        `;

        const initialGreeting = `Hello! I'm Dr. Paws. I have your pet records ready. How can I help your furry family today?`;

        setMessages([
          { sender: "ai", text: initialGreeting }
        ]);

        setGeminiHistory([
          {
            role: "user",
            parts: [{ text: `System Instruction: ${systemInstruction}` }],
          },
          {
            role: "model",
            parts: [{ text: initialGreeting }],
          },
        ]);

        setIsInitialized(true);

      } catch (err) {
        console.error("Error initializing AI:", err);
      }
    };

    initChat();
  }, [router]);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const sendMessage = async () => {
    if (!input.trim() || loading || !isInitialized) return;

    const userMsg = input.trim();
    setInput("");
    
    // 1. Update UI immediately
    setMessages((prev) => [...prev, { sender: "user", text: userMsg }]);
    setLoading(true);

    // Reset textarea height
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    try {
      // 2. Call Server API (Uses the dedicated server route to keep API key safe)
      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          history: geminiHistory,
          message: userMsg
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "API Error");

      const aiResponseText = data.text;

      // 3. Update UI
      setMessages((prev) => [...prev, { sender: "ai", text: aiResponseText }]);

      // 4. Update History
      setGeminiHistory((prev) => [
        ...prev,
        { role: "user", parts: [{ text: userMsg }] },
        { role: "model", parts: [{ text: aiResponseText }] },
      ]);

    } catch (error) {
      console.error("Chat Error:", error);
      setMessages((prev) => [...prev, { sender: "ai", text: "Dr. Paws is offline. Please try again later." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    // Main Container: Fixed to viewport, padded top for Navbar
    <div className="fixed inset-0 bg-[#E2F4EF] pt-[60px] flex flex-col h-dvh"> 
      
      {/* Chat Wrapper: Centered, Shadowed, Flex Column */}
      <div className="w-full max-w-3xl mx-auto flex flex-col h-full bg-white shadow-2xl border-x border-gray-200 relative overflow-hidden">
        
        {/* --- HEADER --- */}
        <div className="shrink-0 bg-white px-4 py-3 border-b border-gray-300 flex items-center justify-between z-20 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#E2F4EF] border border-gray-300 flex items-center justify-center overflow-hidden">
               <span className="text-2xl">🩺</span>
            </div>
            <div>
              <h1 className="text-gray-800 font-bold text-base leading-tight">Dr. Paws</h1>
              <p className="text-xs text-[#50E3C2] font-semibold">Online • AI Vet</p>
            </div>
          </div>
        </div>

        {/* --- MESSAGES AREA (Scrollable) --- */}
        <div 
          className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 bg-[#F4F7F9] relative scroll-smooth" 
          ref={chatScrollRef}
        >
          {/* Decorative background overlay - optional, commented out for cleaner look */}
          {/* <div className="absolute inset-0 opacity-[0.06] pointer-events-none" style={{backgroundImage: "radial-gradient(#4A90E2 1px, transparent 1px)", backgroundSize: "20px 20px"}}></div> */}

          {messages.map((msg, index) => {
            const isUser = msg.sender === "user";
            return (
              <div key={index} className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}>
                <div 
                  className={`relative max-w-[80%] px-4 py-2 rounded-xl shadow-md text-sm leading-relaxed whitespace-pre-wrap ${
                    isUser 
                      ? "bg-[#50E3C2] text-gray-800 rounded-br-none" // Accent Teal for User
                      : "bg-white text-gray-800 rounded-bl-none border border-gray-200"     // White for AI
                  }`}
                >
                  {/* Little tail for speech bubble */}
                  <div className={`absolute bottom-0 w-0 h-0 border-[8px] border-transparent ${
                      isUser 
                      ? "-right-1 border-r-[#50E3C2]" 
                      : "-left-1 border-l-white"
                  }`}></div>
                  
                  {msg.text}
                  <div className="text-[10px] text-gray-500 text-right mt-1 select-none">
                    {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </div>
                </div>
              </div>
            );
          })}
          
          {loading && (
            <div className="flex justify-start w-full">
              <div className="bg-white p-3 rounded-xl rounded-bl-none shadow-sm border border-gray-100">
                 <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></span>
                 </div>
              </div>
            </div>
          )}
        </div>

        {/* --- INPUT AREA (Sticky Bottom) --- */}
        <div className="shrink-0 bg-white px-4 py-3 border-t border-gray-300">
          <div className="flex items-end gap-3 max-w-4xl mx-auto">
            <div className="flex-1 bg-white rounded-3xl border border-gray-300 focus-within:border-[#4A90E2] shadow-inner">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask Dr. Paws about your pets..."
                className="w-full bg-transparent border-none focus:ring-0 text-gray-800 text-sm resize-none max-h-32 placeholder-gray-500 px-4 py-3"
                rows={1}
                style={{ minHeight: '24px' }}
              />
            </div>
            
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-all shadow-md ${
                input.trim() 
                  ? "bg-[#4A90E2] hover:bg-[#3A75B9] text-white transform hover:scale-105" // Primary Blue for Send
                  : "bg-gray-300 text-gray-500 cursor-default"
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 ml-0.5">
                <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
              </svg>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
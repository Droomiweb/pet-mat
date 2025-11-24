// app/AiDoc/page.js
"use client";
import React, { useState, useEffect, useRef } from "react";
import { auth } from "../lib/firebase";
import { useRouter } from "next/navigation";
import ReactMarkdown from 'react-markdown'; // <--- NEW IMPORT

// Simple icons
const PaperclipIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
  </svg>
);

const XMarkIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

export default function AIChat() {
  const [messages, setMessages] = useState([]);
  const [geminiHistory, setGeminiHistory] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  
  // --- Pet Selection State ---
  const [myPets, setMyPets] = useState([]);
  const [selectedPetId, setSelectedPetId] = useState("");

  // --- Image Upload State ---
  const [selectedImage, setSelectedImage] = useState(null); // File object
  const [imagePreview, setImagePreview] = useState(null);   // URL for preview
  
  const router = useRouter();
  const textareaRef = useRef(null);
  const chatScrollRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const initChat = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        router.push("/Login");
        return;
      }

      try {
        const res = await fetch(`/api/pet/user/${currentUser.uid}`);
        const petsData = res.ok ? await res.json() : [];
        setMyPets(petsData);

        const initialGreeting = `Hello! I'm Dr. Paws. I can analyze pet photos and medical history. Select a pet or upload a photo to start!`;

        setMessages([{ sender: "ai", text: initialGreeting }]);
        
        // Initial System Instruction for the Chat History
        const systemInstruction = `
          You are Dr. Paws, a virtual veterinarian assistant.
          1. Triage health concerns using text AND images.
          2. If an image is provided, analyze it for symptoms (e.g. redness, swelling, posture).
          3. Use "Medical Memory" if available.
          4. Warn about emergencies.
        `;

        setGeminiHistory([
          { role: "user", parts: [{ text: `System Instruction: ${systemInstruction}` }] },
          { role: "model", parts: [{ text: initialGreeting }] },
        ]);

      } catch (err) {
        console.error("Error initializing AI:", err);
      }
    };

    initChat();
  }, [router]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, loading, imagePreview]);

  // --- Handle Image Selection ---
  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  // --- Remove Image ---
  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // --- Convert File to Base64 ---
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  const sendMessage = async () => {
    if ((!input.trim() && !selectedImage) || loading) return;

    const userMsg = input.trim();
    const currentImage = selectedImage; // Capture current image
    const currentPreview = imagePreview; // Capture preview for UI

    // Clear inputs immediately
    setInput("");
    clearImage();
    
    // 1. Update UI with User Message
    setMessages((prev) => [
      ...prev, 
      { 
        sender: "user", 
        text: userMsg, 
        image: currentPreview // Store preview URL to display in chat bubble
      }
    ]);
    
    setLoading(true);
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    try {
      let imageBase64 = null;
      
      // 2. Process Image if exists
      if (currentImage) {
        imageBase64 = await fileToBase64(currentImage);
      }

      // 3. API Call
      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          history: geminiHistory,
          message: userMsg || "Analyze this image.",
          petId: selectedPetId || null,
          image: imageBase64, // Send base64 string
          mimeType: currentImage?.type || null
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "API Error");

      const aiResponseText = data.text;

      // 4. Update UI with AI Response
      setMessages((prev) => [...prev, { sender: "ai", text: aiResponseText }]);

      // 5. Update History
      // We describe the image action in text so the AI remembers it happened in future turns
      const historyEntry = currentImage 
        ? `[User uploaded an image] ${userMsg}` 
        : userMsg;

      setGeminiHistory((prev) => [
        ...prev,
        { role: "user", parts: [{ text: historyEntry }] },
        { role: "model", parts: [{ text: aiResponseText }] },
      ]);

    } catch (error) {
      console.error("Chat Error:", error);
      setMessages((prev) => [...prev, { sender: "ai", text: "Dr. Paws is offline or couldn't process that image. Please try again." }]);
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
    <div className="fixed inset-0 bg-[#E2F4EF] pt-[60px] flex flex-col h-dvh"> 
      <div className="w-full max-w-3xl mx-auto flex flex-col h-full bg-white shadow-2xl border-x border-gray-200 relative overflow-hidden">
        
        {/* --- HEADER --- */}
        <div className="shrink-0 bg-white px-4 py-3 border-b border-gray-300 z-20 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#E2F4EF] border border-gray-300 flex items-center justify-center text-2xl">
                🩺
                </div>
                <div>
                <h1 className="text-gray-800 font-bold text-base leading-tight">Dr. Paws</h1>
                <p className="text-xs text-[#50E3C2] font-semibold">Visual AI Vet</p>
                </div>
            </div>

            <div className="relative">
                <select
                    value={selectedPetId}
                    onChange={(e) => setSelectedPetId(e.target.value)}
                    className="appearance-none bg-gray-50 border border-gray-300 text-gray-700 py-2 px-4 pr-8 rounded-lg leading-tight focus:outline-none focus:bg-white focus:border-[#4A90E2] text-sm font-semibold cursor-pointer"
                >
                    <option value="">General Chat</option>
                    {myPets.map(pet => (
                        <option key={pet._id} value={pet._id}>
                            {pet.name} ({pet.breed})
                        </option>
                    ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                </div>
            </div>
          </div>
        </div>

        {/* --- MESSAGES --- */}
        <div 
          className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 bg-[#F4F7F9] relative scroll-smooth" 
          ref={chatScrollRef}
        >
          {messages.map((msg, index) => {
            const isUser = msg.sender === "user";
            return (
              <div key={index} className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}>
                <div 
                  className={`relative max-w-[80%] px-4 py-2 rounded-xl shadow-md text-sm leading-relaxed ${
                    isUser 
                      ? "bg-[#50E3C2] text-gray-800 rounded-br-none whitespace-pre-wrap" 
                      : "bg-white text-gray-800 rounded-bl-none border border-gray-200"
                  }`}
                >
                  {/* Render Image if present */}
                  {msg.image && (
                    <div className="mb-2 rounded-lg overflow-hidden border border-black/10">
                      <img src={msg.image} alt="User Upload" className="w-full h-auto object-cover max-h-60" />
                    </div>
                  )}
                  
                  {/* --- MARKDOWN RENDERING LOGIC --- */}
                  {isUser ? (
                    msg.text
                  ) : (
                    <ReactMarkdown 
                      components={{
                        // This styles the **Bold** text
                        strong: ({node, ...props}) => <span className="font-bold text-gray-900" {...props} />,
                        // This styles the bullet points
                        ul: ({node, ...props}) => <ul className="list-disc pl-5 my-2 space-y-1" {...props} />,
                        ol: ({node, ...props}) => <ol className="list-decimal pl-5 my-2 space-y-1" {...props} />,
                        li: ({node, ...props}) => <li className="" {...props} />,
                        // This handles paragraphs to ensure proper spacing
                        p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                        // Headings just in case AI sends them
                        h1: ({node, ...props}) => <h1 className="text-lg font-bold mt-2 mb-1" {...props} />,
                        h2: ({node, ...props}) => <h2 className="text-base font-bold mt-2 mb-1" {...props} />,
                      }}
                    >
                      {msg.text}
                    </ReactMarkdown>
                  )}
                  
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

        {/* --- INPUT AREA --- */}
        <div className="shrink-0 bg-white px-4 py-3 border-t border-gray-300">
          
          {/* Image Preview Strip */}
          {imagePreview && (
            <div className="flex mb-2">
              <div className="relative">
                <img src={imagePreview} alt="Preview" className="h-20 w-20 object-cover rounded-lg border border-gray-300 shadow-sm" />
                <button 
                  onClick={clearImage}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition"
                >
                  <XMarkIcon />
                </button>
              </div>
            </div>
          )}

          <div className="flex items-end gap-3 max-w-4xl mx-auto">
            
            {/* Image Upload Button */}
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors mb-1"
              title="Upload Photo"
            >
              <PaperclipIcon />
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageSelect} 
              accept="image/*" 
              className="hidden" 
            />

            {/* Text Area */}
            <div className="flex-1 bg-white rounded-3xl border border-gray-300 focus-within:border-[#4A90E2] shadow-inner">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                className="w-full bg-transparent border-none focus:ring-0 text-gray-800 text-sm resize-none max-h-32 placeholder-gray-500 px-4 py-3"
                rows={1}
                style={{ minHeight: '24px' }}
              />
            </div>
            
            {/* Send Button */}
            <button
              onClick={sendMessage}
              disabled={(!input.trim() && !selectedImage) || loading}
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-all shadow-md ${
                (input.trim() || selectedImage)
                  ? "bg-[#4A90E2] hover:bg-[#3A75B9] text-white" 
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
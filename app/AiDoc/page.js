// app/aichat/page.js
"use client";
import { useState, useEffect } from "react";
import { auth } from "../lib/firebase";
import model from "../lib/gemini"; // Import the Gemini model
import { useRouter } from "next/navigation";

export default function AIChat() {
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Function to fetch the current user's pet data for context
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
        // Construct an engaging initial message from the AI with personalized context
        const petContext = petsData.map(p => `${p.name} (${p.breed}, ${p.age} years old)`).join("; ");
        
        setMessages([
          {
            sender: "ai",
            text: `Hello! I'm Dr. Paws, your personal pet care assistant. I see you have ${petsData.length} pets registered. Your companion${petsData.length === 1 ? '' : 's'} include: ${petContext || "no pets yet"}. How can I help you ensure their well-being today?`
          },
        ]);
      } else {
        // Fallback message if pet data fails to load
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

  // Function to send a message to the Gemini API
  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const currentUser = auth.currentUser;
    if (!currentUser) return router.push("/Login"); // Double check login state

    setLoading(true);
    const newMessage = { sender: "user", text: input };
    setMessages((prev) => [...prev, newMessage]);
    setInput("");

    try {
      const res = await fetch(`/api/pet/user/${currentUser.uid}`);
      const petsData = res.ok ? await res.json() : [];

      const petContext = petsData.map(p => `${p.name} the ${p.breed} with age ${p.age} and gender ${p.gender}`).join(", ");
      
      // Use a robust, detailed system instruction/context prompt for accuracy and tone
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
      const text = response.text();

      setMessages((prev) => [...prev, { sender: "ai", text }]);
    } catch (error) {
      console.error("Error generating AI response:", error);
      setMessages((prev) => [...prev, { sender: "ai", text: "Dr. Paws is taking a nap! Sorry, I am unable to respond right now." }]);
    } finally {
      setLoading(false);
    }
  };

  // UPDATED UI: Using new colors and styles
  return (
    <div className="min-h-screen bg-[#F4F7F9] p-4 md:p-10 flex flex-col items-center">
      <div className="max-w-xl w-full bg-white rounded-3xl shadow-2xl p-6 md:p-10 flex flex-col h-[80vh] border-t-8 border-[#4A90E2]">
        <h1 className="text-3xl font-extrabold text-[#333333] mb-6 text-center border-b pb-3 border-gray-100">
          Meet Dr. Paws 🩺
        </h1>
        
        {/* Chat window - Cleaned up styling */}
        <div className="flex-1 overflow-y-auto space-y-4 mb-6 p-4 rounded-xl border border-gray-200 bg-gray-50/50 shadow-inner">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`p-3 rounded-2xl max-w-[85%] shadow-md ${
                  msg.sender === "user"
                    ? "bg-[#50E3C2] text-[#333333] rounded-br-none" // Secondary accent for user
                    : "bg-[#4A90E2] text-white rounded-tl-none" // Primary accent for AI
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

        {/* Input form - Cleaned up styling */}
        <div className="flex mt-auto">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            // Use new input style, rounded on the left
            className="flex-1 p-4 rounded-l-xl border-2 border-gray-300 focus:border-[#4A90E2] focus:ring-0 outline-none transition-colors text-[#333333]"
            placeholder="Ask Dr. Paws about your pets' health or behavior..."
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            // Use new button style, rounded on the right
            className="bg-[#4A90E2] text-white p-4 rounded-r-xl font-bold hover:bg-[#3A75B9] transition shadow-md"
            disabled={loading || !input.trim()}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
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
        // Create an initial message from the AI with personalized context
        setMessages([
          {
            sender: "ai",
            text: `Hello! I'm here to help with your pets. I know you have ${petsData.length} pets. Based on your pet data, you have: ${petsData.map(p => `${p.name} the ${p.breed}`).join(", ")}. What can I help you with today?`
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

    setLoading(true);
    const newMessage = { sender: "user", text: input };
    setMessages((prev) => [...prev, newMessage]);
    setInput("");

    try {
      // The core AI interaction: sending the prompt and getting a response
      // Right before you send user messages, set a system or context prompt:
const contextPrompt = `
You are "Dr. Paws", a friendly virtual veterinarian.
Speak with confidence and empathy, using clear and practical pet-care advice.
Avoid disclaimers such as "I am not a doctor" or "I cannot provide medical advice" —
instead, focus on offering helpful, general pet-care guidance and suggestions.
If something sounds serious, recommend visiting a vet politely.
`;

const result = await model.generateContent([contextPrompt, newMessage.text]);
      const response = await result.response;
      const text = response.text();

      setMessages((prev) => [...prev, { sender: "ai", text }]);
    } catch (error) {
      console.error("Error generating AI response:", error);
      setMessages((prev) => [...prev, { sender: "ai", text: "Sorry, I am unable to respond right now." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F1E9] p-4 md:p-10 flex flex-col items-center">
      <div className="max-w-xl w-full bg-white rounded-3xl shadow-lg p-6 md:p-10 flex flex-col h-[70vh]">
        <h1 className="text-3xl font-bold text-[#4F200D] mb-4 text-center">PetMate AI Chat</h1>
        
        {/* Chat window */}
        <div className="flex-1 overflow-y-auto space-y-4 mb-4 p-2 border rounded-xl bg-gray-50">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`p-3 rounded-xl max-w-[80%] ${
                  msg.sender === "user"
                    ? "bg-[#FF9A00] text-white"
                    : "bg-[#FFD93D] text-[#4F200D]"
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-[#FFD93D] text-[#4F200D] p-3 rounded-xl animate-pulse">
                Thinking...
              </div>
            </div>
          )}
        </div>

        {/* Input form */}
        <div className="flex mt-auto">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            className="flex-1 p-3 rounded-l-xl border-2 border-[#4F200D] focus:outline-none"
            placeholder="Ask something about your pets..."
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            className="bg-[#4F200D] text-white p-3 rounded-r-xl hover:bg-orange-500 transition"
            disabled={loading}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
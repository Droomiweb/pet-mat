// app/messages/page.js
"use client";
import { useEffect, useState } from "react";
import { auth } from "../lib/firebase";
import { useRouter } from "next/navigation";
import Link from "next/link"; // Import Link for navigation

export default function MessagesPage() {
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const user = auth.currentUser;

  // Function to fetch the current user's pets and their requests/messages
  const fetchMyPets = async () => {
    if (!user) {
      return router.push("/Login");
    }
    
    setLoading(true);
    try {
      const res = await fetch(`/api/pet/user/${user.uid}`);
      if (res.ok) {
        const data = await res.json();
        setPets(data);
      } else {
        console.error("Failed to fetch pets:", await res.text());
      }
    } catch (err) {
      console.error("Error fetching pets:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyPets();
  }, []);
  
  if (!user) {
      return null; // Don't render anything if redirecting
  }

  if (loading) {
    // Apply new UI loading style
    return <p className="text-[#333333] text-center mt-20 text-xl">Loading your requests and messages...</p>;
  }

  return (
    // Apply new UI BG color
    <div className="min-h-screen bg-[#F4F7F9] p-4 md:p-10">
      <div className="max-w-5xl mx-auto bg-white rounded-3xl shadow-2xl p-6 md:p-10 border-t-8 border-[#4A90E2]">
        <h1 className="text-3xl font-extrabold text-[#333333] mb-8 border-b pb-3 border-gray-100">
            My Pet's Requests & Conversations
        </h1>

        {pets.length === 0 ? (
          <p className="text-[#333333] text-lg">You haven't added any pets yet. No messages to display.</p>
        ) : (
          <div className="space-y-6">
            {pets.map((pet) => {
              
              // FIX: Safely calculate latest message and determine if the pet has any messages
              const hasMessages = pet.messages && pet.messages.length > 0;
              
              const latestMessageText = hasMessages 
                ? pet.messages[pet.messages.length - 1].text.substring(0, 50) + "..."
                : 'No messages yet. Receive a request to start a chat.';
                
              const latestMessageDisplay = hasMessages 
                ? `Latest message: "${latestMessageText}"`
                : 'No messages yet. Receive a request to start a chat.';

              return (
              <div key={pet._id} className="border p-6 rounded-xl bg-gray-50 shadow-md hover:shadow-lg transition-shadow">
                <h2 className="text-2xl font-bold text-[#4A90E2]">{pet.name}</h2>
                
                {/* Mating Requests Summary */}
                <div className="mt-4 border-b pb-4 border-gray-200">
                  <h3 className="text-xl font-bold text-[#333333]">Mating Requests</h3>
                  <p className="text-sm text-gray-600 mt-2">
                    <span className="font-semibold text-red-600">{pet.matingHistory?.filter(r => r.status === 'pending').length || 0}</span> Pending Requests
                  </p>
                  {pet.matingHistory?.length > 0 && (
                      <Link href={`/pet/${pet._id}`} className="text-[#50E3C2] font-semibold underline text-sm mt-1 block hover:text-[#4A90E2]">
                          View Full Request History
                      </Link>
                  )}
                </div>

                {/* Messages Section (Link to Live Chat) */}
                <div className="mt-4">
                  <h3 className="text-xl font-bold text-[#333333]">Active Conversations</h3>
                  {hasMessages ? (
                    <div className="space-y-3 mt-2">
                      <div className="bg-white p-3 rounded-lg shadow-inner border border-gray-200">
                        <p className="font-bold text-[#333333] flex justify-between items-center">
                            Chat about {pet.name}
                        </p>
                        <p className="text-sm text-gray-500 mt-1 italic">
                            {/* Use the safely calculated text */}
                            {latestMessageDisplay}
                        </p>
                        
                        {/* LINK TO THE NEW CHAT SESSION PAGE */}
                        <Link href={`/messages/${pet._id}`}>
                          <button
                            className="mt-3 bg-[#4A90E2] hover:bg-[#3A75B9] text-white font-bold px-4 py-2 rounded-lg shadow-md transition-colors"
                          >
                            Open Conversation
                          </button>
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-600 mt-2">No messages yet. Receive a request to start a chat.</p>
                  )}
                </div>
              </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  );
}
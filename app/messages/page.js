// app/messages/page.js
"use client";
import { useEffect, useState } from "react";
import { auth } from "../lib/firebase";
import { useRouter } from "next/navigation";

export default function MessagesPage() {
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Function to fetch the current user's pets and their requests/messages
  const fetchMyPets = async () => {
    const user = auth.currentUser;
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

  if (loading) {
    return <p className="text-center text-[#4F200D] mt-20">Loading messages...</p>;
  }

  return (
    <div className="min-h-screen bg-[#F6F1E9] p-4 md:p-10">
      <div className="max-w-5xl mx-auto bg-white rounded-3xl shadow-lg p-6 md:p-10">
        <h1 className="text-3xl font-bold text-[#4F200D] mb-8">My Pet's Requests & Messages</h1>

        {pets.length === 0 ? (
          <p className="text-[#4F200D]">You haven't added any pets yet. No messages to display.</p>
        ) : (
          <div className="space-y-8">
            {pets.map((pet) => (
              <div key={pet._id} className="border p-6 rounded-xl bg-yellow-100 shadow-md">
                <h2 className="text-2xl font-bold text-[#4F200D]">{pet.name}</h2>
                
                {/* Mating Requests Section */}
                <div className="mt-4">
                  <h3 className="text-xl font-bold text-[#4F200D]">Mating Requests ({pet.matingHistory?.length || 0})</h3>
                  {pet.matingHistory?.length === 0 ? (
                    <p className="text-[#4F200D] mt-2">No mating requests for this pet.</p>
                  ) : (
                    <ul className="list-disc list-inside mt-2 space-y-2">
                      {pet.matingHistory?.map((req, idx) => (
                        <li key={idx} className="text-[#4F200D]">
                          <span className="font-semibold">{req.requesterName}</span>
                          <span className="ml-2 text-sm text-gray-600">({new Date(req.requestedAt).toLocaleString()})</span>
                          <span className={`ml-2 px-2 py-1 rounded-full text-xs font-bold ${
                            req.status === 'pending' ? 'bg-orange-300 text-orange-900' :
                            req.status === 'accepted' ? 'bg-green-300 text-green-900' :
                            'bg-red-300 text-red-900'
                          }`}>
                            {req.status}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Messages Section */}
                <div className="mt-6">
                  <h3 className="text-xl font-bold text-[#4F200D]">Messages ({pet.messages?.length || 0})</h3>
                  {pet.messages?.length === 0 ? (
                    <p className="text-[#4F200D] mt-2">No messages for this pet.</p>
                  ) : (
                    <div className="space-y-3 mt-2">
                      {pet.messages?.map((msg, idx) => (
                        <div key={idx} className="bg-white p-3 rounded-lg shadow-sm">
                          <p className="font-bold text-[#4F200D]">{msg.senderName}:</p>
                          <p className="text-[#4F200D] mt-1">{msg.text}</p>
                          <p className="text-xs text-gray-500 mt-1">{new Date(msg.sentAt).toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Add a reply button here */}
                {/* This will open a modal or new form to send a reply */}
                {/* For this example, we'll just show a placeholder */}
                <div className="mt-4">
                  <button
                    onClick={() => alert(`Replying to messages for ${pet.name}`)}
                    className="bg-[#4F200D] hover:bg-orange-500 text-white px-4 py-2 rounded-lg"
                  >
                    Reply
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
// app/pet/[id]/page.js
"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { auth } from "../../lib/firebase";
import Link from "next/link"; // Import Link for navigation

export default function PetDetailPage() {
  const [pet, setPet] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const params = useParams();
  const router = useRouter();
  const user = auth.currentUser; // Get current user once

  // Helper function to get badge styling based on verification status
  const getStatusBadge = (status) => {
    switch (status) {
      case 'verified':
        return 'bg-green-100 text-green-700 border-green-400';
      case 'rejected':
        return 'bg-red-100 text-red-700 border-red-400';
      default:
        return 'bg-yellow-100 text-yellow-700 border-yellow-400';
    }
  };

  // Function to fetch pet data
  const fetchPet = async () => {
    try {
      const res = await fetch(`/api/pet/${params.id}`);
      if (!res.ok) {
        return router.push("/");
      }
      const data = await res.json();
      setPet(data);
    } catch (err) {
      console.error(err);
    }
  };

  // Function to send a mating request
  const sendMatingRequest = async () => {
    if (!user) {
      return alert("Login first");
    }

    if (user.uid === pet.ownerId) {
      return alert("You cannot send a mating request to your own pet.");
    }
    
    // Check if pet is verified before sending request
    if (pet.verificationStatus !== 'verified') {
        return alert("This pet's certificate is not yet verified. Requests are currently disabled.");
    }

    // Check if a pending request already exists
    const existingRequest = pet.matingHistory.find(
      (mh) => mh.requesterId === user.uid && mh.status === "pending"
    );

    if (existingRequest) {
      return alert("You already have a pending mating request for this pet.");
    }

    try {
      const res = await fetch(`/api/pet/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "matingRequest",
          requesterId: user.uid,
          requesterName: user.email.split("@")[0],
          // Send message only if provided, it's optional in the request
          messageText: newMessage.trim() ? newMessage : undefined, 
        }),
      });

      if (res.ok) {
        alert("Mating request sent!");
        setNewMessage("");
        fetchPet();
      } else {
        alert("Failed to send request. Check console for details.");
      }
    } catch (err) {
      console.error(err);
    }
  };
  
  // The original sendDirectMessage function is removed as matingRequest covers initial message

  useEffect(() => {
    fetchPet();
  }, [params.id]);

  if (!pet) {
    // Apply new UI loading style
    return <p className="text-[#333333] text-center mt-20 text-xl">Loading pet details...</p>;
  }

  // Determine user status and styling
  const isOwner = user && user.uid === pet.ownerId;
  const genderColor = pet.gender === 'Male' ? 'bg-blue-200 text-blue-800' : 'bg-pink-200 text-pink-800';

  return (
    // Apply new UI BG color
    <div className="min-h-screen bg-[#F4F7F9] p-4 md:p-10">
      {/* Apply new UI card styling */}
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-2xl p-6 md:p-10 border-t-8 border-[#4A90E2]">
        
        {/* Pet Image */}
        {pet.imageUrls?.length > 0 && (
          <img
            src={pet.imageUrls[0]}
            alt={pet.name}
            className="w-full h-96 object-cover rounded-xl mb-6 shadow-md"
          />
        )}
        
        {/* Name and Basic Info */}
        <h1 className="text-4xl font-extrabold text-[#333333] mb-3">{pet.name}</h1>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-4">
            {/* Gender Display */}
            <p className="text-lg text-[#333333]">
                Gender: 
                <span className={`font-semibold px-3 py-1 ml-2 rounded-full ${genderColor}`}>
                    {pet.gender}
                </span>
            </p>
            {/* Verification Status Badge */}
            <p className="text-lg text-[#333333]">
                Verified: 
                <span className={`font-bold px-3 py-1 ml-2 rounded-full text-sm border ${getStatusBadge(pet.verificationStatus)} uppercase tracking-wider`}>
                    {pet.verificationStatus}
                </span>
            </p>
        </div>
        
        <p className="text-lg text-[#333333]">Breed: {pet.breed}</p>
        <p className="text-lg text-[#333333] mb-4">Age: {pet.age}</p>
        
        {pet.certificateUrl && (
          <a
            href={pet.certificateUrl}
            target="_blank"
            rel="noopener noreferrer"
            // Apply new link color
            className="text-[#4A90E2] font-medium underline mt-2 block hover:text-[#50E3C2] transition"
          >
            View Certificate
          </a>
        )}
        
        {/* Mating Request Section */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h2 className="text-2xl font-bold text-[#4A90E2] mb-3">
            {isOwner ? "Owner Actions" : "Send Mating Request"}
          </h2>
          
          {isOwner ? (
            <p className="text-[#333333] text-lg">
              This is your pet. You can manage requests from your <Link href="/Profile" className="text-[#4A90E2] font-semibold underline hover:text-[#50E3C2]">Profile Page</Link>.
            </p>
          ) : pet.isBanned ? (
            <p className="text-red-500 font-bold text-lg">
                This pet listing is currently banned and cannot receive requests.
            </p>
          ) : (
            <>
              <textarea
                placeholder="Write an introductory message for the owner (optional)..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                // Apply new input style
                className="w-full border-2 border-gray-300 p-3 rounded-lg mb-4 focus:border-[#4A90E2] transition-colors"
                rows="3"
                disabled={pet.verificationStatus !== 'verified'} // Disable if not verified
              />
              <button
                onClick={sendMatingRequest}
                // Apply new button style, disable if not verified
                className={`py-3 px-6 rounded-xl font-bold transition shadow-md ${
                    pet.verificationStatus === 'verified'
                    ? "bg-[#4A90E2] hover:bg-[#3A75B9] text-white"
                    : "bg-gray-400 text-gray-700 cursor-not-allowed"
                }`}
                disabled={pet.verificationStatus !== 'verified'}
              >
                Send Mating Request {pet.verificationStatus !== 'verified' && `(${pet.verificationStatus})`}
              </button>
            </>
          )}
        </div>

        {/* Message History Section */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h2 className="text-2xl font-bold text-[#333333] mb-3">Message History</h2>
          {pet.messages?.length === 0 ? (
            <p className="text-[#333333]">No messages yet.</p>
          ) : (
            // Apply new message history style
            <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
              {pet.messages?.map((msg, idx) => (
                <div 
                    key={idx} 
                    // Differentiate owner messages
                    className={`p-3 rounded-xl shadow-sm ${msg.senderId === pet.ownerId ? 'bg-blue-50 border-l-4 border-[#4A90E2]' : 'bg-gray-100 border-l-4 border-gray-400'}`}
                >
                  <p className="font-bold text-[#4F200D] text-sm flex justify-between">
                    {msg.senderName}
                    <span className="text-xs text-gray-500 font-normal">
                        {new Date(msg.sentAt).toLocaleString()}
                    </span>
                  </p>
                  <p className="text-[#333333] mt-1">{msg.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Mating History Section */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h2 className="text-2xl font-bold text-[#333333] mb-3">Mating History</h2>
          {pet.matingHistory?.length === 0 ? (
            <p className="text-[#333333]">No mating requests yet.</p>
          ) : (
            <ul className="list-disc list-inside space-y-2">
              {pet.matingHistory.map((mh, idx) => (
                <li 
                    key={idx} 
                    className={`text-[#333333] ${mh.status === 'accepted' ? 'text-green-600 font-medium' : mh.status === 'rejected' ? 'text-red-600' : 'text-gray-600'}`}
                >
                  {mh.requesterName} - <span className="uppercase">{mh.status}</span> - <span className="text-sm italic">{new Date(mh.requestedAt).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
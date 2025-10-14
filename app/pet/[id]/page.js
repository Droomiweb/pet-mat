// app/pet/[id]/page.js
"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { auth } from "../../lib/firebase";
import Link from "next/link"; // Import Link for navigation

export default function PetDetailPage() {
  const [pet, setPet] = useState(null);
  const [message, setMessage] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const params = useParams();
  const router = useRouter();

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
    const user = auth.currentUser;
    if (!user) {
      return alert("Login first");
    }

    if (user.uid === pet.ownerId) {
      return alert("You cannot send a mating request to your own pet.");
    }

    try {
      const res = await fetch(`/api/pet/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "matingRequest",
          requesterId: user.uid,
          requesterName: user.email.split("@")[0],
          messageText: newMessage,
        }),
      });

      if (res.ok) {
        alert("Mating request sent!");
        setNewMessage("");
        fetchPet();
      } else {
        alert("Failed to send request");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // NEW FUNCTION to send a direct message to the pet owner
  const sendDirectMessage = async () => {
    const user = auth.currentUser;
    if (!user) {
      return alert("Login first");
    }

    if (!message.trim()) {
      return alert("Please enter a message to send.");
    }

    // You must get the target pet's ownerId to send the message to their pet.
    const targetPetId = params.id;
    const targetOwnerId = pet.ownerId;
    
    // We will use a new API route to handle direct messages
    // This API will add the message to the target pet's messages array
    // and also to the messages array of a special "chat pet" for the sender.
    try {
      const res = await fetch("/api/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderId: user.uid,
          senderName: user.email.split("@")[0],
          receiverId: pet.ownerId, // The owner of the pet we are viewing
          petId: pet._id,
          text: message,
        }),
      });

      if (res.ok) {
        alert("Message sent successfully!");
        setMessage("");
      } else {
        alert("Failed to send message.");
      }
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  useEffect(() => {
    fetchPet();
  }, [params.id]);

  if (!pet) {
    return <p className="text-[#4F200D]">Loading...</p>;
  }

  return (
    <div className="min-h-screen bg-[#F6F1E9] p-4 md:p-10">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg p-6 md:p-10">
        {/* Pet Image and Details */}
        {pet.imageUrls?.length > 0 && (
          <img
            src={pet.imageUrls[0]}
            alt={pet.name}
            className="w-full h-64 object-cover rounded-xl mb-4"
          />
        )}
        <h1 className="text-3xl font-bold text-[#4F200D] mb-2">{pet.name}</h1>
        <p className="text-[#4F200D]">Breed: {pet.breed}</p>
        <p className="text-[#4F200D]">Age: {pet.age}</p>
        {pet.certificateUrl && (
          <a
            href={pet.certificateUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline mt-2 block"
          >
            View Certificate
          </a>
        )}

        {/* Mating Request & Direct Message Section */}
        <div className="mt-6 border-t pt-4">
          <h2 className="text-xl font-bold text-[#4F200D] mb-2">Contact Owner</h2>
          <textarea
            placeholder="Write a message to the owner..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="w-full border-2 border-[#4F200D] p-2 rounded-lg mb-2"
          />
          <button
            onClick={sendMatingRequest}
            className="bg-[#4F200D] hover:bg-orange-500 text-white px-4 py-2 rounded-lg mr-2"
          >
            Send Mating Request
          </button>
          <button
            onClick={sendDirectMessage}
            className="bg-[#4F200D] hover:bg-orange-500 text-white px-4 py-2 rounded-lg"
          >
            Send Direct Message
          </button>
        </div>

        {/* Messages Section */}
        <div className="mt-6 border-t pt-4">
          <h2 className="text-xl font-bold text-[#4F200D] mb-2">Messages</h2>
          {pet.messages?.length === 0 ? (
            <p className="text-[#4F200D]">No messages yet.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {pet.messages?.map((msg, idx) => (
                <div key={idx} className="bg-yellow-100 p-2 rounded-md">
                  <p className="font-bold text-[#4F200D]">{msg.senderName}:</p>
                  <p className="text-[#4F200D]">{msg.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
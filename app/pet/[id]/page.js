"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { auth } from "../../lib/firebase";

export default function PetDetailPage() {
  const [pet, setPet] = useState(null);
  const [message, setMessage] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const params = useParams();
  const router = useRouter();

  const fetchPet = async () => {
    try {
      const res = await fetch(`/api/pet/${params.id}`);
      if (!res.ok) return router.push("/");
      const data = await res.json();
      setPet(data);
    } catch (err) {
      console.error(err);
    }
  };

  const sendMatingRequest = async () => {
    const user = auth.currentUser;
    if (!user) return alert("Login first");

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

  useEffect(() => {
    fetchPet();
  }, [params.id]);

  if (!pet) return <p className="text-[#4F200D]">Loading...</p>;

  return (
    <div className="min-h-screen bg-[#F6F1E9] p-4 md:p-10">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg p-6 md:p-10">
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

        {/* Mating Request Section */}
        <div className="mt-6 border-t pt-4">
          <h2 className="text-xl font-bold text-[#4F200D] mb-2">Send Mating Request</h2>
          <textarea
            placeholder="Write a message to the owner..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="w-full border-2 border-[#4F200D] p-2 rounded-lg mb-2"
          />
          <button
            onClick={sendMatingRequest}
            className="bg-[#4F200D] hover:bg-orange-500 text-white px-4 py-2 rounded-lg"
          >
            Send Request
          </button>
        </div>

        {/* Message Section */}
        <div className="mt-6 border-t pt-4">
          <h2 className="text-xl font-bold text-[#4F200D] mb-2">Messages</h2>
          {pet.messages?.length === 0 ? (
            <p className="text-[#4F200D]">No messages yet.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {pet.messages.map((msg, idx) => (
                <div key={idx} className="bg-yellow-100 p-2 rounded-md">
                  <p className="font-bold text-[#4F200D]">{msg.senderName}:</p>
                  <p className="text-[#4F200D]">{msg.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Mating History */}
        <div className="mt-6 border-t pt-4">
          <h2 className="text-xl font-bold text-[#4F200D] mb-2">Mating History</h2>
          {pet.matingHistory?.length === 0 ? (
            <p className="text-[#4F200D]">No mating requests yet.</p>
          ) : (
            <ul className="list-disc list-inside">
              {pet.matingHistory.map((mh, idx) => (
                <li key={idx} className="text-[#4F200D]">
                  {mh.requesterName} - {mh.status} - {new Date(mh.timestamp).toLocaleString()}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

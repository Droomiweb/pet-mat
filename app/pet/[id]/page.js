// app/pet/[id]/page.js
"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { auth } from "../../lib/firebase";
import Link from "next/link";

export default function PetDetailPage() {
  const [pet, setPet] = useState(null);
  // --- NEW STATE FOR PEDIGREE ---
  const [pedigree, setPedigree] = useState(null);
  // --- END NEW STATE ---
  const [newMessage, setNewMessage] = useState("");
  const [requesterPets, setRequesterPets] = useState([]);
  const [requesterPetId, setRequesterPetId] = useState("");
  const params = useParams();
  const router = useRouter();
  const user = auth.currentUser;

  const getStatusBadge = (status) => {
    switch (status) {
      case "verified":
        return "bg-green-100 text-green-700 border-green-400";
      case "rejected":
        return "bg-red-100 text-red-700 border-red-400";
      default:
        return "bg-yellow-100 text-yellow-700 border-yellow-400";
    }
  };

  const fetchPet = async () => {
    try {
      const res = await fetch(`/api/pet/${params.id}`);
      if (!res.ok) return router.push("/");
      const data = await res.json();
      setPet(data);

      // Pass gender directly to avoid state lag
      if (user && data.listingType === "Mating") {
        await fetchRequesterPets(user.uid, data.type, data.gender);
      }

      // --- NEW: Fetch Pedigree ---
      await fetchPedigree(params.id);
      // --- END NEW ---
    } catch (err) {
      console.error(err);
    }
  };

  // --- NEW: Pedigree Fetch Function ---
  const fetchPedigree = async (petId) => {
    try {
      const res = await fetch(`/api/pedigree/${petId}`);
      if (res.ok) {
        const data = await res.json();
        setPedigree(data);
      }
    } catch (err) {
      console.error("Error fetching pedigree:", err);
    }
  };
  // --- END NEW ---

  // Added petGender to params
  const fetchRequesterPets = async (uid, petType, petGender) => {
    try {
      const petsRes = await fetch(`/api/pet/user/${uid}`);
      if (petsRes.ok) {
        const allPets = await petsRes.json();
        // UPDATED: Filter for opposite gender using param
        const compatiblePets = allPets.filter(
          (p) => p.type === petType && p.gender !== petGender && p.listingType === "Mating"
        );
        setRequesterPets(compatiblePets);
        if (compatiblePets.length === 1) {
          setRequesterPetId(compatiblePets[0]._id);
        } else {
          setRequesterPetId("");
        }
      }
    } catch (err) {
      console.error("Error fetching requester pets:", err);
    }
  };

  // --- sendMatingRequest Function (Unchanged) ---
  const sendMatingRequest = async () => {
    if (!user) return alert("Login first");
    if (user.uid === pet.ownerId) return alert("You cannot send a mating request to your own pet.");
    if (pet.verificationStatus !== "verified") return alert("This pet's certificate is not yet verified.");

    const selectedRequesterPetId = requesterPets.length === 1 ? requesterPets[0]._id : requesterPetId;

    if (!selectedRequesterPetId) {
      return alert("Please select which of your compatible pets this request is for.");
    }

    const selectedPet = requesterPets.find((p) => p._id === selectedRequesterPetId);

    const existingRequest = pet.matingHistory.find(
      (mh) => mh.requesterPetId === selectedRequesterPetId && mh.status === "pending"
    );

    if (existingRequest) return alert("You already have a pending mating request for this pet.");

    try {
      const res = await fetch(`/api/pet/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "matingRequest",
          requesterId: user.uid,
          requesterName: user.email.split("@")[0],
          requesterPetId: selectedRequesterPetId,
          requesterPetName: selectedPet?.name,
          messageText: newMessage.trim() ? newMessage : undefined,
        }),
      });

      if (res.ok) {
        alert(`Mating request for your pet ${selectedPet?.name} sent successfully!`);
        setNewMessage("");
        fetchPet();
      } else {
        alert("Failed to send request. Check console for details.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // --- UPDATED: sendAdoptionInquiry to sendAdoptionRequest ---
  const sendAdoptionRequest = async () => {
    if (!user) return alert("Login first");
    if (user.uid === pet.ownerId) return alert("This is your pet.");
    if (!newMessage.trim()) return alert("Please write a message with your inquiry.");

    try {
      const res = await fetch(`/api/pet/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "adoptionRequest", // <-- CHANGED
          requesterId: user.uid,
          requesterName: user.email.split("@")[0],
          messageText: newMessage, // <-- Use messageText to send the message
        }),
      });
      
      const data = await res.json(); // Get JSON response

      if (res.ok) {
        alert("Your adoption request has been sent to the owner!");
        setNewMessage("");
        fetchPet(); // Refresh pet data to show the request
      } else {
        // Show specific error from the API
        alert(`Failed to send request: ${data.error || 'Check console for details.'}`);
      }
    } catch (err) {
      console.error(err);
    }
  };
  // --- END UPDATE ---

  useEffect(() => {
    fetchPet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, user?.uid]);

  if (!pet) return <p className="text-[#333333] text-center mt-20 text-xl">Loading pet details...</p>;

  const isOwner = user && user.uid === pet.ownerId;
  const genderColor = pet.gender === "Male" ? "bg-blue-200 text-blue-800" : "bg-pink-200 text-pink-800";

  const isAdoptionListing = pet.listingType === "Adoption";
  const canSendRequest = pet.verificationStatus === "verified" && requesterPets.length > 0 && !!requesterPetId;

  // --- NEW: Check if *this* user has a pending request ---
  const hasPendingAdoptionRequest = pet.adoptionRequests?.some(
      (req) => req.requesterId === user?.uid && req.status === "pending"
  );
  // --- END NEW ---

  return (
    <div className="min-h-screen bg-[#F4F7F9] p-4 md:p-10">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-2xl p-6 md:p-10 border-t-8 border-[#4A90E2]">
        {/* Listing Type Badge */}
        <div className="mb-4">
          <span
            className={`font-bold px-4 py-2 rounded-full text-sm uppercase tracking-wider ${
              isAdoptionListing
                ? "bg-blue-100 text-blue-700 border-blue-400 border"
                : "bg-pink-100 text-pink-700 border-pink-400 border"
            }`}
          >
            {pet.listingType}
          </span>
        </div>

        {pet.imageUrls?.length > 0 && (
          <img
            src={pet.imageUrls[0]}
            alt={pet.name}
            className="w-full h-96 object-cover rounded-xl mb-6 shadow-md"
          />
        )}

        {/* Pet Info */}
        <h1 className="text-4xl font-extrabold text-[#333333] mb-3">{pet.name}</h1>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-4">
          <p className="text-lg text-[#333333]">
            Gender:
            <span className={`font-semibold px-3 py-1 ml-2 rounded-full ${genderColor}`}>{pet.gender}</span>
          </p>
          <p className="text-lg text-[#333333]">
            Verified:
            <span
              className={`font-bold px-3 py-1 ml-2 rounded-full text-sm border ${getStatusBadge(
                pet.verificationStatus
              )} uppercase tracking-wider`}
            >
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
            className="text-[#4A90E2] font-medium underline mt-2 block hover:text-[#50E3C2] transition"
          >
            View Certificate
          </a>
        )}

        {/* Pedigree Section */}
        {pedigree && (pedigree.dam || pedigree.sire) && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h2 className="text-2xl font-bold text-[#333333] mb-4">Pedigree</h2>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              <PedigreeCard pet={pedigree.sire} title="Sire (Father)" />
              <PedigreeCard pet={pedigree.dam} title="Dam (Mother)" />
              <PedigreeCard pet={pedigree.sire?.sire} title="Grand-Sire (Father's Side)" />
              <PedigreeCard pet={pedigree.sire?.dam} title="Grand-Dam (Father's Side)" />
              <PedigreeCard pet={pedigree.dam?.sire} title="Grand-Sire (Mother's Side)" />
              <PedigreeCard pet={pedigree.dam?.dam} title="Grand-Dam (Mother's Side)" />
            </div>
          </div>
        )}

        {/* Request Section */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h2 className="text-2xl font-bold text-[#4A90E2] mb-3">
            {isOwner ? "Owner Actions" : isAdoptionListing ? "Inquire About Adoption" : "Send Mating Request"}
          </h2>

          {isOwner ? (
            <p className="text-[#333333] text-lg">
              This is your pet. You can manage requests from your{" "}
              <Link href="/Profile" className="text-[#4A90E2] font-semibold underline hover:text-[#50E3C2]">
                Profile Page
              </Link>
              .
            </p>
          ) : pet.isBanned ? (
            <p className="text-red-500 font-bold text-lg">
              This pet listing is currently banned and cannot receive requests.
            </p>
          ) : isAdoptionListing ? (
            // --- UPDATED: ADOPTION UI ---
            <>
              <textarea
                placeholder="Write an inquiry message to the owner..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="w-full border-2 border-gray-300 p-3 rounded-lg mb-4 focus:border-[#4A90E2] transition-colors"
                rows="3"
                disabled={hasPendingAdoptionRequest}
              />
              <button
                onClick={sendAdoptionRequest} // <-- RENAMED function
                className={`py-3 px-6 rounded-xl font-bold transition shadow-md ${
                  hasPendingAdoptionRequest 
                    ? "bg-gray-400 text-gray-700 cursor-not-allowed"
                    : "bg-[#4A90E2] hover:bg-[#3A75B9] text-white"
                }`}
                disabled={!newMessage.trim() || hasPendingAdoptionRequest}
              >
                {hasPendingAdoptionRequest ? "Request Pending" : "Send Adoption Request"}
              </button>
            </>
            // --- END ADOPTION UI ---
          ) : (
            // --- MATING UI (Existing) ---
            <>
              {requesterPets.length > 1 && (
                <div className="mb-4">
                  <label className="text-lg font-semibold text-[#333333] block mb-1">
                    Which of your pets is this request for?
                  </label>
                  <select
                    value={requesterPetId}
                    onChange={(e) => setRequesterPetId(e.target.value)}
                    className="w-full border-2 border-gray-300 p-3 rounded-lg focus:border-[#4A90E2] transition-colors"
                  >
                    <option value="">-- Select Your Pet --</option>
                    {requesterPets.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name} ({p.gender})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {requesterPets.length === 1 && (
                <p className="text-sm text-gray-600 mb-4">
                  Request will be sent for your pet: **{requesterPets[0].name}**.
                </p>
              )}
              {requesterPets.length === 0 && user && (
                <p className="text-red-500 font-semibold mb-4">
                  You have no registered pets of type {pet.type} with the opposite gender to request a mating.
                </p>
              )}

              <textarea
                placeholder="Write an introductory message for the owner (optional)..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="w-full border-2 border-gray-300 p-3 rounded-lg mb-4 focus:border-[#4A90E2] transition-colors"
                rows="3"
                disabled={pet.verificationStatus !== "verified"}
              />
              <button
                onClick={sendMatingRequest}
                className={`py-3 px-6 rounded-xl font-bold transition shadow-md ${
                  canSendRequest ? "bg-[#4A90E2] hover:bg-[#3A75B9] text-white" : "bg-gray-400 text-gray-700 cursor-not-allowed"
                }`}
                disabled={!canSendRequest}
              >
                Send Mating Request {pet.verificationStatus !== "verified" && `(${pet.verificationStatus})`}
              </button>
            </>
            // --- END MATING UI ---
          )}
        </div>

        {/* Message History Section */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h2 className="text-2xl font-bold text-[#333333] mb-3">Message History</h2>
          {pet.messages?.length === 0 ? (
            <p className="text-[#333333]">No messages yet.</p>
          ) : (
            <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
              {pet.messages?.map((msg, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl shadow-sm ${
                    msg.text.startsWith("ADOPTION INQUIRY:")
                      ? "bg-blue-50 border-l-4 border-blue-400"
                      : msg.senderId === "system"
                      ? "bg-yellow-50 border-l-4 border-yellow-400"
                      : msg.senderId === pet.ownerId
                      ? "bg-gray-100 border-l-4 border-gray-400"
                      : "bg-green-50 border-l-4 border-green-400"
                  }`}
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

        {/* Mating History Section (Only show if pet is for mating) */}
        {!isAdoptionListing && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h2 className="text-2xl font-bold text-[#333333] mb-3">Mating History</h2>
            {pet.matingHistory?.length === 0 ? (
              <p className="text-[#333333]">No mating requests yet.</p>
            ) : (
              <ul className="list-disc list-inside space-y-2">
                {pet.matingHistory.map((mh, idx) => (
                  <li
                    key={idx}
                    className={`text-[#333333] ${
                      mh.status === "accepted" ? "text-green-600 font-medium" : mh.status === "rejected" ? "text-red-600" : "text-gray-600"
                    }`}
                  >
                    {mh.requesterName} ({mh.requesterPetName}) - <span className="uppercase">{mh.status}</span> -{" "}
                    <span className="text-sm italic">{new Date(mh.requestedAt).toLocaleDateString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* --- NEW: Show Adoption Requests List --- */}
        {isAdoptionListing && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h2 className="text-2xl font-bold text-[#333333] mb-3">Adoption Requests</h2>
            {pet.adoptionRequests?.length === 0 ? (
              <p className="text-[#333333]">No adoption requests yet.</p>
            ) : (
              <ul className="list-disc list-inside space-y-2">
                {pet.adoptionRequests.map((req, idx) => (
                  <li
                    key={idx}
                    className={`text-[#333333] ${
                      req.status === "approved" ? "text-green-600 font-medium" : 
                      req.status === "rejected" ? "text-red-600" : "text-gray-600"
                    }`}
                  >
                    {/* Only show requester name if user is owner */}
                    {isOwner ? `${req.requesterName}` : `Request ${idx + 1}`} 
                    - <span className="uppercase">{req.status}</span>
                    {/* Show message only to owner or the user who sent it */}
                    {(isOwner || req.requesterId === user?.uid) && (
                        <p className="text-sm italic pl-4 text-gray-500">"{req.message}"</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        {/* --- END NEW SECTION --- */}
      </div>
    </div>
  );
}

// --- Pedigree Card Component (Unchanged) ---
function PedigreeCard({ pet, title }) {
  if (!pet) {
    return (
      <div className="p-3 bg-gray-50 rounded-lg text-center shadow-inner">
        <p className="font-bold text-gray-500">{title}</p>
        <p className="text-sm text-gray-400">Unknown</p>
      </div>
    );
  }
  return (
    <Link
      href={`/pet/${pet._id}`}
      className="block p-3 bg-white rounded-lg shadow-md hover:shadow-lg hover:scale-105 transition-transform"
    >
      <p className="font-bold text-[#4A90E2]">{title}</p>
      <div className="flex items-center gap-3 mt-2">
        <img
          src={pet.imageUrls?.[0] || "/imgs/profile.jpg"}
          alt={pet.name}
          className="w-12 h-12 rounded-full object-cover border-2 border-[#50E3C2]"
        />
        <div>
          <p className="font-semibold text-primary">{pet.name}</p>
          <p className="text-sm text-gray-600">{pet.breed}</p>
        </div>
      </div>
    </Link>
  );
}
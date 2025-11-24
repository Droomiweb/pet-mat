// app/components/AdoptionHandover.js
"use client";
import { useState } from "react";
import { useAuth } from './../auth-provider';

export default function AdoptionHandover({ pet, request, onUpdate, isIncoming }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  if (!user) return null;

  // Status Logic
  const myStatus = isIncoming ? request.requesterConfirmedHandover : request.ownerConfirmedHandover;
  const partnerStatus = isIncoming ? request.ownerConfirmedHandover : request.requesterConfirmedHandover;
  
  const handleConfirm = async () => {
    if(!confirm("Confirm that the pet has been physically handed over? This cannot be undone.")) return;
    
    setLoading(true);
    
    // FIX: Ensure we have a valid ID and fallback data
    const requestId = request._id || request.id;

    try {
      const res = await fetch('/api/pet/requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerId: pet.ownerId, // Current owner ID from pet object
          petId: pet._id,
          requestId: requestId,
          requesterId: request.requesterId, // FIX: Added this fallback so API can find request if ID fails
          requestType: 'adoption',
          newStatus: 'confirmHandover',
          userId: user.uid // Who is clicking
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to confirm handover");
      } else {
        alert("Handover Confirmed!");
        if (onUpdate) onUpdate();
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 my-4 border-2 border-purple-500 rounded-xl bg-purple-50">
      <h5 className="font-bold text-lg text-center text-purple-800 mb-2">
        🤝 Adoption Handover: {pet.name}
      </h5>
      <p className="text-sm text-center text-gray-600 mb-4">
        Adoption approved! Both parties must confirm once the pet is physically exchanged.
      </p>
      
      <div className="flex justify-around my-4">
        <div className="text-center">
          <p className="font-semibold text-sm">You</p>
          {myStatus ? (
            <span className="text-green-600 font-bold text-xs">✅ Confirmed</span>
          ) : (
            <span className="text-gray-500 text-xs">Pending</span>
          )}
        </div>
        <div className="text-center">
          <p className="font-semibold text-sm">Partner</p>
          {partnerStatus ? (
            <span className="text-green-600 font-bold text-xs">✅ Confirmed</span>
          ) : (
            <span className="text-gray-500 text-xs">Pending</span>
          )}
        </div>
      </div>

      {!myStatus && (
        <button
          onClick={handleConfirm}
          disabled={loading}
          className="w-full px-4 py-3 text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 transition shadow-md font-bold text-sm"
        >
          {loading ? 'Confirming...' : 'I Confirm Handover Complete'}
        </button>
      )}
      
      {myStatus && !partnerStatus && (
          <p className="text-center text-xs text-purple-600 mt-2 font-semibold">Waiting for partner confirmation...</p>
      )}
    </div>
  );
}
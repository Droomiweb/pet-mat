// app/components/MatingConfirmation.js
"use client";
import { useState } from "react";
import { useAuth } from './../auth-provider';

export default function MatingConfirmation({ pet, request, onUpdate }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!user) return null;

  const isOutgoing = request.isOutgoing === true;

  // Status logic
  const myStatus = isOutgoing ? request.requesterMatedConfirmation : request.ownerMatedConfirmation;
  const partnerStatus = isOutgoing ? request.ownerMatedConfirmation : request.requesterMatedConfirmation;
  
  // Display names
  const partnerName = isOutgoing ? request.partnerName : request.requesterPetName;
  
  // The pet ID that holds the request document
  const apiTargetPetId = isOutgoing ? request.partnerId : pet._id;
  // Request ID (might be missing for old data)
  const apiRequestId = request._id || request.id;
  // Fallback: The requester's User ID (always present)
  const requesterId = request.requesterId;

  const handleConfirmMating = async () => {
    setError(null);

    if (!user.uid || !apiTargetPetId) {
        setError("Missing essential data. Please refresh.");
        return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/pet/confirm-mating', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          petId: apiTargetPetId, 
          requestId: apiRequestId,
          requesterId: requesterId, // Sending this enables the fallback on the server!
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to confirm');
      }

      alert('Confirmation successful!');
      if (onUpdate) {
        onUpdate();
      }

    } catch (err) {
      console.error("Confirmation Error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (request.status === 'mated') {
    return (
      <div className="p-3 my-2 text-center text-white bg-green-600 rounded-lg">
        <strong>Mating Confirmed!</strong>
        <p className="text-xs mt-1">
             {isOutgoing 
                ? `Success! ${pet.name} & ${partnerName} are mates.` 
                : (pet.gender === 'Female' 
                    ? "This pet is now marked as pregnant." 
                    : `Success! ${pet.name} & ${partnerName} are mates.`
                  )
             }
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 my-2 border-2 border-blue-500 rounded-lg bg-blue-50">
      <h5 className="font-semibold text-lg text-center">Confirm Mating with {partnerName}</h5>
      <p className="text-sm text-center text-gray-600">Both users must confirm that mating has occurred.</p>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded relative mt-2 text-sm text-center">
            {error}
        </div>
      )}
      
      <div className="flex justify-around my-4">
        <div className="text-center">
          <p className="font-semibold">Your Status</p>
          {myStatus ? (
            <span className="text-green-500 font-bold">Confirmed</span>
          ) : (
            <span className="text-gray-500">Not Confirmed</span>
          )}
        </div>
        <div className="text-center">
          <p className="font-semibold">Partner's Status</p>
          {partnerStatus ? (
            <span className="text-green-500 font-bold">Confirmed</span>
          ) : (
            <span className="text-gray-500">Not Confirmed</span>
          )}
        </div>
      </div>

      {!myStatus && (
        <button
          onClick={handleConfirmMating}
          disabled={loading}
          className="w-full px-4 py-2 text-white bg-blue-500 rounded hover:bg-blue-600 disabled:bg-gray-400 transition shadow-sm font-bold text-sm"
        >
          {loading ? 'Confirming...' : 'I Confirm Mating Occurred'}
        </button>
      )}
    </div>
  );
}
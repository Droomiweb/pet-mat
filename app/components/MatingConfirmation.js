// app/components/MatingConfirmation.js
"use client";
import { useState } from "react";
import { useAuth } from './../auth-provider';

// Pass the *owner's* pet, the *specific request*, and the 'onUpdate' function
export default function MatingConfirmation({ pet, request, onUpdate }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!user) return null;

  // This component can be seen by both the owner and the requester.
  // We need to figure out who the current user is.
  const isOwner = pet.ownerId === user.uid;
  
  // Determine current confirmation status
  const currentUserHasConfirmed = (isOwner && request.ownerMatedConfirmation) || (!isOwner && request.requesterMatedConfirmation);
  const otherUserHasConfirmed = (isOwner && request.requesterMatedConfirmation) || (!isOwner && request.ownerMatedConfirmation);

  const handleConfirmMating = async () => {
    setLoading(true);
    setError(null);

    try {
      // The 'petId' is the ID of the pet who RECEIVED the request.
      // If the current user is the owner, pet._id is correct.
      // If the current user is the requester, the petId is the one from the request.
      const targetPetId = isOwner ? pet._id : request.requesterPetId;
      
      // But the request lives on the *receiver's* pet document.
      // This is complex. Let's re-read the API.
      // API expects `petId` (pet who owns the request) and `requestId`.
      // Our `pet` prop IS the pet who owns the request, so pet._id is correct.
      
      const res = await fetch('/api/pet/confirm-mating', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          petId: pet._id, // The pet who owns the request (the one we are viewing)
          requestId: request._id,
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
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // If already mated, show a success message
  if (request.status === 'mated') {
    return (
      <div className="p-3 my-2 text-center text-white bg-green-600 rounded-lg">
        <strong>Mating Confirmed!</strong>
        {pet.gender === 'Female' && (
           <p className="text-sm">This pet is now marked as pregnant and will be hidden from listings.</p>
        )}
      </div>
    );
  }

  // This is the main view for confirmation
  return (
    <div className="p-4 my-2 border-2 border-blue-500 rounded-lg bg-blue-50">
      <h5 className="font-semibold text-lg text-center">Confirm Mating with {isOwner ? request.requesterPetName : pet.name}</h5>
      <p className="text-sm text-center text-gray-600">Both users must confirm that mating has occurred.</p>
      {error && <p className="text-red-500 text-center">{error}</p>}
      
      <div className="flex justify-around my-4">
        <div className="text-center">
          <p className="font-semibold">Your Status</p>
          {currentUserHasConfirmed ? (
            <span className="text-green-500 font-bold">Confirmed</span>
          ) : (
            <span className="text-gray-500">Not Confirmed</span>
          )}
        </div>
        <div className="text-center">
          <p className="font-semibold">Partner's Status</p>
          {otherUserHasConfirmed ? (
            <span className="text-green-500 font-bold">Confirmed</span>
          ) : (
            <span className="text-gray-500">Not Confirmed</span>
          )}
        </div>
      </div>

      {!currentUserHasConfirmed && (
        <button
          onClick={handleConfirmMating}
          disabled={loading}
          className="w-full px-4 py-2 text-white bg-blue-500 rounded hover:bg-blue-600 disabled:bg-gray-400"
        >
          {loading ? 'Confirming...' : 'I Confirm Mating Occurred'}
        </button>
      )}
    </div>
  );
}

// app/components/MatingConfirmation.js

// 1. DIRECTIVE
// "use client" is strictly required because this component uses hooks (useState, useAuth)
// and handles user interaction (clicks).
"use client";

// 2. IMPORTS
import { useState } from "react";
import { useAuth } from './../auth-provider'; // Context to access the current user's UID

// 3. COMPONENT DEFINITION
// Props:
// - pet: The pet object currently being viewed on the dashboard.
// - request: The specific mating request object (from the matingHistory array).
// - onUpdate: A callback function to refresh the parent dashboard after a change.
export default function MatingConfirmation({ pet, request, onUpdate }) {
  const { user } = useAuth();
  
  // Local state for UI feedback
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Security guard: If auth hasn't loaded, render nothing.
  if (!user) return null;

  // 4. PERSPECTIVE LOGIC (Who am I?)
  // 'isOutgoing' is a flag added by the backend route (GET /api/pet/user/[uid]).
  // True = I sent this request. False = I received this request.
  const isOutgoing = request.isOutgoing === true;

  // Determine whose checkbox corresponds to "Me" and whose corresponds to "Them".
  // Requester uses 'requesterMatedConfirmation', Owner uses 'ownerMatedConfirmation'.
  const myStatus = isOutgoing ? request.requesterMatedConfirmation : request.ownerMatedConfirmation;
  const partnerStatus = isOutgoing ? request.ownerMatedConfirmation : request.requesterMatedConfirmation;
  
  // Determine the name of the OTHER pet involved.
  const partnerName = isOutgoing ? request.partnerName : request.requesterPetName;
  
  // 5. API TARGETING LOGIC
  // We need to tell the server WHICH pet document holds this request.
  // Mating requests are always stored on the RECEIVER's (Owner's) pet document.
  // If I am the requester (isOutgoing=true), I must target the partner's ID.
  // If I am the owner, I target my own pet's ID.
  const apiTargetPetId = isOutgoing ? request.partnerId : pet._id;

  // Get the Request ID (checking for both _id and id formats for robustness)
  const apiRequestId = request._id || request.id;
  
  // Get the Requester's User ID as a fallback for the server to find the request
  const requesterId = request.requesterId;

  // 6. ACTION HANDLER
  const handleConfirmMating = async () => {
    setError(null);

    // Basic validation before network call
    if (!user.uid || !apiTargetPetId) {
        setError("Missing essential data. Please refresh.");
        return;
    }

    setLoading(true);

    try {
      // Call the specialized endpoint for mating confirmation
      const res = await fetch('/api/pet/confirm-mating', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid, // "I am performing this action"
          petId: apiTargetPetId, // "On this pet document"
          requestId: apiRequestId, // "Updating this specific request"
          requesterId: requesterId, // Fallback for lookup
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to confirm');
      }

      alert('Confirmation successful!');
      
      // Trigger a refresh in the parent component so the UI updates instantly
      if (onUpdate) {
        onUpdate();
      }

    } catch (err) {
      console.error("Confirmation Error:", err);
      setError(err.message);
    } finally {
      setLoading(false); // Re-enable UI
    }
  };

  // 7. COMPLETED STATE RENDER
  // If the status is already 'mated', showing the buttons is unnecessary.
  // Just show a success banner.
  if (request.status === 'mated') {
    return (
      <div className="p-3 my-2 text-center text-white bg-green-600 rounded-lg shadow-sm">
        <strong>Mating Confirmed!</strong>
        <p className="text-xs mt-1">
             {isOutgoing 
                ? `Success! ${pet.name} & ${partnerName} are mates.` 
                : (pet.gender === 'Female' 
                    // Special note for female owner: Hint at the next step (Pregnancy)
                    ? "This pet is now marked as pregnant." 
                    : `Success! ${pet.name} & ${partnerName} are mates.`
                  )
             }
        </p>
      </div>
    );
  }

  // 8. ACTIVE ACTION RENDER
  // This renders the "Two Checkbox" UI where users see who has confirmed so far.
  return (
    <div className="p-4 my-2 border-2 border-blue-500 rounded-lg bg-blue-50">
      <h5 className="font-semibold text-lg text-center text-blue-900">Confirm Mating with {partnerName}</h5>
      <p className="text-sm text-center text-gray-600 mb-4">Both users must confirm that mating has occurred.</p>
      
      {/* Error Banner */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded relative mt-2 text-sm text-center mb-4">
            {error}
        </div>
      )}
      
      {/* Status Grid */}
      <div className="flex justify-around my-4 bg-white p-3 rounded-lg shadow-inner">
        {/* My Status Column */}
        <div className="text-center">
          <p className="font-semibold text-gray-700">Your Status</p>
          {myStatus ? (
            <span className="text-green-500 font-bold text-sm">✅ Confirmed</span>
          ) : (
            <span className="text-gray-400 text-sm">Waiting...</span>
          )}
        </div>
        
        {/* Divider */}
        <div className="w-px bg-gray-200"></div>

        {/* Partner Status Column */}
        <div className="text-center">
          <p className="font-semibold text-gray-700">Partner's Status</p>
          {partnerStatus ? (
            <span className="text-green-500 font-bold text-sm">✅ Confirmed</span>
          ) : (
            <span className="text-gray-400 text-sm">Waiting...</span>
          )}
        </div>
      </div>

      {/* Action Button */}
      {/* Only show this button if *I* haven't clicked it yet. */}
      {!myStatus && (
        <button
          onClick={handleConfirmMating}
          disabled={loading}
          className="w-full px-4 py-2 text-white bg-blue-500 rounded hover:bg-blue-600 disabled:bg-gray-400 transition shadow-sm font-bold text-sm mt-2"
        >
          {loading ? 'Confirming...' : 'I Confirm Mating Occurred'}
        </button>
      )}
      
      {/* Waiting Message */}
      {/* Show if I have clicked, but partner hasn't. */}
      {myStatus && !partnerStatus && (
          <p className="text-center text-xs text-blue-600 mt-2 font-semibold animate-pulse">
              Waiting for partner to confirm...
          </p>
      )}
    </div>
  );
}
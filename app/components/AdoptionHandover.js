// app/components/AdoptionHandover.js

// 1. DIRECTIVE
// Required because this component handles user interaction (clicks) and state.
"use client";

// 2. IMPORTS
import { useState } from "react";
import { useAuth } from './../auth-provider'; // Context to get current user ID

// 3. COMPONENT DEFINITION
export default function AdoptionHandover({ pet, request, onUpdate, isIncoming }) {
  // Access the logged-in user to send their ID to the API
  const { user } = useAuth();
  
  // Local state to handle button disabling during API calls
  const [loading, setLoading] = useState(false);

  // Security Guard: Do not render if authentication is still loading or failed
  if (!user) return null;

  // 4. STATUS LOGIC (The "Perspective Switch")
  // We determine which database flag corresponds to "Me" vs "Them" based on the isIncoming prop.
  
  // If isIncoming is true, I am the Requester (Adopter). 
  // If false, I am the Owner.
  const myStatus = isIncoming ? request.requesterConfirmedHandover : request.ownerConfirmedHandover;
  
  // The partner is the opposite of whatever I am.
  const partnerStatus = isIncoming ? request.ownerConfirmedHandover : request.requesterConfirmedHandover;
  
  // 5. HANDLER: CONFIRMATION
  const handleConfirm = async () => {
    // Serious action warning: Ownership transfer is final.
    if(!confirm("Confirm that the pet has been physically handed over? This cannot be undone.")) return;
    
    setLoading(true);
    
    // FIX: Robust ID handling. Sometimes MongoDB returns '_id', sometimes sanitized 'id'.
    const requestId = request._id || request.id;

    try {
      // 6. API CALL
      const res = await fetch('/api/pet/requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerId: pet.ownerId, // Used by server to verify permissions
          petId: pet._id,       // The pet being transferred
          requestId: requestId, // The specific adoption request record
          requesterId: request.requesterId, // Fallback to find request if ID search fails
          requestType: 'adoption', // Tells API to use Adoption logic, not Mating
          newStatus: 'confirmHandover', // The specific action trigger
          userId: user.uid // Tells the server WHO is clicking the button
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to confirm handover");
      } else {
        alert("Handover Confirmed!");
        // Callback to parent to refresh data (e.g., update the checkmarks immediately)
        if (onUpdate) onUpdate();
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred. Please try again.");
    } finally {
      setLoading(false); // Re-enable UI (though button will likely disappear due to logic below)
    }
  };

  // 7. RENDER
  return (
    // Purple styling distinguishes this as a "Transaction/Legal" area compared to blue/green UI
    <div className="p-4 my-4 border-2 border-purple-500 rounded-xl bg-purple-50">
      <h5 className="font-bold text-lg text-center text-purple-800 mb-2">
        🤝 Adoption Handover: {pet.name}
      </h5>
      <p className="text-sm text-center text-gray-600 mb-4">
        Adoption approved! Both parties must confirm once the pet is physically exchanged.
      </p>
      
      {/* Status Grid */}
      <div className="flex justify-around my-4">
        {/* MY STATUS */}
        <div className="text-center">
          <p className="font-semibold text-sm">You</p>
          {myStatus ? (
            <span className="text-green-600 font-bold text-xs">✅ Confirmed</span>
          ) : (
            <span className="text-gray-500 text-xs">Pending</span>
          )}
        </div>

        {/* PARTNER STATUS */}
        <div className="text-center">
          <p className="font-semibold text-sm">Partner</p>
          {partnerStatus ? (
            <span className="text-green-600 font-bold text-xs">✅ Confirmed</span>
          ) : (
            <span className="text-gray-500 text-xs">Pending</span>
          )}
        </div>
      </div>

      {/* Action Button: Only render if *I* haven't confirmed yet */}
      {!myStatus && (
        <button
          onClick={handleConfirm}
          disabled={loading}
          className="w-full px-4 py-3 text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 transition shadow-md font-bold text-sm"
        >
          {loading ? 'Confirming...' : 'I Confirm Handover Complete'}
        </button>
      )}
      
      {/* Waiting Message: Render if *I* am done, but *They* are not */}
      {myStatus && !partnerStatus && (
          <p className="text-center text-xs text-purple-600 mt-2 font-semibold">Waiting for partner confirmation...</p>
      )}
    </div>
  );
}
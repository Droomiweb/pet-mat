// app/components/RequestManager.js

// 1. DIRECTIVE
// "use client" is required because this component handles user interaction (clicks) and state.
"use client"; 

// 2. IMPORTS
import { useState, useEffect } from "react";
import { useAuth } from './../auth-provider'; // Context to get current user ID
import Image from "next/image";

// Sub-component to fetch and show the predicted puppy preview
function OffspringPreview({ parentAId, parentBId }) {
  const [imgUrl, setImgUrl] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchPreview() {
      if (!parentAId || !parentBId) return;
      setLoading(true);
      try {
        const res = await fetch("/api/ai-advisor/generate-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ petAId: parentAId, petBId: parentBId, userId: "system" }) // system bypass to just fetch cache
        });
        const data = await res.json();
        if (data.imageUrl) setImgUrl(data.imageUrl);
      } catch (e) {
        console.error("Preview fetch failed:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchPreview();
  }, [parentAId, parentBId]);

  if (loading) return <div className="w-12 h-12 bg-gray-100 rounded-full animate-pulse" />;
  if (!imgUrl) return null;

  return (
    <div className="relative group">
       <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-purple-400 shadow-sm relative">
          <Image src={imgUrl} alt="Predicted Offspring" fill className="object-cover" />
       </div>
       <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-32 bg-gray-900 text-white text-[10px] p-2 rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
          🧬 Predicted Offspring Preview
       </div>
    </div>
  );
}

// 3. COMPONENT DEFINITION
// Props:
// - pet: The full pet object containing the arrays of requests.
// - onUpdate: Callback function to refresh the parent dashboard after an action.
export default function RequestManager({ pet, onUpdate }) {
  const { user } = useAuth(); // Get logged-in user
  
  // Local state for UI feedback
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // 4. MAIN ACTION HANDLER
  // Handles Accepting/Rejecting for BOTH Mating and Adoption.
  const handleRequestUpdate = async (request, requestType, newStatus) => {
    // Security check: Ensure user is logged in
    if (!user) return;
    
    setLoading(true);
    setError(null);

    // FIX: Robust ID extraction. 
    // MongoDB usually sends '_id', but sometimes sanitized data sends 'id'.
    // We check both to prevent "ID undefined" errors.
    const requestId = request._id || request.id;
    
    try {
      // 5. API CALL
      const res = await fetch('/api/pet/requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerId: user.uid, // "I am the owner performing this action"
          petId: pet._id,    // "On this pet"
          requestId: requestId, // "Updating this specific request record"
          requesterId: request.requesterId, // Fallback ID if requestId fails lookup
          requestType: requestType, // 'mating' or 'adoption'
          newStatus: newStatus,     // 'accepted', 'rejected', 'approved', etc.
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update request');
      }

      // 6. UI REFRESH
      // If successful, tell the parent component to re-fetch the data.
      // This removes the request from the "Pending" list instantly.
      if (onUpdate) {
        await onUpdate(); 
      }

    } catch (err) {
      setError(err.message);
      alert(`Error: ${err.message}`);
    } finally {
      setLoading(false); // Re-enable buttons
    }
  };

  // 7. DATA FILTERING
  // We only want to show *Pending* requests here. 
  // Accepted/Rejected ones are handled elsewhere (like history logs).
  // We use optional chaining (?.) and empty array fallbacks to prevent crashes if data is missing.
  const pendingMatingRequests = pet.matingHistory ? pet.matingHistory.filter(r => r.status === 'pending').sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt)) : [];
  const pendingAdoptionRequests = pet.adoptionRequests ? pet.adoptionRequests.filter(r => r.status === 'pending').sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt)) : [];
  const outgoingMatingRequests = pet.outgoingRequests ? pet.outgoingRequests.filter(r => r.status === 'pending' || r.status === 'accepted').sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt)) : [];

  // 8. EMPTY STATE
  // If there are absolutely no requests, don't render an empty box. Just disappear.
  if (pendingMatingRequests.length === 0 && pendingAdoptionRequests.length === 0 && outgoingMatingRequests.length === 0) {
      return null; 
  }

  // 9. RENDER
  return (
    <div className="p-4 border rounded-lg shadow-md bg-white mt-4">
      <h4 className="text-xl font-semibold mb-3">Pending Requests</h4>
      
      {/* Error Message Display */}
      {error && <p className="text-red-500 mb-2 text-sm">{error}</p>}
      
      {/* --- SECTION A: MATING REQUESTS --- */}
      {/* Only show this section if the pet is actually listed for mating */}
      {pet.listingType === 'Mating' && (
        <div className="mt-4">
          <h5 className="font-semibold text-gray-700">Mating Requests</h5>
          
          {pendingMatingRequests.length === 0 ? (
            <p className="text-sm text-gray-500">No pending mating requests.</p>
          ) : (
            // Map through pending requests
            pendingMatingRequests.map((req, index) => (
              <div key={req._id || index} className="flex flex-col sm:flex-row items-center justify-between p-3 my-2 border rounded-md bg-gray-50">
                {/* Request Details */}
                <div className="flex items-center gap-4 mb-2 sm:mb-0">
                  <OffspringPreview parentAId={pet._id} parentBId={req.requesterPetId} />
                  <div>
                    <p className="text-gray-900 leading-none mb-1"><strong>{req.requesterPetName}</strong></p>
                    <p className="text-sm text-gray-600">Owner: {req.requesterName}</p>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRequestUpdate(req, 'mating', 'accepted')}
                    disabled={loading}
                    className="px-4 py-2 text-white bg-green-500 rounded-lg hover:bg-green-600 disabled:bg-gray-400 transition shadow-sm font-bold text-sm"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleRequestUpdate(req, 'mating', 'rejected')}
                    disabled={loading}
                    className="px-4 py-2 text-white bg-red-500 rounded-lg hover:bg-red-600 disabled:bg-gray-400 transition shadow-sm font-bold text-sm"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* --- SECTION B: ADOPTION REQUESTS --- */}
      {/* Only show this section if the pet is listed for adoption */}
      {pet.listingType === 'Adoption' && (
        <div className="mt-4">
          <h5 className="font-semibold text-gray-700">Adoption Requests</h5>
          
          {pendingAdoptionRequests.length === 0 ? (
            <p className="text-sm text-gray-500">No pending adoption requests.</p>
          ) : (
            pendingAdoptionRequests.map((req, index) => (
              <div key={req._id || index} className="flex flex-col sm:flex-row items-center justify-between p-3 my-2 border rounded-md bg-gray-50">
                {/* Adoption Message Details */}
                <div className="mb-2 sm:mb-0">
                  <p className="text-gray-900"><strong>{req.requesterName}</strong></p>
                  <p className="text-sm text-gray-600 italic">"{req.message}"</p>
                </div>
                
                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRequestUpdate(req, 'adoption', 'approved')}
                    disabled={loading}
                    className="px-4 py-2 text-white bg-green-500 rounded-lg hover:bg-green-600 disabled:bg-gray-400 transition shadow-sm font-bold text-sm"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleRequestUpdate(req, 'adoption', 'rejected')}
                    disabled={loading}
                    className="px-4 py-2 text-white bg-red-500 rounded-lg hover:bg-red-600 disabled:bg-gray-400 transition shadow-sm font-bold text-sm"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* --- SECTION C: OUTGOING PROPOSALS --- */}
      {outgoingMatingRequests.length > 0 && (
        <div className="mt-6 pt-4 border-t">
          <h5 className="font-semibold text-purple-700 flex items-center gap-2">
            <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></span>
            Sent Proposals (Outgoing)
          </h5>
          <div className="space-y-2 mt-2">
            {outgoingMatingRequests.map((req, index) => (
              <div key={req._id || index} className="flex items-center justify-between p-3 border rounded-md bg-purple-50/50">
                  <div className="flex items-center gap-3">
                    <OffspringPreview parentAId={pet._id} parentBId={req.partnerId} />
                    <div>
                      <p className="text-gray-900 text-sm">Waiting for <strong>{req.partnerName}</strong></p>
                      <p className="text-[10px] text-gray-500">Status: {req.status === 'pending' ? 'Pending Review' : 'Accepted'}</p>
                    </div>
                  </div>
                  <span className="px-2 py-1 bg-white border border-purple-200 text-purple-600 text-[10px] font-bold rounded uppercase">
                    Proposed
                  </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
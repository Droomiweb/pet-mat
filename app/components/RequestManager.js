// app/components/RequestManager.js

// 1. DIRECTIVE
// "use client" is required because this component handles user interaction (clicks) and state.
"use client"; 

// 2. IMPORTS
import { useState } from "react";
import { useAuth } from './../auth-provider'; // Context to get current user ID

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
  const pendingMatingRequests = pet.matingHistory ? pet.matingHistory.filter(r => r.status === 'pending') : [];
  const pendingAdoptionRequests = pet.adoptionRequests ? pet.adoptionRequests.filter(r => r.status === 'pending') : [];

  // 8. EMPTY STATE
  // If there are absolutely no requests, don't render an empty box. Just disappear.
  if (pendingMatingRequests.length === 0 && pendingAdoptionRequests.length === 0) {
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
                <div className="mb-2 sm:mb-0">
                  <p className="text-gray-900"><strong>{req.requesterPetName}</strong></p>
                  <p className="text-sm text-gray-600">Owner: {req.requesterName}</p>
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
    </div>
  );
}
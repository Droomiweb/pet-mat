// app/components/RequestManager.js
"use client"; 
import { useState } from "react";
import { useAuth } from './../auth-provider'; 

export default function RequestManager({ pet, onUpdate }) {
  const { user } = useAuth(); 
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleRequestUpdate = async (request, requestType, newStatus) => {
    if (!user) return;
    setLoading(true);
    setError(null);

    // Robust ID check: handles _id, id, or string IDs
    const requestId = request._id || request.id;
    
    try {
      const res = await fetch('/api/pet/requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerId: user.uid, 
          petId: pet._id,    
          requestId: requestId, 
          requesterId: request.requesterId, // Fallback ID
          requestType: requestType, 
          newStatus: newStatus,    
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update request');
      }

      // Force parent refresh immediately
      if (onUpdate) {
        await onUpdate(); 
      }

    } catch (err) {
      setError(err.message);
      alert(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Safe access to arrays
  const pendingMatingRequests = pet.matingHistory ? pet.matingHistory.filter(r => r.status === 'pending') : [];
  const pendingAdoptionRequests = pet.adoptionRequests ? pet.adoptionRequests.filter(r => r.status === 'pending') : [];

  if (pendingMatingRequests.length === 0 && pendingAdoptionRequests.length === 0) {
      return null; 
  }

  return (
    <div className="p-4 border rounded-lg shadow-md bg-white mt-4">
      <h4 className="text-xl font-semibold mb-3">Pending Requests</h4>
      {error && <p className="text-red-500 mb-2 text-sm">{error}</p>}
      
      {/* --- Mating Requests --- */}
      {pet.listingType === 'Mating' && (
        <div className="mt-4">
          <h5 className="font-semibold text-gray-700">Mating Requests</h5>
          {pendingMatingRequests.length === 0 ? (
            <p className="text-sm text-gray-500">No pending mating requests.</p>
          ) : (
            pendingMatingRequests.map((req, index) => (
              <div key={req._id || index} className="flex flex-col sm:flex-row items-center justify-between p-3 my-2 border rounded-md bg-gray-50">
                <div className="mb-2 sm:mb-0">
                  <p className="text-gray-900"><strong>{req.requesterPetName}</strong></p>
                  <p className="text-sm text-gray-600">Owner: {req.requesterName}</p>
                </div>
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

      {/* --- Adoption Requests --- */}
      {pet.listingType === 'Adoption' && (
        <div className="mt-4">
          <h5 className="font-semibold text-gray-700">Adoption Requests</h5>
          {pendingAdoptionRequests.length === 0 ? (
            <p className="text-sm text-gray-500">No pending adoption requests.</p>
          ) : (
            pendingAdoptionRequests.map((req, index) => (
              <div key={req._id || index} className="flex flex-col sm:flex-row items-center justify-between p-3 my-2 border rounded-md bg-gray-50">
                <div className="mb-2 sm:mb-0">
                  <p className="text-gray-900"><strong>{req.requesterName}</strong></p>
                  <p className="text-sm text-gray-600 italic">"{req.message}"</p>
                </div>
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
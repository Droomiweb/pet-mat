// app/components/RequestManager.js
"use client"; 
import { useState } from "react";
import { useAuth } from './../auth-provider'; // Adjust this path if your auth-provider is elsewhere

// Pass the pet object as a prop
// You also need a way to refresh the data, so we pass 'onUpdate'
export default function RequestManager({ pet, onUpdate }) {
  const { user } = useAuth(); // Get the logged-in user
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // This single function handles all request updates
  const handleRequestUpdate = async (request, requestType, newStatus) => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/pet/requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerId: user.uid, // The logged-in user
          petId: pet._id,     // The pet being managed
          requestId: request._id,
          requestType: requestType, // 'mating' or 'adoption'
          newStatus: newStatus,     // 'accepted', 'rejected', 'approved'
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update request');
      }

      // If successful, call the onUpdate function from the parent to refresh data
      alert(`Request ${newStatus} successfully!`);
      if (onUpdate) {
        onUpdate();
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Filter for pending requests
  const pendingMatingRequests = pet.matingHistory ? pet.matingHistory.filter(r => r.status === 'pending') : [];
  const pendingAdoptionRequests = pet.adoptionRequests ? pet.adoptionRequests.filter(r => r.status === 'pending') : [];

  return (
    <div className="p-4 border rounded-lg shadow-md bg-white mt-4">
      <h4 className="text-xl font-semibold mb-3">Pending Requests</h4>
      {error && <p className="text-red-500">{error}</p>}
      
      {/* --- Mating Requests --- */}
      {pet.listingType === 'Mating' && (
        <div className="mt-4">
          <h5 className="font-semibold text-gray-700">Mating Requests</h5>
          {pendingMatingRequests.length === 0 ? (
            <p className="text-sm text-gray-500">No pending mating requests.</p>
          ) : (
            pendingMatingRequests.map(req => (
              <div key={req._id} className="flex flex-col sm:flex-row items-center justify-between p-2 my-2 border rounded-md">
                <div className="mb-2 sm:mb-0">
                  <p><strong>{req.requesterPetName}</strong> (Owner: {req.requesterName})</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRequestUpdate(req, 'mating', 'accepted')}
                    disabled={loading}
                    className="px-3 py-1 text-white bg-green-500 rounded hover:bg-green-600 disabled:bg-gray-400"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleRequestUpdate(req, 'mating', 'rejected')}
                    disabled={loading}
                    className="px-3 py-1 text-white bg-red-500 rounded hover:bg-red-600 disabled:bg-gray-400"
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
            pendingAdoptionRequests.map(req => (
              <div key={req._id} className="flex flex-col sm:flex-row items-center justify-between p-2 my-2 border rounded-md">
                <div className="mb-2 sm:mb-0">
                  <p><strong>{req.requesterName}</strong></p>
                  <p className="text-sm text-gray-600">"{req.message}"</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRequestUpdate(req, 'adoption', 'approved')}
                    disabled={loading}
                    className="px-3 py-1 text-white bg-green-500 rounded hover:bg-green-600 disabled:bg-gray-400"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleRequestUpdate(req, 'adoption', 'rejected')}
                    disabled={loading}
                    className="px-3 py-1 text-white bg-red-500 rounded hover:bg-red-600 disabled:bg-gray-400"
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
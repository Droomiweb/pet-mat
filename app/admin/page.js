// app/admin/page.js
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../auth-provider";
import Link from "next/link";
import Image from "next/image";

// --- NEW: Litter Confirmation Modal Component ---
// We define this component inside the page for simplicity
const LitterConfirmationModal = ({ data, onClose, onSubmit }) => {
  const { damPet, sirePet, matingRequest } = data;
  const [litter, setLitter] = useState([{ name: '', gender: 'Male' }]);
  const [loading, setLoading] = useState(false);

  // Handle changes to a specific pet in the litter form
  const handleLitterChange = (index, field, value) => {
    const updatedLitter = [...litter];
    updatedLitter[index][field] = value;
    setLitter(updatedLitter);
  };

  // Add a new empty pet form to the litter
  const addPetToLitter = () => {
    setLitter([...litter, { name: '', gender: 'Male' }]);
  };

  // Remove a pet from the litter form
  const removePetFromLitter = (index) => {
    setLitter(litter.filter((_, i) => i !== index));
  };

  // Handle final submission to the API
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    // Filter out any empty name fields
    const validLitterData = litter.filter(p => p.name.trim() !== '');
    if (validLitterData.length === 0) {
      alert("Please enter details for at least one pet.");
      setLoading(false);
      return;
    }

    await onSubmit({
      damPet,
      sirePet,
      matingRequest,
      litterData: validLitterData
    });
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-[#4A90E2]">Confirm New Litter</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800">&times;</button>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-6 text-center">
          <div className="p-4 bg-pink-50 border border-pink-200 rounded-lg">
            <h3 className="font-bold text-lg text-pink-700">Dam (Mother)</h3>
            <p className="text-primary">{damPet.name}</p>
          </div>
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-bold text-lg text-blue-700">Sire (Father)</h3>
            <p className="text-primary">{sirePet.name}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <h3 className="text-xl font-semibold text-[#333333] mb-3">Register Offspring:</h3>
          <div className="space-y-4 max-h-64 overflow-y-auto pr-2">
            {litter.map((pet, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
                <input
                  type="text"
                  placeholder="Pet Name"
                  value={pet.name}
                  onChange={(e) => handleLitterChange(index, 'name', e.target.value)}
                  className="input-style mb-0 flex-1"
                />
                <select
                  value={pet.gender}
                  onChange={(e) => handleLitterChange(index, 'gender', e.target.value)}
                  className="input-style mb-0 w-32"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
                <button
                  type="button"
                  onClick={() => removePetFromLitter(index)}
                  className="bg-red-500 text-white rounded-full w-8 h-8 flex-shrink-0 font-bold hover:bg-red-700"
                >
                  &ndash;
                </button>
              </div>
            ))}
          </div>
          
          <button
            type="button"
            onClick={addPetToLitter}
            className="mt-4 text-sm bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
          >
            + Add Another Pet
          </button>
          
          <div className="mt-8 pt-4 border-t flex justify-end gap-4">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary py-2 px-6"
            >
              {loading ? "Confirming..." : "Confirm & Create Pets"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
// --- END: Litter Confirmation Modal Component ---


export default function AdminPanel(){

  const { user, isAdmin, loading } = useAuth();
  const [pets, setPets] = useState([]);
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  // --- NEW STATES ---
  const [acceptedRequests, setAcceptedRequests] = useState([]);
  const [modalData, setModalData] = useState(null); // Controls the modal
  // --- END NEW STATES ---
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [panelLoading, setPanelLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      router.push('/Login');
    }
  }, [user, isAdmin, loading, router]);

  const fetchAllData = async () => {
    setPanelLoading(true);
    try {
      const [dataRes, maintenanceRes] = await Promise.all([
        fetch("/api/admin"),
        fetch("/api/maintenance")
      ]);

      const data = await dataRes.json();
      const maintenanceData = await maintenanceRes.json();

      setPets(data.pets || []);
      setUsers(data.users || []);
      setProducts(data.products || []);
      setAcceptedRequests(data.acceptedMatingRequests || []); // Set new state
      setIsMaintenanceMode(maintenanceData.isMaintenanceMode);
    } catch (err) {
      console.error("Error fetching admin data:", err);
      setPets([]);
      setUsers([]);
      setProducts([]);
      setAcceptedRequests([]);
      setIsMaintenanceMode(false);
    } finally {
      setPanelLoading(false);
    }
  };

  // ... (handleStatusUpdate, handleDeletePet, handleUserBan, etc. remain the same) ...
  const handleStatusUpdate = async (petId, status) => {
    try {
      const res = await fetch("/api/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "updatePetStatus", petId, status }),
      });

      if (res.ok) {
        setPets(prevPets => prevPets.map(pet =>
          pet._id === petId ? { ...pet, verificationStatus: status, isBanned: status === 'rejected' } : pet
        ));
        alert(`Pet status set to ${status}.`);
      } else {
        alert("Failed to update status.");
      }
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };
  
  const handleDeletePet = async (petId) => {
    if (window.confirm("Are you sure you want to delete this pet? This action cannot be undone.")) {
      try {
        const res = await fetch(`/api/pet/${petId}`, { 
          method: "DELETE",
        });

        if (res.ok) {
          setPets(prevPets => prevPets.filter(pet => pet._id !== petId));
          alert("Pet deleted successfully!");
        } else {
          alert("Failed to delete pet.");
        }
      } catch (err) {
        console.error("Error deleting pet:", err);
      }
    }
  };

  const handleUserBan = async (userId) => {
    if (window.confirm("Are you sure you want to ban this user? This will also ban their pets.")) {
      try {
        const res = await fetch("/api/admin", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "banUser", userId }),
        });

        if (res.ok) {
          setUsers(prevUsers => prevUsers.map(user =>
            user._id === userId ? { ...user, isBanned: true } : user
          ));
          fetchAllData();
        } else {
          alert("Failed to ban user.");
        }
      } catch (err) {
        console.error("Error banning user:", err);
      }
    }
  };
  
  const handleToggleAdminStatus = async (userId, makeAdmin) => {
    if (window.confirm(`Are you sure you want to ${makeAdmin ? 'make this user an admin' : 'remove admin status from this user'}?`)) {
      try {
        const res = await fetch("/api/admin", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "toggleAdminStatus", userId, makeAdmin }),
        });

        if (res.ok) {
          setUsers(prevUsers => prevUsers.map(user =>
            user._id === userId ? { ...user, isAdmin: makeAdmin } : user
          ));
          alert(`Admin status for user updated successfully.`);
        } else {
          alert("Failed to update admin status.");
        }
      } catch (err) {
        console.error("Error toggling admin status:", err);
      }
    }
  };

  const handleProductDelete = async (productId) => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      try {
        const res = await fetch("/api/admin", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId }),
        });

        if (res.ok) {
          setProducts(prevProducts => prevProducts.filter(p => p._id !== productId));
          alert("Product deleted successfully!");
        } else {
          alert("Failed to delete product.");
        }
      } catch (err) {
        console.error("Error deleting product:", err);
      }
    }
  };

  const handleMaintenanceToggle = async () => {
    const newStatus = !isMaintenanceMode;
    try {
      const res = await fetch("/api/maintenance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isMaintenanceMode: newStatus }),
      });

      if (res.ok) {
        setIsMaintenanceMode(newStatus);
        alert(`Maintenance mode turned ${newStatus ? 'ON' : 'OFF'}`);
      } else {
        alert("Failed to change maintenance status.");
      }
    } catch (err) {
      console.error("Error toggling maintenance mode:", err);
    }
  };
  
  const fetchAIAnalysis = async (pet) => {
      if (!pet.certificateUrl) return alert("Pet has no certificate to analyze.");
      
      const { name, age, breed, certificateUrl } = pet;
      
      try {
          alert("Sending request to Gemini AI for analysis. This may take a moment...");
          const res = await fetch("/api/verify-certificate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ certificateUrl, petName: name, petAge: age, petBreed: breed }),
          });

          const data = await res.json();
          if (res.ok) {
              alert("AI Analysis Complete:\n" + data.aiAnalysis);
          } else {
              alert(`AI Analysis Failed: ${data.error}`);
          }
      } catch (err) {
          console.error("Error calling AI verification API:", err);
      }
  }

  // --- NEW: Function to handle submitting the litter ---
  const handleLitterSubmit = async (formData) => {
    try {
      const res = await fetch("/api/admin/confirm-litter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (res.ok) {
        alert("Success! Litter has been confirmed and new pets created.");
        setModalData(null); // Close modal
        fetchAllData(); // Refresh all admin data
      } else {
        alert(`Error: ${data.error || 'Failed to confirm litter.'}`);
      }
    } catch (err) {
      console.error("Error submitting litter:", err);
      alert("A client-side error occurred.");
    }
  };
  // --- END NEW ---


  useEffect(() => {
    if (user && isAdmin) {
      fetchAllData();
    }
  }, [user, isAdmin]);

  if (loading || panelLoading || !isAdmin) {
    return <p className="text-center text-[#333333] mt-20 text-xl">Loading admin panel...</p>;
  }

  return (
    <> {/* Added fragment to wrap modal and page */}
      {/* --- NEW: Render Modal --- */}
      {modalData && (
        <LitterConfirmationModal
          data={modalData}
          onClose={() => setModalData(null)}
          onSubmit={handleLitterSubmit}
        />
      )}
      {/* --- END NEW --- */}

      <div className="min-h-screen bg-[#F4F7F9] p-4 md:p-10">
        <div className="max-w-7xl mx-auto bg-white rounded-3xl shadow-2xl p-6 md:p-10 border-t-8 border-[#4A90E2]">
          <h1 className="text-4xl font-extrabold text-[#333333] mb-8 text-center border-b pb-4 border-gray-100">
            PetMate Admin Dashboard
          </h1>

          {/* Maintenance Switch */}
          <div className="mb-10 p-5 bg-gray-50 rounded-xl shadow-inner border-l-4 border-[#50E3C2]">
            {/* ... (maintenance UI remains the same) ... */}
            <h2 className="text-2xl font-bold text-[#4A90E2] mb-3">Website Maintenance</h2>
            <div className="flex items-center space-x-6">
              <span className="font-bold text-lg text-[#333333]">
                Status: 
                <span className={`ml-2 px-3 py-1 rounded-full text-white ${isMaintenanceMode ? 'bg-red-600' : 'bg-green-600'}`}>
                  {isMaintenanceMode ? 'ON' : 'OFF'}
                </span>
              </span>
              <button
                onClick={handleMaintenanceToggle}
                className={`px-6 py-2 rounded-xl text-white font-bold transition-colors shadow-md hover:shadow-lg ${
                  isMaintenanceMode ? 'bg-red-500 hover:bg-red-700' : 'bg-green-500 hover:bg-green-700'
                }`}
              >
                Turn {isMaintenanceMode ? 'Off' : 'On'}
              </button>
            </div>
          </div>

          {/* --- NEW: Pending Breeding Confirmation Section --- */}
          <h2 className="text-3xl font-bold text-[#333333] mb-6 border-l-4 border-[#4A90E2] pl-3">Pending Breeding Confirmation ({acceptedRequests.length})</h2>
          {acceptedRequests.length === 0 ? (
            <p className="text-[#333333] text-center p-4 bg-gray-50 rounded-lg">No accepted mating requests awaiting confirmation.</p>
          ) : (
            <div className="overflow-x-auto mb-10 shadow-lg rounded-xl">
              <table className="min-w-full bg-white">
                <thead className="bg-[#4A90E2] text-white">
                  <tr>
                    <th className="py-3 px-6 text-left">Dam (Mother)</th>
                    <th className="py-3 px-6 text-left">Sire (Father)</th>
                    <th className="py-3 px-6 text-left">Request Date</th>
                    <th className="py-3 px-6 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {acceptedRequests.map((req, index) => (
                    <tr 
                      key={index} 
                      className="border-b last:border-b-0 hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-4 px-6 text-[#333333] font-semibold">
                        <Link href={`/pet/${req.damPet._id}`} className="hover:underline">{req.damPet.name}</Link>
                      </td>
                      <td className="py-4 px-6 text-[#333333] font-semibold">
                        <Link href={`/pet/${req.sirePet._id}`} className="hover:underline">{req.sirePet.name}</Link>
                      </td>
                      <td className="py-4 px-6 text-[#333333] text-sm">
                        {new Date(req.matingRequest.requestedAt).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <button
                          onClick={() => setModalData(req)} // Open modal with request data
                          className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-600 transition-colors"
                        >
                          Confirm Litter
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {/* --- END NEW SECTION --- */}


          {/* Pet Management Section */}
          <h2 className="text-3xl font-bold text-[#333333] mb-6 border-l-4 border-[#50E3C2] pl-3">Pet Certificate Verification ({pets?.length})</h2>
          {pets?.length === 0 ? (
            <p className="text-[#333333] text-center p-4 bg-gray-50 rounded-lg">No pets found requiring attention.</p>
          ) : (
            <div className="overflow-x-auto mb-10 shadow-lg rounded-xl">
              {/* ... (Pet verification table remains the same) ... */}
              <table className="min-w-full bg-white">
                <thead className="bg-[#4A90E2] text-white">
                  <tr>
                    <th className="py-3 px-6 text-left">Pet Name</th>
                    <th className="py-3 px-6 text-left">Owner ID</th>
                    <th className="py-3 px-6 text-left">Status</th>
                    <th className="py-3 px-6 text-center">Certificate</th>
                    <th className="py-3 px-6 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pets?.map((pet) => (
                    <tr 
                      key={pet._id} 
                      className={`border-b last:border-b-0 hover:bg-gray-50 transition-colors ${
                        pet.isBanned ? 'bg-red-50/50' : pet.verificationStatus === 'verified' ? 'bg-green-50/50' : ''
                      }`}
                    >
                      <td className="py-4 px-6 text-[#333333] font-semibold">{pet.name}</td>
                      <td className="py-4 px-6 text-[#333333] text-sm">{pet.ownerId}</td>
                      <td className="py-4 px-6">
                        <span className={`py-1 px-3 rounded-full text-xs font-bold text-white uppercase ${
                          pet.isBanned ? 'bg-red-600' :
                          pet.verificationStatus === 'pending' ? 'bg-orange-500' :
                          pet.verificationStatus === 'verified' ? 'bg-green-600' :
                          'bg-red-600'
                        }`}>
                          {pet.isBanned ? 'BANNED' : pet.verificationStatus}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        {pet.certificateUrl ? (
                          <div className="flex flex-col items-center gap-1">
                            <a href={pet.certificateUrl} target="_blank" rel="noopener noreferrer" className="text-[#4A90E2] underline hover:text-[#50E3C2] font-medium">
                              View Doc
                            </a>
                            <button
                              onClick={() => fetchAIAnalysis(pet)}
                              className="text-xs text-gray-500 hover:text-[#4A90E2] underline mt-1"
                            >
                              Run AI Check
                            </button>
                            <Link href={`/pet/${pet._id}`} className="text-xs text-gray-500 hover:text-[#50E3C2] underline">
                                View Details
                            </Link>
                          </div>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-center flex justify-center items-center gap-3">
                        <button
                          onClick={() => handleStatusUpdate(pet._id, 'verified')}
                          disabled={pet.verificationStatus === 'verified' || pet.isBanned}
                          className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 hover:bg-green-600 transition-colors"
                        >Approve</button>
                        <button
                          onClick={() => handleStatusUpdate(pet._id, 'rejected')}
                          disabled={pet.verificationStatus === 'rejected' || pet.isBanned}
                          className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 hover:bg-red-600 transition-colors"
                        >Reject</button>
                        <button
                          onClick={() => handleDeletePet(pet._id)}
                          className="bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-900 transition-colors"
                        >Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* User Management Section */}
          <h2 className="text-3xl font-bold text-[#333333] mb-6 border-l-4 border-[#4A90E2] pl-3">User Management ({users?.length})</h2>
          {users?.length === 0 ? (
            <p className="text-[#333333] text-center p-4 bg-gray-50 rounded-lg">No users found.</p>
          ) : (
            <div className="overflow-x-auto shadow-lg rounded-xl mb-10">
              {/* ... (User management table remains the same) ... */}
              <table className="min-w-full bg-white">
                <thead className="bg-[#4A90E2] text-white">
                  <tr>
                    <th className="py-3 px-6 text-left">Name / Username</th>
                    <th className="py-3 px-6 text-left">User ID (FID)</th>
                    <th className="py-3 px-6 text-left">Status</th>
                    <th className="py-3 px-6 text-left">Role</th>
                    <th className="py-3 px-6 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users?.map((user) => (
                    <tr 
                      key={user._id} 
                      className={`border-b last:border-b-0 hover:bg-gray-50 transition-colors ${user.isBanned ? 'bg-red-50/50' : ''}`}
                    >
                      <td className="py-4 px-6 text-[#333333]">
                        <span className="font-semibold block">{user.name}</span>
                        <span className="text-sm text-gray-500 italic">{user.username}</span>
                      </td>
                      <td className="py-4 px-6 text-[#333333] text-sm">{user.firebaseUid}</td>
                      <td className="py-4 px-6">
                        <span className={`py-1 px-3 rounded-full text-xs font-bold text-white uppercase ${
                          user.isBanned ? 'bg-red-600' : 'bg-green-600'
                        }`}>
                          {user.isBanned ? 'BANNED' : 'ACTIVE'}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`py-1 px-3 rounded-full text-xs font-bold text-white uppercase ${
                          user.isAdmin ? 'bg-purple-600' : 'bg-gray-400'
                        }`}>
                          {user.isAdmin ? 'ADMIN' : 'USER'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center flex justify-center items-center gap-3">
                        <button
                          onClick={() => handleUserBan(user._id)}
                          disabled={user.isBanned}
                          className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-semibold mr-2 disabled:opacity-50 hover:bg-red-600 transition-colors"
                        >Ban User</button>
                        <button
                          onClick={() => handleToggleAdminStatus(user._id, !user.isAdmin)}
                          className="bg-purple-500 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 hover:bg-purple-600 transition-colors"
                        >
                          {user.isAdmin ? 'Remove Admin' : 'Make Admin'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Product Management Section */}
          <h2 className="text-3xl font-bold text-[#333333] mb-6 border-l-4 border-[#4A90E2] pl-3">Product Management ({products?.length})</h2>
          <div className="mb-6">
            <button
              onClick={() => router.push("/Add-product")}
              className="bg-[#50E3C2] hover:bg-[#3FCCB4] text-[#333333] font-bold py-3 px-6 rounded-xl shadow-lg transition-all duration-200 hover:scale-105"
            >
              + Add Product
            </button>
          </div>
          {products?.length === 0 ? (
            <p className="text-[#333333] text-center p-4 bg-gray-50 rounded-lg">No products found.</p>
          ) : (
            <div className="overflow-x-auto shadow-lg rounded-xl">
              {/* ... (Product management table remains the same) ... */}
              <table className="min-w-full bg-white">
                <thead className="bg-[#4A90E2] text-white">
                  <tr>
                    <th className="py-3 px-6 text-left">Product Name</th>
                    <th className="py-3 px-6 text-left">Owner</th>
                    <th className="py-3 px-6 text-left">Category</th>
                    <th className="py-3 px-6 text-left">Price</th>
                    <th className="py-3 px-6 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products?.map((product) => (
                    <tr key={product._id} className="border-b last:border-b-0 hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-6 text-[#333333] font-semibold">{product.name}</td>
                      <td className="py-4 px-6 text-[#333333]">{product.ownerName}</td>
                      <td className="py-4 px-6 text-[#333333]">{product.category}</td>
                      <td className="py-4 px-6 text-[#333333]">₹ {product.price}</td>
                      <td className="py-4 px-6 text-center">
                        <button
                          onClick={() => handleProductDelete(product._id)}
                          className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-600 transition-colors"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
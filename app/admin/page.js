// app/admin/page.js
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../auth-provider";
import Link from "next/link";
import Image from "next/image";

export default function AdminPanel(){

  const { user, isAdmin, loading } = useAuth();
  const [pets, setPets] = useState([]);
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
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
      // NOTE: Ensure your backend's /api/maintenance returns the status correctly
      const [dataRes, maintenanceRes] = await Promise.all([
        fetch("/api/admin"),
        fetch("/api/maintenance")
      ]);

      const data = await dataRes.json();
      const maintenanceData = await maintenanceRes.json();

      // Ensure data structure matches what's expected
      setPets(data.pets || []);
      setUsers(data.users || []);
      setProducts(data.products || []);
      setIsMaintenanceMode(maintenanceData.isMaintenanceMode);
    } catch (err) {
      console.error("Error fetching admin data:", err);
      setPets([]);
      setUsers([]);
      setProducts([]);
      setIsMaintenanceMode(false);
    } finally {
      setPanelLoading(false);
    }
  };

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
  
  // NEW FUNCTION to handle pet deletion
  const handleDeletePet = async (petId) => {
    if (window.confirm("Are you sure you want to delete this pet? This action cannot be undone.")) {
      try {
        // We will call the specific DELETE route for pets, not the admin PATCH route
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
        alert("An error occurred. Check the console for details.");
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
          // Banning a user should ideally ban their pets too (handled in backend logic not shown, but we update frontend state based on successful ban)
          setUsers(prevUsers => prevUsers.map(user =>
            user._id === userId ? { ...user, isBanned: true } : user
          ));
          fetchAllData(); // Re-fetch all data to ensure pet table updates reflect the user ban
        } else {
          alert("Failed to ban user.");
        }
      } catch (err) {
        console.error("Error banning user:", err);
      }
    }
  };
  
  // FUNCTION to toggle a user's admin status
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
        // We will use the admin DELETE route for products
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
  
  // NEW FUNCTION to fetch AI analysis of a certificate
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
              // Display the AI response in a readable format
              alert("AI Analysis Complete:\n" + data.aiAnalysis);
          } else {
              alert(`AI Analysis Failed: ${data.error}`);
          }
      } catch (err) {
          console.error("Error calling AI verification API:", err);
          alert("A network error occurred while contacting the AI service.");
      }
  }


  useEffect(() => {
    if (user && isAdmin) {
      fetchAllData();
    }
  }, [user, isAdmin]);

  if (loading || panelLoading || !isAdmin) {
    // Apply new UI loading style
    return <p className="text-center text-[#333333] mt-20 text-xl">Loading admin panel...</p>;
  }

  return (
    // Apply new UI BG color
    <div className="min-h-screen bg-[#F4F7F9] p-4 md:p-10">
      {/* Apply new UI card styling with accent border */}
      <div className="max-w-7xl mx-auto bg-white rounded-3xl shadow-2xl p-6 md:p-10 border-t-8 border-[#4A90E2]">
        <h1 className="text-4xl font-extrabold text-[#333333] mb-8 text-center border-b pb-4 border-gray-100">
          PetMate Admin Dashboard
        </h1>

        {/* Maintenance Switch (Updated Styling) */}
        <div className="mb-10 p-5 bg-gray-50 rounded-xl shadow-inner border-l-4 border-[#50E3C2]">
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

        {/* Pet Management Section */}
        <h2 className="text-3xl font-bold text-[#333333] mb-6 border-l-4 border-[#4A90E2] pl-3">Pet Certificate Verification ({pets?.length})</h2>
        {pets?.length === 0 ? (
          <p className="text-[#333333] text-center p-4 bg-gray-50 rounded-lg">No pets found requiring attention.</p>
        ) : (
          <div className="overflow-x-auto mb-10 shadow-lg rounded-xl">
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
                    
                    {/* Status Cell */}
                    <td className="py-4 px-6">
                      <span className={`py-1 px-3 rounded-full text-xs font-bold text-white uppercase ${
                        pet.isBanned ? 'bg-red-600' :
                        pet.verificationStatus === 'pending' ? 'bg-orange-500' :
                        pet.verificationStatus === 'verified' ? 'bg-green-600' :
                        'bg-red-600' // Rejected
                      }`}>
                        {pet.isBanned ? 'BANNED' : pet.verificationStatus}
                      </span>
                    </td>
                    
                    {/* Certificate Cell */}
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
                    
                    {/* Actions Cell */}
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
  );
}
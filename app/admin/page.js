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
      const [dataRes, maintenanceRes] = await Promise.all([
        fetch("/api/admin"),
        fetch("/api/maintenance")
      ]);

      const data = await dataRes.json();
      const maintenanceData = await maintenanceRes.json();

      setPets(data.pets);
      setUsers(data.users);
      setProducts(data.products);
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
      } else {
        alert("Failed to update status.");
      }
    } catch (err) {
      console.error("Error updating status:", err);
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
  
  // NEW FUNCTION to toggle a user's admin status
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

  useEffect(() => {
    if (user && isAdmin) {
      fetchAllData();
    }
  }, [user, isAdmin]);

  if (loading || panelLoading || !isAdmin) {
    return <p className="text-center text-[#4F200D] mt-20">Loading admin panel...</p>;
  }

  return (
    <div className="min-h-screen bg-[#F6F1E9] p-4 md:p-10">
      <div className="max-w-7xl mx-auto bg-white rounded-3xl shadow-lg p-6 md:p-10">
        <h1 className="text-3xl font-bold text-[#4F200D] mb-8 text-center">Admin Panel</h1>

        {/* Maintenance Switch */}
        <div className="mb-8 p-4 bg-gray-100 rounded-xl shadow-inner">
          <h2 className="text-xl font-bold text-[#4F200D] mb-2">Website Maintenance</h2>
          <div className="flex items-center space-x-4">
            <span className={`font-bold ${isMaintenanceMode ? 'text-red-600' : 'text-green-600'}`}>
              Status: {isMaintenanceMode ? 'ON' : 'OFF'}
            </span>
            <button
              onClick={handleMaintenanceToggle}
              className={`px-4 py-2 rounded-lg text-white font-bold transition-colors ${
                isMaintenanceMode ? 'bg-red-500 hover:bg-red-700' : 'bg-green-500 hover:bg-green-700'
              }`}
            >
              Turn {isMaintenanceMode ? 'Off' : 'On'}
            </button>
          </div>
        </div>

        {/* Pet Management Section */}
        <h2 className="text-2xl font-bold text-[#4F200D] mb-4">Pet Certificate Verification</h2>
        {pets?.length === 0 ? (
          <p className="text-[#4F200D] text-center">No pets found.</p>
        ) : (
          <div className="overflow-x-auto mb-8">
            <table className="min-w-full bg-white rounded-xl shadow-md">
              <thead className="bg-[#FF9A00] text-white">
                <tr>
                  <th className="py-3 px-6 text-left">Pet Name</th>
                  <th className="py-3 px-6 text-left">Owner ID</th>
                  <th className="py-3 px-6 text-left">Certificate URL</th>
                  <th className="py-3 px-6 text-left">Status</th>
                  <th className="py-3 px-6 text-center">Actions</th>
                  <th className="py-3 px-6 text-center">View History</th>
                </tr>
              </thead>
              <tbody>
                {pets?.map((pet) => (
                  <tr key={pet._id} className="border-b last:border-b-0">
                    <td className="py-4 px-6 text-[#4F200D]">{pet.name}</td>
                    <td className="py-4 px-6 text-[#4F200D] text-sm">{pet.ownerId}</td>
                    <td className="py-4 px-6">
                      {pet.certificateUrl ? (
                        <a href={pet.certificateUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                          View Certificate
                        </a>
                      ) : ("N/A")}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`py-1 px-3 rounded-full text-xs font-bold text-white ${
                        pet.verificationStatus === 'pending' ? 'bg-orange-400' :
                        pet.verificationStatus === 'verified' ? 'bg-green-600' :
                        pet.isBanned ? 'bg-red-600' : 'bg-red-600'
                      }`}>
                        {pet.isBanned ? 'Banned' : pet.verificationStatus}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <button
                        onClick={() => handleStatusUpdate(pet._id, 'verified')}
                        disabled={pet.verificationStatus === 'verified' || pet.isBanned}
                        className="bg-green-500 text-white px-4 py-2 rounded-lg mr-2 disabled:opacity-50"
                      >Approve</button>
                      <button
                        onClick={() => handleStatusUpdate(pet._id, 'rejected')}
                        disabled={pet.verificationStatus === 'rejected' || pet.isBanned}
                        className="bg-red-500 text-white px-4 py-2 rounded-lg disabled:opacity-50"
                      >Reject</button>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <Link href={`/pet/${pet._id}`}>
                        <span className="text-blue-600 hover:underline cursor-pointer">View</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* User Management Section */}
        <h2 className="text-2xl font-bold text-[#4F200D] mb-4">User Management</h2>
        {users?.length === 0 ? (
          <p className="text-[#4F200D] text-center">No users found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white rounded-xl shadow-md">
              <thead className="bg-[#FF9A00] text-white">
                <tr>
                  <th className="py-3 px-6 text-left">Name</th>
                  <th className="py-3 px-6 text-left">Username</th>
                  <th className="py-3 px-6 text-left">User ID</th>
                  <th className="py-3 px-6 text-left">Status</th>
                  <th className="py-3 px-6 text-left">Admin</th>
                  <th className="py-3 px-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users?.map((user) => (
                  <tr key={user._id} className="border-b last:border-b-0">
                    <td className="py-4 px-6 text-[#4F200D]">{user.name}</td>
                    <td className="py-4 px-6 text-[#4F200D]">{user.username}</td>
                    <td className="py-4 px-6 text-[#4F200D] text-sm">{user.firebaseUid}</td>
                    <td className="py-4 px-6">
                      <span className={`py-1 px-3 rounded-full text-xs font-bold text-white ${
                        user.isBanned ? 'bg-red-600' : 'bg-green-600'
                      }`}>
                        {user.isBanned ? 'Banned' : 'Active'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`py-1 px-3 rounded-full text-xs font-bold text-white ${
                        user.isAdmin ? 'bg-blue-600' : 'bg-gray-400'
                      }`}>
                        {user.isAdmin ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <button
                        onClick={() => handleUserBan(user._id)}
                        disabled={user.isBanned}
                        className="bg-red-500 text-white px-4 py-2 rounded-lg mr-2 disabled:opacity-50"
                      >Ban User</button>
                      <button
                        onClick={() => handleToggleAdminStatus(user._id, !user.isAdmin)}
                        className="bg-purple-500 text-white px-4 py-2 rounded-lg disabled:opacity-50"
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
        <h2 className="text-2xl font-bold text-[#4F200D] mt-8 mb-4">Product Management</h2>
        <div className="mb-4">
          <button
            onClick={() => router.push("/Add-product")}
            className="bg-[#FF9A00] hover:bg-[#e68a00] text-white font-semibold px-6 py-2 rounded-xl shadow-lg transition-all duration-200"
          >
            + Add Product
          </button>
        </div>
        {products?.length === 0 ? (
          <p className="text-[#4F200D] text-center">No products found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white rounded-xl shadow-md">
              <thead className="bg-[#FF9A00] text-white">
                <tr>
                  <th className="py-3 px-6 text-left">Product Name</th>
                  <th className="py-3 px-6 text-left">Owner</th>
                  <th className="py-3 px-6 text-left">Price</th>
                  <th className="py-3 px-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products?.map((product) => (
                  <tr key={product._id} className="border-b last:border-b-0">
                    <td className="py-4 px-6 text-[#4F200D]">{product.name}</td>
                    <td className="py-4 px-6 text-[#4F200D]">{product.ownerName}</td>
                    <td className="py-4 px-6 text-[#4F200D]">₹ {product.price}</td>
                    <td className="py-4 px-6 text-center">
                      <button
                        onClick={() => handleProductDelete(product._id)}
                        className="bg-red-500 text-white px-4 py-2 rounded-lg"
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
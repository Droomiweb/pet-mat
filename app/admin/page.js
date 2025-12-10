// app/admin/page.js
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../auth-provider";
import Link from "next/link";

// Icon components
const CheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z" clipRule="evenodd" /></svg>;
const XMarkIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" /></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 013.878.512.75.75 0 11-.49 1.478l-.565 2.21a1.75 1.75 0 01-1.7 1.417H6.377a1.75 1.75 0 01-1.7-1.417l-.565-2.21a48.83 48.83 0 01-1.132-1.485 48.83 48.83 0 01-.357-.504.75.75 0 01.49-1.478A48.567 48.567 0 017.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 013.369 0c1.603.051 2.815 1.387 2.815 2.951zm-6.136-1.452a51.196 51.196 0 013.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 00-6 0v-.113c0-.794.609-1.428 1.364-1.452zm-.355 5.945a.75.75 0 10-1.5.058l.347 9a.75.75 0 101.499-.058l-.346-9zm5.48.058a.75.75 0 10-1.498-.058l-.347 9a.75.75 0 001.5.058l.345-9z" clipRule="evenodd" /></svg>;

// Litter Modal
const LitterConfirmationModal = ({ data, onClose, onSubmit }) => {
  const { damPet, sirePet } = data;
  const [litter, setLitter] = useState([{ name: '', gender: 'Male' }]);
  const [loading, setLoading] = useState(false);

  const handleLitterChange = (index, field, value) => {
    const updatedLitter = [...litter];
    updatedLitter[index][field] = value;
    setLitter(updatedLitter);
  };

  const addPetToLitter = () => setLitter([...litter, { name: '', gender: 'Male' }]);
  const removePetFromLitter = (index) => setLitter(litter.filter((_, i) => i !== index));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const validLitterData = litter.filter(p => p.name.trim() !== '');
    if (validLitterData.length === 0) {
      alert("Please enter details for at least one pet.");
      setLoading(false);
      return;
    }
    await onSubmit({ ...data, litterData: validLitterData });
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex justify-center items-center p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl p-6 md:p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-white/20">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-extrabold text-[#4A90E2]">Confirm New Litter</h2>
          <button onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"><XMarkIcon /></button>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-6 text-center">
          <div className="p-4 bg-pink-50 border border-pink-200 rounded-2xl">
            <h3 className="font-bold text-sm text-pink-700 uppercase tracking-wider">Mother</h3>
            <p className="text-gray-800 font-bold">{damPet.name}</p>
          </div>
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl">
            <h3 className="font-bold text-sm text-blue-700 uppercase tracking-wider">Father</h3>
            <p className="text-gray-800 font-bold">{sirePet.name}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <h3 className="font-bold text-gray-700">Register Offspring</h3>
          <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
            {litter.map((pet, index) => (
              <div key={index} className="flex items-center gap-3">
                <span className="text-sm font-bold text-gray-400 w-6">{index + 1}.</span>
                <input
                  type="text"
                  placeholder="Pet Name"
                  value={pet.name}
                  onChange={(e) => handleLitterChange(index, 'name', e.target.value)}
                  className="input-field mb-0 flex-1"
                />
                <select
                  value={pet.gender}
                  onChange={(e) => handleLitterChange(index, 'gender', e.target.value)}
                  className="input-field mb-0 w-32"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
                <button type="button" onClick={() => removePetFromLitter(index)} className="text-red-500 hover:bg-red-50 p-2 rounded-full"><TrashIcon /></button>
              </div>
            ))}
          </div>
          
          <button type="button" onClick={addPetToLitter} className="w-full py-2 border-2 border-dashed border-gray-300 text-gray-500 rounded-xl font-bold hover:border-[#4A90E2] hover:text-[#4A90E2] transition">+ Add Another</button>
          
          <div className="pt-4 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 py-3 bg-[#4A90E2] text-white rounded-xl font-bold hover:bg-[#3A75B9] shadow-lg">
              {loading ? "Processing..." : "Confirm Litter"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default function AdminPanel() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  
  const [pets, setPets] = useState([]);
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [acceptedRequests, setAcceptedRequests] = useState([]);
  const [pendingVerificationPets, setPendingVerificationPets] = useState([]);
  
  const [ocrLoading, setOcrLoading] = useState(null); 
  const [modalData, setModalData] = useState(null); 
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [panelLoading, setPanelLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("verification"); 
  const router = useRouter();

  // Fetch admin data
  const fetchAllData = async () => {
    setPanelLoading(true);
    setError(null);
    try {
      const [dataRes, maintenanceRes] = await Promise.all([
        fetch("/api/admin"),
        fetch("/api/maintenance")
      ]);

      if (!dataRes.ok) throw new Error('Failed to fetch admin data');
      const data = await dataRes.json();
      const maintenanceData = await maintenanceRes.json();

      setPets(data.pets || []);
      setUsers(data.users || []);
      setProducts(data.products || []);
      setAcceptedRequests(data.acceptedMatingRequests || []); 
      setPendingVerificationPets(data.pendingVerificationPets || []);
      setIsMaintenanceMode(maintenanceData.isMaintenanceMode);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setPanelLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
        if (!user || !isAdmin) router.push('/Login');
        else fetchAllData();
    }
  }, [user, isAdmin, authLoading, router]);

  // Update pet status
  const handleStatusUpdate = async (petId, status) => {
    if(!confirm(`Mark pet as ${status}?`)) return;
    try {
      const res = await fetch("/api/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "updatePetStatus", petId, status }),
      });
      if (res.ok) fetchAllData();
      else alert("Failed to update");
    } catch (err) { console.error(err); }
  };

  // Delete pet
  const handleDeletePet = async (petId) => {
    if (!confirm("Delete this pet permanently?")) return;
    try {
      const res = await fetch(`/api/pet/${petId}`, { method: "DELETE" });
      if (res.ok) fetchAllData();
    } catch (err) { console.error(err); }
  };

  // Toggle admin role
  const handleToggleAdminStatus = async (userId, makeAdmin) => {
    if (!confirm(`Change admin status for this user?`)) return;
    try {
      const res = await fetch("/api/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggleAdminStatus", userId, makeAdmin }),
      });
      if (res.ok) fetchAllData();
    } catch (err) { console.error(err); }
  };

  // Remove user
  const handleRemoveUser = async (targetUid, targetName) => {
    if (!confirm(`PERMANENTLY remove ${targetName}? This deletes the user and ALL their pets.`)) return;
    try {
      const res = await fetch('/api/admin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'removeUser', targetUid }),
      });
      if (res.ok) fetchAllData();
      else alert("Failed to remove user");
    } catch (err) { console.error(err); }
  };

  // Delete product
  const handleProductDelete = async (productId) => {
    if (!confirm("Delete this product?")) return;
    try {
      const res = await fetch("/api/admin", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      if (res.ok) fetchAllData();
    } catch (err) { console.error(err); }
  };

  // Toggle maintenance mode
  const handleMaintenanceToggle = async () => {
    const newStatus = !isMaintenanceMode;
    if(!confirm(`Turn Maintenance Mode ${newStatus ? "ON" : "OFF"}?`)) return;
    try {
      await fetch("/api/maintenance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isMaintenanceMode: newStatus }),
      });
      setIsMaintenanceMode(newStatus);
    } catch (err) { console.error(err); }
  };

  // Handle litter submission
  const handleLitterSubmit = async (formData) => {
    try {
      const res = await fetch("/api/admin/confirm-litter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setModalData(null); 
        fetchAllData(); 
      } else alert('Failed to confirm litter.');
    } catch (err) { console.error(err); }
  };

  // AI Analysis
  const fetchAIAnalysis = async (pet) => {
    if (!pet.certificateUrl) return alert("No certificate.");
    alert("Running AI Analysis...");
    try {
      const res = await fetch("/api/verify-certificate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          certificateUrl: pet.certificateUrl, 
          petName: pet.name, 
          petAge: pet.age, 
          petBreed: pet.breed,
          ocrText: pet.verificationAnalysis?.ocrText || '' 
        }),
      });
      const data = await res.json();
      if(res.ok) {
          const ai = data.aiAnalysis;
          alert(`AI Verdict: ${ai.isCertificateValid ? "VALID" : "INVALID"}\n\nReason: ${ai.validityReason}\nMatches: Name(${ai.nameMatch}), Age(${ai.ageMatch}), Breed(${ai.breedMatch})`);
      }
    } catch (e) { alert("AI Error"); }
  };

  // OCR Analysis
  const fetchTesseractOcr = async (pet) => {
    if (!pet.certificateUrl) return alert("No certificate.");
    setOcrLoading(pet._id);
    try {
      const res = await fetch("/api/ocr-tesseract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ certificateUrl: pet.certificateUrl }),
      });
      const data = await res.json();
      if (res.ok) alert(`OCR Result:\n${data.ocrText}`);
      else alert("OCR Failed");
    } catch (e) { alert("OCR Error"); }
    finally { setOcrLoading(null); }
  };

  if (authLoading || panelLoading) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-[#E2F4EF]">
            <div className="w-12 h-12 border-4 border-[#4A90E2] border-t-transparent rounded-full animate-spin"></div>
        </div>
    );
  }

  if (!isAdmin) return null;

  // Helpers
  const TabButton = ({ id, label, count }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`px-5 py-3 rounded-full font-bold text-sm transition-all whitespace-nowrap ${
        activeTab === id 
        ? "bg-[#333333] text-white shadow-lg" 
        : "bg-white text-gray-500 hover:bg-gray-100 border border-gray-200"
      }`}
    >
      {label} {count !== undefined && <span className="ml-1 opacity-70 text-xs">({count})</span>}
    </button>
  );

  return (
    <div className="min-h-screen bg-[#E2F4EF] p-4 md:p-8 pb-24 relative">
      {modalData && <LitterConfirmationModal data={modalData} onClose={() => setModalData(null)} onSubmit={handleLitterSubmit} />}

      {/* Background blobs */}
      <div className="fixed inset-0 pointer-events-none opacity-30">
         <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-purple-200 rounded-full blur-3xl"></div>
         <div className="absolute bottom-[-10%] left-[-5%] w-96 h-96 bg-blue-200 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
            <div>
                <h1 className="text-3xl font-extrabold text-[#333333]">Admin Dashboard</h1>
                <p className="text-gray-500 text-sm">Manage users, verifications, and system status.</p>
            </div>
            
            {/* Maintenance Toggle */}
            <div className="bg-white/80 backdrop-blur-sm p-2 pl-4 rounded-full shadow-sm flex items-center gap-3 border border-white">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Maintenance</span>
                <button
                    onClick={handleMaintenanceToggle}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold text-white shadow-md transition-colors ${
                        isMaintenanceMode ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
                    }`}
                >
                    {isMaintenanceMode ? 'ACTIVE' : 'INACTIVE'}
                </button>
            </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-3 overflow-x-auto pb-4 mb-4 no-scrollbar">
            <TabButton id="verification" label="Verification" count={pendingVerificationPets.length} />
            <TabButton id="users" label="Users" count={users.length} />
            <TabButton id="mating" label="Litters" count={acceptedRequests.length} />
            <TabButton id="pets" label="All Pets" count={pets.length} />
            <TabButton id="products" label="Products" count={products.length} />
        </div>

        {/* Content */}
        <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-xl border border-white overflow-hidden min-h-[500px] p-1">
            
            {/* Verification Queue */}
            {activeTab === "verification" && (
                <div className="p-6">
                    <h2 className="text-xl font-bold text-gray-700 mb-6 flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-yellow-500 animate-pulse"></span> Pending Verification
                    </h2>
                    {pendingVerificationPets.length === 0 ? (
                        <div className="text-center py-20 text-gray-400">All caught up! No pets pending.</div>
                    ) : (
                        <div className="grid gap-4">
                            {pendingVerificationPets.map(pet => (
                                <div key={pet._id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-center gap-6">
                                    <div className="flex-1">
                                        <h3 className="font-bold text-lg text-gray-800">{pet.name}</h3>
                                        <p className="text-sm text-gray-500">ID: {pet._id} • Owner: {pet.ownerId}</p>
                                        <div className="flex gap-2 mt-2">
                                            {pet.certificateUrl && (
                                                <a href={pet.certificateUrl} target="_blank" className="text-xs font-bold text-[#4A90E2] bg-blue-50 px-3 py-1 rounded-lg hover:bg-blue-100">View Cert</a>
                                            )}
                                            <button onClick={() => fetchAIAnalysis(pet)} className="text-xs font-bold text-purple-600 bg-purple-50 px-3 py-1 rounded-lg hover:bg-purple-100">AI Check</button>
                                            <button 
                                                onClick={() => fetchTesseractOcr(pet)} 
                                                className="text-xs font-bold text-gray-600 bg-gray-50 px-3 py-1 rounded-lg hover:bg-gray-100"
                                                disabled={ocrLoading === pet._id}
                                            >
                                                {ocrLoading === pet._id ? "Scanning..." : "OCR"}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleStatusUpdate(pet._id, 'verified')} className="p-3 bg-green-100 text-green-600 rounded-xl hover:bg-green-200 transition"><CheckIcon /></button>
                                        <button onClick={() => handleStatusUpdate(pet._id, 'rejected')} className="p-3 bg-red-100 text-red-600 rounded-xl hover:bg-red-200 transition"><XMarkIcon /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Users List */}
            {activeTab === "users" && (
                <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {users.map(user => (
                            <div key={user._id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h4 className="font-bold text-gray-800">{user.name}</h4>
                                        <p className="text-xs text-gray-400">@{user.username}</p>
                                    </div>
                                    <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${user.isAdmin ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-500'}`}>
                                        {user.isAdmin ? 'Admin' : 'User'}
                                    </span>
                                </div>
                                <div className="flex gap-2 mt-4 pt-4 border-t border-gray-50">
                                    <button onClick={() => handleToggleAdminStatus(user._id, !user.isAdmin)} className="text-xs font-bold text-purple-500 hover:bg-purple-50 px-3 py-1.5 rounded-lg transition flex-1 bg-purple-50/50">
                                        {user.isAdmin ? 'Demote' : 'Promote'}
                                    </button>
                                    <button onClick={() => handleRemoveUser(user.firebaseUid, user.name)} className="text-xs font-bold text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg transition flex-1 bg-red-50/50">
                                        Remove
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Litter Requests */}
            {activeTab === "mating" && (
                <div className="p-6">
                    {acceptedRequests.length === 0 ? <div className="text-center py-20 text-gray-400">No pending litters.</div> : (
                        <div className="space-y-4">
                            {acceptedRequests.map((req, idx) => (
                                <div key={idx} className="bg-white p-5 rounded-2xl border border-gray-100 flex justify-between items-center">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-bold text-gray-800">{req.damPet.name}</span>
                                            <span className="text-gray-400 text-xs">x</span>
                                            <span className="font-bold text-gray-800">{req.sirePet.name}</span>
                                        </div>
                                        <p className="text-xs text-gray-400">{new Date(req.matingRequest.requestedAt).toLocaleDateString()}</p>
                                    </div>
                                    <button onClick={() => setModalData(req)} className="bg-[#4A90E2] text-white px-5 py-2 rounded-xl font-bold text-sm shadow-md hover:bg-[#3A75B9]">
                                        Register Litter
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* All Pets / Products */}
            {(activeTab === "pets" || activeTab === "products") && (
                <div className="p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {(activeTab === "pets" ? pets : products).map((item) => (
                            <div key={item._id} className="bg-white p-4 rounded-2xl border border-gray-100 flex justify-between items-center">
                                <div>
                                    <h4 className="font-bold text-gray-700 text-sm">{item.name}</h4>
                                    <p className="text-xs text-gray-400">{item._id}</p>
                                </div>
                                {activeTab === "pets" ? (
                                    <button onClick={() => handleDeletePet(item._id)} className="text-red-400 hover:text-red-600 p-2"><TrashIcon /></button>
                                ) : (
                                    <button onClick={() => handleProductDelete(item._id)} className="text-red-400 hover:text-red-600 p-2"><TrashIcon /></button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

        </div>
      </div>
    </div>
  );
}
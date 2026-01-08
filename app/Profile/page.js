// app/Profile/page.js
"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../auth-provider";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

// --- COMPONENTS ---
import PetStatusBadge from "../components/PetStatusBadge";
import RequestManager from "../components/RequestManager";
import MatingConfirmation from "../components/MatingConfirmation";
import AdoptionHandover from "../components/AdoptionHandover";
import DownloadCertificate from "../components/DownloadCertificate";

// --- ICONS ---
const EditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
  </svg>
);

const LogoutIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
  </svg>
);

const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

const LocationIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
  </svg>
);

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
  </svg>
);

const AlertIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
  </svg>
);

const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
  </svg>
);

const DocumentIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
  </svg>
);

const ExchangeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
  </svg>
);

// --- AVATAR OPTIONS ---
const AVATAR_OPTIONS = [
  "https://api.dicebear.com/9.x/adventurer/svg?seed=Felix",
  "https://api.dicebear.com/9.x/adventurer/svg?seed=Aneka",
  "https://api.dicebear.com/9.x/adventurer/svg?seed=Shadow",
  "https://api.dicebear.com/9.x/adventurer/svg?seed=Lucky",
  "https://api.dicebear.com/9.x/micah/svg?seed=Bubba",
  "https://api.dicebear.com/9.x/micah/svg?seed=Misty",
  "https://api.dicebear.com/9.x/micah/svg?seed=Chester",
  "https://api.dicebear.com/9.x/micah/svg?seed=Ginger",
  "https://api.dicebear.com/9.x/avataaars/svg?seed=Socks",
  "https://api.dicebear.com/9.x/avataaars/svg?seed=Bandit",
  "https://api.dicebear.com/9.x/avataaars/svg?seed=Cookie",
  "https://api.dicebear.com/9.x/avataaars/svg?seed=Coco",
];

export default function Profile() {
  const { user, loading: authLoading, userData, signOut } = useAuth();
  const router = useRouter();

  // Data States
  const [pets, setPets] = useState([]);
  const [userPosts, setUserPosts] = useState([]);

  // UI States
  const [activeTab, setActiveTab] = useState("pets");
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  // Avatar modal
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [avatarSaving, setAvatarSaving] = useState(false);

  // Certificate Upload Modal
  const [showCertModal, setShowCertModal] = useState(false);
  const [selectedPetId, setSelectedPetId] = useState(null);
  const [certForm, setCertForm] = useState({
    file: null,
    vaccineName: "",
    vaccinationDate: "",
    expiryDate: ""
  });
  const [certUploading, setCertUploading] = useState(false);

  // --- FETCH DATA ---
  const fetchUserPets = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const timestamp = new Date().getTime();
      const res = await fetch(`/api/pet/user/${user.uid}?t=${timestamp}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setPets(data);
      }
    } catch (error) {
      console.error("Error fetching pets:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchUserPosts = useCallback(async () => {
    if (!user) return;
    try {
      setPostsLoading(true);
      const res = await fetch(`/api/community/posts`, { cache: "no-store" });
      if (res.ok) {
        const allPosts = await res.json();
        const myPosts = allPosts.filter((p) => p.authorId === user.uid);
        setUserPosts(myPosts);
      }
    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      setPostsLoading(false);
    }
  }, [user]);

  // Auth Protection
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/Login");
    }
  }, [authLoading, user, router]);

  // Initial Data Load (Pets)
  useEffect(() => {
    if (user) {
      fetchUserPets();
    }
  }, [user, fetchUserPets]);

  // Lazy Load Posts when tab changes
  useEffect(() => {
    if (user && activeTab === 'posts' && userPosts.length === 0) {
      fetchUserPosts();
    }
  }, [activeTab, user, fetchUserPosts, userPosts.length]);

  // --- HANDLERS ---
  const handleSignOut = async () => {
    await signOut();
    router.push("/Login");
  };

  const handleSaveAvatar = async (avatarUrl) => {
    setAvatarSaving(true);
    try {
      const res = await fetch(`/api/user/${user.uid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar: avatarUrl }),
      });

      if (res.ok) {
        window.location.reload();
      } else {
        alert("Failed to update avatar.");
      }
    } catch (e) {
      console.error(e);
      alert("Error saving avatar.");
    } finally {
      setAvatarSaving(false);
      setShowAvatarModal(false);
    }
  };

  // Certificate Upload Handlers
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCertForm(prev => ({ ...prev, file: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateCertificate = async (e) => {
    e.preventDefault();
    if (!selectedPetId || !certForm.file) return;
    
    setCertUploading(true);
    try {
        const token = await user.getIdToken();
        const res = await fetch(`/api/pet/${selectedPetId}`, {
            method: "PATCH",
            headers: { 
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                action: "updateCertificate",
                requesterId: user.uid,
                certificateImage: certForm.file,
                vaccineName: certForm.vaccineName,
                vaccinationDate: certForm.vaccinationDate,
                expiryDate: certForm.expiryDate
            })
        });

        if (res.ok) {
            alert("Health record updated successfully! Verification status reset to pending.");
            setShowCertModal(false);
            setCertForm({ file: null, vaccineName: "", vaccinationDate: "", expiryDate: "" });
            fetchUserPets();
        } else {
            const data = await res.json();
            alert(`Failed: ${data.error}`);
        }
    } catch (err) {
        console.error(err);
        alert("Error uploading certificate.");
    } finally {
        setCertUploading(false);
    }
  };

  const openCertModal = (petId) => {
    setSelectedPetId(petId);
    setShowCertModal(true);
  };

  const handleConfirmPregnancy = async (petId) => {
    if (!confirm(`Confirm pregnancy for this pet? This will start the Pregnancy Tracker.`)) return;
    setActionLoading(petId);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/pet/confirm-pregnancy", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ petId, userId: user.uid }),
      });
      if (res.ok) {
        alert("Pregnancy confirmed! Redirecting...");
        router.push(`/pregnancy-tracker/${petId}`);
      } else {
        alert("Failed to confirm pregnancy");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReportLost = async (pet) => {
    const newStatus = !pet.isLost;
    const confirmMsg = newStatus
      ? "🚨 ACTIVATE LOST MODE?\n\nThis will alert all nearby users via WhatsApp and display a high-priority banner on the homepage."
      : "✅ Confirm pet is found? The alert will be removed.";

    if (!confirm(confirmMsg)) return;

    setActionLoading(pet._id);

    const updateStatus = async (lat, lng) => {
      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/pet/report-lost", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}` 
          },
          body: JSON.stringify({
            petId: pet._id,
            userId: user.uid,
            status: newStatus,
            lastSeenLat: lat,
            lastSeenLng: lng,
          }),
        });
        const data = await res.json();
        alert(data.message);
        fetchUserPets();
      } catch (err) {
        alert("Error updating lost status");
      } finally {
        setActionLoading(null);
      }
    };

    if (newStatus && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => updateStatus(pos.coords.latitude, pos.coords.longitude),
        () => updateStatus(null, null)
      );
    } else {
      updateStatus(null, null);
    }
  };

  const handleDeletePet = async (petId) => {
    if (!confirm("🛑 DANGER ZONE\n\nAre you sure you want to remove this pet? This will delete all their history, photos, and records permanently.")) return;
    setActionLoading(petId);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/pet/${petId}`, { 
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        alert("Pet removed successfully.");
        fetchUserPets();
      } else {
        alert("Failed to remove pet.");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting pet.");
    } finally {
      setActionLoading(null);
    }
  };

  // --- NEW: GENERIC LISTING SWITCHER ---
  const handleChangeListingType = async (petId, newType) => {
    const actionMap = {
        'Mating': "List for MATING?",
        'Adoption': "List for ADOPTION?",
        'None': "Unlist this pet?"
    };
    
    if (!confirm(`Switch listing to ${newType}?\n\n${newType === 'Adoption' ? 'Note: This will move the pet to the Adoption section.' : newType === 'Mating' ? 'Note: This will move the pet to the Mating section.' : ''}`)) return;
    
    setActionLoading(petId);
    try {
        const token = await user.getIdToken();
        const res = await fetch(`/api/pet/${petId}`, {
            method: "PATCH",
            headers: { 
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                action: "changeListingType",
                requesterId: user.uid,
                newType: newType
            })
        });

        if (res.ok) {
            alert(`Pet listing changed to ${newType} successfully!`);
            fetchUserPets();
        } else {
            const data = await res.json();
            alert(`Failed: ${data.error}`);
        }
    } catch (err) {
        console.error(err);
        alert("Error changing listing type.");
    } finally {
        setActionLoading(null);
    }
  };

  const handleDeletePost = async (postId) => {
    if (!confirm("Delete this post?")) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/community/posts/${postId}`, {
        method: "DELETE",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ userId: user.uid }),
      });
      if (res.ok) fetchUserPosts();
    } catch (e) {
      console.error(e);
    }
  };

  if (authLoading || (loading && activeTab === "pets")) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#E2F4EF]">
        <div className="w-16 h-16 border-4 border-[#4A90E2] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[#4A90E2] font-bold mt-4 animate-pulse">Loading Profile...</p>
      </div>
    );
  }

  if (!user || !userData) return null;

  return (
    <div className="min-h-screen bg-[#E2F4EF] relative pb-20">
      
      {/* AVATAR SELECTION MODAL */}
      {showAvatarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-[2.5rem] max-w-2xl w-full p-8 shadow-2xl border-4 border-white overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-extrabold text-gray-800">Choose Your Look</h3>
              <button
                onClick={() => setShowAvatarModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto grid grid-cols-3 sm:grid-cols-4 gap-4 p-2">
              {AVATAR_OPTIONS.map((url, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSaveAvatar(url)}
                  className="aspect-square rounded-full border-4 border-transparent hover:border-[#4A90E2] hover:scale-105 transition-all bg-gray-50 relative overflow-hidden shadow-sm group"
                >
                  <Image src={url} alt="Avatar Option" fill className="object-cover" />
                  {avatarSaving && (
                    <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-[#4A90E2] border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </button>
              ))}
            </div>
            <p className="text-center text-xs text-gray-400 mt-4">Select an avatar to update your profile instantly.</p>
          </div>
        </div>
      )}

      {/* UPDATE CERTIFICATE MODAL */}
      {showCertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl border-4 border-white">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-extrabold text-gray-800">Update Health Record</h3>
                <button onClick={() => setShowCertModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
            </div>
            
            <form onSubmit={handleUpdateCertificate} className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">New Certificate Image</label>
                    <input type="file" accept="image/*" onChange={handleFileChange} required className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Vaccine Name</label>
                    <input type="text" placeholder="e.g. Rabies, DHPP" required className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-[#4A90E2]" value={certForm.vaccineName} onChange={e => setCertForm({...certForm, vaccineName: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Date Administered</label>
                        <input type="date" required className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-[#4A90E2]" value={certForm.vaccinationDate} onChange={e => setCertForm({...certForm, vaccinationDate: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Expiry Date</label>
                        <input type="date" required className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-[#4A90E2]" value={certForm.expiryDate} onChange={e => setCertForm({...certForm, expiryDate: e.target.value})} />
                    </div>
                </div>
                <div className="bg-blue-50 p-3 rounded-xl text-xs text-blue-600">
                    ℹ️ Uploading a new certificate will reset your verification status to <strong>Pending</strong> until reviewed.
                </div>
                <button type="submit" disabled={certUploading} className="w-full bg-[#4A90E2] text-white py-3 rounded-xl font-bold shadow-lg hover:bg-[#3A75B9] transition disabled:opacity-50 flex justify-center items-center gap-2">
                    {certUploading ? <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></div> : "Update & Submit"}
                </button>
            </form>
          </div>
        </div>
      )}

      {/* Background Paw Prints */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="paw-print"></div>
        ))}
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-28 md:pt-32 relative z-10">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          
          {/* LEFT: USER CARD (STICKY) */}
          <div className="lg:w-1/3 lg:sticky lg:top-32 h-fit z-20 w-full">
            <div className="glass-panel p-8 rounded-[2.5rem] text-center shadow-2xl border border-white/60 backdrop-blur-xl bg-white/80">
              <div
                className="relative w-32 h-32 mx-auto mb-6 group cursor-pointer"
                onClick={() => setShowAvatarModal(true)}
              >
                <div className="absolute inset-0 bg-gradient-to-tr from-[#4A90E2] to-[#50E3C2] rounded-full animate-pulse opacity-20"></div>
                <Image
                  src={userData.avatar || user.photoURL || "/imgs/profile.jpg"}
                  alt="Profile"
                  fill
                  className="rounded-full object-cover border-4 border-white shadow-lg group-hover:opacity-90 transition-opacity"
                />
                <div className="absolute bottom-0 right-0 bg-white p-2 rounded-full shadow-md text-[#4A90E2] hover:bg-[#4A90E2] hover:text-white transition-colors">
                  <EditIcon />
                </div>
              </div>

              <h2 className="text-3xl font-extrabold text-gray-800 mb-1">{userData.name}</h2>
              <p className="text-[#4A90E2] font-medium mb-4">@{userData.username}</p>

              <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-6 bg-white/50 py-2 px-4 rounded-full inline-flex">
                <LocationIcon />
                <span>{userData.location?.city || "Location not set"}</span>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => router.push("/Addpet")}
                  className="w-full flex items-center justify-center gap-2 bg-[#333333] text-white py-3.5 rounded-xl font-bold shadow-lg hover:bg-black transition-all hover:scale-[1.02]"
                >
                  <PlusIcon /> Add New Pet
                </button>

                <div className="grid grid-cols-2 gap-3">
                  <Link
                    href="/forgot-password"
                    className="flex items-center justify-center gap-2 bg-white text-gray-700 border border-gray-200 py-3 rounded-xl font-bold text-sm hover:bg-gray-50 transition"
                  >
                    <EditIcon /> Password
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center justify-center gap-2 bg-red-50 text-red-600 border border-red-100 py-3 rounded-xl font-bold text-sm hover:bg-red-100 transition"
                  >
                    <LogoutIcon /> Sign Out
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: CONTENT AREA */}
          <div className="lg:w-2/3 w-full min-h-screen">
            
            {/* STICKY TAB SWITCHER - UPDATED Z-INDEX TO 40 */}
            <div className="sticky top-24 md:top-24 z-40 bg-[#E2F4EF]/90 backdrop-blur-md py-2 mb-4">
              <div className="flex bg-white p-1.5 rounded-full shadow-sm border border-gray-200 max-w-md mx-auto lg:mx-0">
                <button
                  onClick={() => setActiveTab("pets")}
                  className={`flex-1 px-5 py-2 rounded-full text-xs sm:text-sm font-bold transition-all ${
                    activeTab === "pets"
                      ? "bg-[#E2F4EF] text-[#4A90E2] shadow-inner"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Our Pets ({pets.length})
                </button>
                <button
                  onClick={() => setActiveTab("posts")}
                  className={`flex-1 px-5 py-2 rounded-full text-xs sm:text-sm font-bold transition-all ${
                    activeTab === "posts"
                      ? "bg-[#E2F4EF] text-[#4A90E2] shadow-inner"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Community Posts
                </button>
              </div>
            </div>

            {/* PETS LIST */}
            {activeTab === "pets" && (
              <>
                {pets.length > 0 ? (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {pets.map((pet) => {
                      const isMated =
                        pet.matingHistory?.some((req) => req.status === "mated") ||
                        pet.outgoingRequests?.some((req) => req.status === "mated");
                      const isIncoming = pet.isIncomingAdoption;
                      const completedReq = pet.adoptionRequests?.find(
                        (r) => r.ownerConfirmedHandover && r.requesterConfirmedHandover
                      );

                      const isLegacyAdopted = !pet.adoptionLog && pet.listingType === "None" && completedReq;

                      let effectivePet = pet;
                      if (isLegacyAdopted) {
                        effectivePet = {
                          ...pet,
                          adoptionLog: {
                            adoptionDate: new Date(),
                            newOwnerName: completedReq.requesterName,
                            previousOwnerName: "Previous Owner",
                            certificateId: `LEGACY-${pet._id}`,
                          },
                        };
                      }

                      const showCertificate = (pet.adoptionLog || isLegacyAdopted) && !isIncoming;

                      return (
                        <div
                          key={pet._id}
                          className={`bg-white rounded-[2rem] p-6 shadow-sm border transition-all duration-300 relative overflow-hidden ${
                            isIncoming
                              ? "border-purple-200 bg-purple-50/50"
                              : pet.isLost
                              ? "border-red-200 bg-red-50"
                              : "border-white"
                          }`}
                        >
                          {pet.isLost && (
                            <div className="absolute top-0 left-0 w-full bg-red-500 text-white text-xs font-bold text-center py-1 animate-pulse z-20">
                              🚨 REPORTED MISSING
                            </div>
                          )}

                          {/* MAIN ROW */}
                          <div className="flex flex-col sm:flex-row gap-5 relative z-10 mt-4">
                            <div className="relative shrink-0">
                              <div className={`w-24 h-24 rounded-2xl overflow-hidden shadow-sm border-2 relative ${pet.isLost ? "border-red-400" : "border-gray-100"}`}>
                                <Image
                                  src={pet.imageUrls[0] || "/imgs/dog.jpg"}
                                  alt={pet.name}
                                  fill
                                  className={`object-cover ${pet.isLost ? "grayscale" : ""}`}
                                />
                              </div>
                              <div className="absolute -bottom-3 -right-3 bg-white p-2 rounded-full shadow-md text-xl border border-gray-100">
                                {pet.type === "Dog" ? "🐶" : pet.type === "Cat" ? "🐱" : "🐾"}
                              </div>
                            </div>

                            <div className="flex-1 pt-1">
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div>
                                  <h3 className="text-xl font-extrabold text-gray-800 flex items-center gap-2">
                                    {pet.name}
                                    <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wide ${pet.gender === "Male" ? "bg-blue-50 text-blue-600" : "bg-pink-50 text-pink-600"}`}>
                                      {pet.gender}
                                    </span>
                                  </h3>
                                  <p className="text-gray-500 font-medium text-sm">{pet.breed}</p>
                                  <p className="text-gray-400 text-xs mt-1">{pet.age} Years Old • {pet.listingType} Listing</p>
                                </div>

                                  <div className="flex flex-col items-end gap-1">
                                    {!isIncoming && <PetStatusBadge status={pet.verificationStatus} />}
                                    
                                    {/* VERIFICATION FAILURE REASON & RETRY */}
                                    {(pet.verificationStatus === 'rejected' || pet.verificationStatus === 'needs-review') && (
                                      <div className="flex flex-col items-end gap-1 mt-1">
                                        {pet.certificateAnalysis?.reason && (
                                            <div className="text-[10px] text-red-500 bg-red-50 px-2 py-1 rounded max-w-[200px] text-right leading-tight border border-red-100">
                                                <strong>Issue:</strong> {pet.certificateAnalysis.reason}
                                            </div>
                                        )}
                                        <button 
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                const btn = e.currentTarget;
                                                btn.innerText = "Checking...";
                                                btn.disabled = true;
                                                try {
                                                    const token = await user.getIdToken();
                                                    const res = await fetch(`/api/pet/${pet._id}/reverify`, {
                                                        method: "POST",
                                                        headers: { "Authorization": `Bearer ${token}` }
                                                    });
                                                    const data = await res.json();
                                                    if (data.success) {
                                                        alert(`Check Complete: ${data.status.toUpperCase()}\n\n${data.reason}`);
                                                        window.location.reload();
                                                    } else {
                                                        alert(`Check Failed: ${data.reason || "Unknown error"}`);
                                                        btn.innerText = "Check Again ↻";
                                                        btn.disabled = false;
                                                    }
                                                } catch (err) {
                                                    alert("Error connecting to server.");
                                                    btn.innerText = "Check Again ↻";
                                                    btn.disabled = false;
                                                }
                                            }}
                                            className="text-[10px] font-bold text-blue-600 underline hover:text-blue-800"
                                        >
                                            Check Again ↻
                                        </button>
                                      </div>
                                    )}

                                    {pet.isPregnant && (
                                      <span className="bg-pink-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                                        PREGNANT
                                      </span>
                                    )}
                                  </div>
                              </div>
                            </div>
                          </div>

                          {/* ACTION BUTTONS - BEAUTIFIED GRID LAYOUT */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-5 border-t border-gray-100 relative z-10">
                            {/* 1. View Profile - Always visible */}
                            <Link
                              href={`/pet/${pet._id}`}
                              className="col-span-2 md:col-span-1 py-2.5 bg-gray-50 hover:bg-white border border-gray-200 rounded-xl font-bold text-gray-600 hover:border-[#4A90E2] hover:text-[#4A90E2] transition-all text-sm flex items-center justify-center gap-2 shadow-sm"
                            >
                              <SearchIcon /> Profile
                            </Link>

                            {/* 2. Update Health - Conditional */}
                            {!isIncoming && (
                              <button
                                onClick={() => openCertModal(pet._id)}
                                className="col-span-1 py-2.5 bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-xl font-bold text-blue-600 transition-all text-sm flex items-center justify-center gap-2 shadow-sm"
                              >
                                <DocumentIcon /> Health
                              </button>
                            )}

                            {/* 3. Switch Listing (Generic) */}
                            {!isIncoming && (
                              <button
                                onClick={() => {
                                    if (pet.listingType === 'Mating') handleChangeListingType(pet._id, 'Adoption');
                                    else if (pet.listingType === 'Adoption') handleChangeListingType(pet._id, 'Mating');
                                    else handleChangeListingType(pet._id, 'Mating'); // Default for 'None' -> Mating
                                }}
                                disabled={actionLoading === pet._id}
                                className="col-span-1 py-2.5 bg-purple-50 hover:bg-purple-100 border border-purple-100 rounded-xl font-bold text-purple-600 transition-all text-sm flex items-center justify-center gap-2 shadow-sm"
                              >
                                <ExchangeIcon />
                                {pet.listingType === 'Mating' ? 'To Adoption' : pet.listingType === 'Adoption' ? 'To Mating' : 'List Mating'}
                              </button>
                            )}

                            {/* 4. Lost Mode - Conditional */}
                            {!isIncoming && (
                              <button
                                onClick={() => handleReportLost(pet)}
                                disabled={actionLoading === pet._id}
                                className={`col-span-1 py-2.5 rounded-xl font-bold text-white transition-all text-sm shadow-sm flex items-center justify-center gap-2 ${
                                  pet.isLost
                                    ? "bg-emerald-500 hover:bg-emerald-600 border border-emerald-600"
                                    : "bg-amber-500 hover:bg-amber-600 border border-amber-600"
                                }`}
                              >
                                {pet.isLost ? "Found" : <><AlertIcon /> Lost?</>}
                              </button>
                            )}

                            {/* 5. Delete - Conditional - Last item in grid or separate if needed */}
                            {!isIncoming && (
                              <button
                                onClick={() => handleDeletePet(pet._id)}
                                disabled={actionLoading === pet._id}
                                className="col-span-2 md:col-span-1 md:col-start-4 py-2.5 bg-white border border-red-100 text-red-400 rounded-xl font-bold hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all flex items-center justify-center gap-2 shadow-sm"
                                title="Remove Pet"
                              >
                                <TrashIcon /> Remove
                              </button>
                            )}
                          </div>

                          {/* PREGNANCY / MATING */}
                          <div className="space-y-3 mt-5">
                            {pet.isPregnant && (
                              <Link
                                href={`/pregnancy-tracker/${pet._id}`}
                                className="block w-full py-3 bg-pink-50 border border-pink-100 text-pink-600 rounded-xl font-bold hover:bg-pink-100 transition-colors text-center text-sm flex items-center justify-center gap-2"
                              >
                                <span>🤰</span> Track Pregnancy
                              </Link>
                            )}

                            {!pet.isPregnant && isMated && pet.gender === "Female" && !isIncoming && (
                              <button
                                onClick={() => handleConfirmPregnancy(pet._id)}
                                disabled={actionLoading === pet._id}
                                className="w-full py-3 bg-blue-50 border border-blue-100 text-blue-600 rounded-xl font-bold hover:bg-blue-100 transition-colors text-center text-sm"
                              >
                                {actionLoading === pet._id ? "Processing..." : "Confirm Pregnancy 🤰"}
                              </button>
                            )}

                            {isMated && !pet.isPregnant && pet.gender !== "Female" && (
                              <div className="w-full py-3 bg-green-600 text-white rounded-xl font-bold text-center text-sm shadow-md">
                                Mating Confirmed! 🎉
                                <span className="block text-[10px] opacity-80 font-normal mt-0.5">Success! Partners linked.</span>
                              </div>
                            )}
                          </div>

                          {/* CERTIFICATE */}
                          {showCertificate && (
                            <div className="mt-5 p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-center">
                              <h4 className="text-emerald-800 font-bold text-sm mb-2">🎉 Adoption Complete!</h4>
                              <div className="scale-90 origin-center">
                                <DownloadCertificate pet={effectivePet} />
                              </div>
                            </div>
                          )}

                          {/* REQUEST / MATING / HANDOVER COMPONENTS */}
                          <div className="mt-5 space-y-3">
                            {!isIncoming && <RequestManager pet={pet} onUpdate={fetchUserPets} />}

                            {!isIncoming &&
                              pet.matingHistory?.map((req, idx) => (
                                ["accepted", "ownerConfirmedMating", "requesterConfirmedMating", "mated"].includes(req.status) && (
                                  <div key={req._id || idx} className="scale-95">
                                    <MatingConfirmation pet={pet} request={req} onUpdate={fetchUserPets} />
                                  </div>
                                )
                              ))}

                            {!isIncoming &&
                              pet.outgoingRequests?.map((req, idx) => (
                                req.requestType === "mating" && (
                                  <div key={req._id || idx} className="scale-95">
                                    <MatingConfirmation pet={pet} request={req} onUpdate={fetchUserPets} />
                                  </div>
                                )
                              ))}

                            {!isIncoming &&
                              !isLegacyAdopted &&
                              pet.adoptionRequests?.map((req, idx) => (
                                (req.status === "approved" || req.status === "confirmHandover") &&
                                !(req.ownerConfirmedHandover && req.requesterConfirmedHandover) && (
                                  <div key={req._id || idx} className="scale-95">
                                    <AdoptionHandover
                                      pet={pet}
                                      request={req}
                                      onUpdate={fetchUserPets}
                                      isIncoming={false}
                                    />
                                  </div>
                                )
                              ))}

                            {isIncoming &&
                              pet.adoptionRequests?.map((req, idx) => (
                                <div key={req._id || idx} className="scale-95">
                                  <AdoptionHandover
                                    pet={pet}
                                    request={req}
                                    onUpdate={fetchUserPets}
                                    isIncoming={true}
                                  />
                                </div>
                              ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 bg-white/60 rounded-[2.5rem] border border-white shadow-sm text-center">
                    <div className="text-6xl mb-4 grayscale opacity-50">🐾</div>
                    <h3 className="text-xl font-bold text-gray-400">No pets found</h3>
                    <button
                      onClick={() => router.push("/Addpet")}
                      className="mt-6 bg-[#4A90E2] text-white px-6 py-2 rounded-full font-bold hover:shadow-lg transition"
                    >
                      Add Your First Pet
                    </button>
                  </div>
                )}
              </>
            )}

            {/* POSTS LIST */}
            {activeTab === "posts" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {postsLoading ? (
                  <div className="text-center py-10 text-gray-400">Loading your posts...</div>
                ) : userPosts.length > 0 ? (
                  userPosts.map((post) => (
                    <div
                      key={post._id}
                      className="bg-white/90 backdrop-blur-md rounded-[2rem] p-6 shadow-sm border border-white relative group hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="text-lg font-bold text-gray-800 leading-tight pr-8">{post.title}</h3>
                        <button
                          onClick={() => handleDeletePost(post._id)}
                          className="text-gray-300 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-full"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                      <p className="text-gray-600 text-sm mb-4 line-clamp-2">{post.content}</p>
                      <div className="flex justify-between items-center text-xs text-gray-400 font-bold uppercase tracking-wider pt-2 border-t border-gray-100">
                        <span>{post.createdAt ? new Date(post.createdAt).toLocaleDateString() : ""}</span>
                        <Link
                          href={`/community/${post._id}`}
                          className="text-[#4A90E2] hover:underline flex items-center gap-1"
                        >
                          View Discussion <span className="text-lg">&rarr;</span>
                        </Link>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-20 bg-white/60 rounded-[2.5rem] border border-white shadow-sm">
                    <h3 className="text-xl font-bold text-gray-400">No posts yet</h3>
                    <Link
                      href="/community"
                      className="mt-4 inline-block text-[#4A90E2] font-bold hover:underline"
                    >
                      Go to Community to Post
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
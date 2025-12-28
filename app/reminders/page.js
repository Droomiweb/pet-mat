// app/reminders/page.js
"use client";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../auth-provider";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

// --- ICONS ---
const SyringeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" /></svg>;
const CalendarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" /></svg>;
const LocationIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>;
const CheckCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-12 h-12 text-green-500"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const UploadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-blue-400"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>;
const XIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;

// --- HELPER: DATE CALCULATIONS ---
const getReminderStatus = (expiryDate) => {
    const d = new Date(expiryDate);
    const expiry = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    
    if (isNaN(expiry.getTime())) return { status: 'unknown', days: 0, label: 'Unknown' };

    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { status: 'expired', days: Math.abs(diffDays), label: `Overdue by ${Math.abs(diffDays)} days` };
    if (diffDays <= 30) return { status: 'upcoming', days: diffDays, label: `Due in ${diffDays} days` };
    return { status: 'good', days: diffDays, label: 'Up to date' };
};

// --- COMPONENT: UPLOAD MODAL ---
const UploadModal = ({ isOpen, onClose, petId, petName, onSuccess }) => {
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [status, setStatus] = useState("idle"); // idle, processing, success, error
    const [statusMsg, setStatusMsg] = useState("");

    const handleFileChange = (e) => {
        const selected = e.target.files[0];
        if (selected) {
            setFile(selected);
            setPreview(URL.createObjectURL(selected));
            setStatus("idle");
        }
    };

    const handleUpload = async () => {
        if (!file || !petId) return;

        setUploading(true);
        setStatus("processing");
        setStatusMsg("Analyzing document with AI...");

        // Convert to Base64
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onloadend = async () => {
            try {
                const res = await fetch("/api/reminders/upload-history", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        petId: petId,
                        imageBase64: reader.result
                    })
                });
                
                const data = await res.json();
                
                if (res.ok) {
                    setStatus("success");
                    setStatusMsg(`Verified: ${data.record.vaccineName}`);
                    setTimeout(() => {
                        onSuccess();
                        onClose();
                        setFile(null);
                        setPreview(null);
                        setStatus("idle");
                    }, 2000);
                } else {
                    setStatus("error");
                    setStatusMsg(data.details || "Verification failed. Please try a clearer image.");
                }
            } catch (err) {
                setStatus("error");
                setStatusMsg("Network error. Please try again.");
            } finally {
                setUploading(false);
            }
        };
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in duration-200">
                {/* Header */}
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-gray-800">Update {petName}'s History</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition"><XIcon/></button>
                </div>

                {/* Body */}
                <div className="p-8 text-center">
                    {status === 'success' ? (
                        <div className="flex flex-col items-center">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                                <CheckCircleIcon />
                            </div>
                            <h4 className="text-xl font-bold text-green-600 mb-1">Verified & Updated!</h4>
                            <p className="text-gray-500 text-sm">{statusMsg}</p>
                        </div>
                    ) : (
                        <>
                            {!preview ? (
                                <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-blue-200 rounded-2xl bg-blue-50/50 cursor-pointer hover:bg-blue-50 transition-colors group">
                                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-3 group-hover:scale-110 transition-transform">
                                        <UploadIcon />
                                    </div>
                                    <p className="text-sm font-bold text-blue-600">Click to Upload Certificate</p>
                                    <p className="text-xs text-blue-400 mt-1">Supported: JPG, PNG</p>
                                    <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                                </label>
                            ) : (
                                <div className="relative w-full h-48 rounded-2xl overflow-hidden border border-gray-200 mb-4 group">
                                    <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                                    <button onClick={() => {setFile(null); setPreview(null)}} className="absolute top-2 right-2 bg-white/90 p-2 rounded-full text-red-500 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity font-bold text-xs">Remove</button>
                                </div>
                            )}

                            {/* Status or Button */}
                            {status === 'processing' ? (
                                <div className="mt-6 flex flex-col items-center gap-3">
                                    <div className="w-8 h-8 border-4 border-[#4A90E2] border-t-transparent rounded-full animate-spin"></div>
                                    <p className="text-sm font-bold text-gray-500 animate-pulse">{statusMsg}</p>
                                </div>
                            ) : status === 'error' ? (
                                <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-xl font-medium border border-red-100">
                                    ❌ {statusMsg}
                                </div>
                            ) : (
                                <button 
                                    onClick={handleUpload} 
                                    disabled={!file}
                                    className="w-full mt-6 bg-[#333333] text-white py-3.5 rounded-xl font-bold hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                                >
                                    Verify & Update
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- COMPONENT: REMINDER CARD ---
const ReminderCard = ({ reminder }) => {
    const { status, label } = getReminderStatus(reminder.expiryDate);
    const styles = {
        expired: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', iconBg: 'bg-red-100', badge: 'bg-red-500' },
        upcoming: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', iconBg: 'bg-orange-100', badge: 'bg-orange-500' },
        good: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', iconBg: 'bg-green-100', badge: 'bg-green-500' },
        unknown: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700', iconBg: 'bg-gray-100', badge: 'bg-gray-500' }
    }[status] || styles.unknown;

    return (
        <div className={`flex items-center p-4 rounded-xl border ${styles.bg} ${styles.border} mb-3 transition-transform hover:scale-[1.01]`}>
            <div className={`p-3 rounded-full ${styles.iconBg} mr-4`}>
                <SyringeIcon />
            </div>
            <div className="flex-1">
                <h4 className={`font-bold ${styles.text} text-base`}>{reminder.vaccineName}</h4>
                <div className="flex items-center gap-4 mt-1 text-xs font-medium text-gray-500">
                    <span className="flex items-center gap-1">
                        <CalendarIcon /> Expiry: {new Date(reminder.expiryDate).toLocaleDateString()}
                    </span>
                </div>
            </div>
            <div className="flex flex-col items-end gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold text-white shadow-sm ${styles.badge}`}>
                    {label}
                </span>
                {status === 'expired' && (
                    <Link href="/vet-locator" className="text-xs font-bold text-[#4A90E2] hover:underline flex items-center gap-1">
                        <LocationIcon /> Find Vet
                    </Link>
                )}
            </div>
        </div>
    );
};

// --- COMPONENT: PET SECTION ---
const PetSection = ({ pet, onUpdateClick }) => {
    const reminders = (pet.vaccinationHistory || []).map(vax => ({
        ...vax, ...getReminderStatus(vax.expiryDate)
    })).filter(r => r.status === 'expired' || r.status === 'upcoming')
      .sort((a, b) => a.days - b.days);

    const isHealthy = reminders.length === 0;

    return (
        <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-lg border border-white p-6 mb-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-100 to-purple-100 rounded-bl-full opacity-50 pointer-events-none"></div>
            <div className="flex flex-col md:flex-row md:items-center gap-6 mb-6 relative z-10">
                <div className="relative w-20 h-20 rounded-full border-4 border-white shadow-md overflow-hidden shrink-0">
                    <Image src={pet.imageUrls?.[0] || "/imgs/dog.jpg"} alt={pet.name} fill className="object-cover" />
                </div>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-extrabold text-gray-800">{pet.name}</h2>
                        {isHealthy ? (
                            <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full border border-green-200">✅ All Good</span>
                        ) : (
                            <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-full border border-red-200 animate-pulse">⚠️ {reminders.length} Attention Needed</span>
                        )}
                    </div>
                    <p className="text-gray-500 text-sm">{pet.breed} • {pet.age} Years Old</p>
                </div>
                <button 
                    onClick={() => onUpdateClick(pet._id, pet.name)}
                    className="px-5 py-2.5 bg-white border border-gray-200 text-[#333] rounded-xl font-bold text-sm hover:bg-[#4A90E2] hover:text-white hover:border-[#4A90E2] transition-all shadow-sm flex items-center gap-2 group"
                >
                    <UploadIcon className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" /> Update History
                </button>
            </div>
            <div className="space-y-1">
                {isHealthy ? (
                    <div className="p-6 bg-green-50/50 rounded-2xl border border-green-100 flex flex-col items-center justify-center text-center">
                        <CheckCircleIcon />
                        <p className="text-green-800 font-bold mt-2">Vaccinations Up-to-Date!</p>
                        <p className="text-green-600 text-xs">Great job keeping {pet.name} healthy.</p>
                    </div>
                ) : (
                    reminders.map((reminder, idx) => <ReminderCard key={idx} reminder={reminder} />)
                )}
            </div>
        </div>
    );
};

export default function RemindersPage() {
  const { user, loading: authLoading } = useAuth();
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadModal, setUploadModal] = useState({ isOpen: false, petId: null, petName: "" });
  const router = useRouter();

  const fetchPetReminders = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const timestamp = new Date().getTime();
      const res = await fetch(`/api/pet/user/${user.uid}?t=${timestamp}`, { cache: 'no-store' });
      if (res.ok) setPets(await res.json());
    } catch (error) { console.error("Error fetching pets:", error); } 
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) router.push("/Login");
    else if (user) fetchPetReminders();
  }, [authLoading, user, router, fetchPetReminders]);

  if (authLoading || loading) {
    return (
        <div className="min-h-screen bg-[#F4F7F9] flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 border-4 border-[#4A90E2] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[#4A90E2] font-bold animate-pulse">Checking Health Records...</p>
        </div>
    );
  }

  if (pets.length === 0) {
    return (
      <div className="min-h-screen bg-[#F4F7F9] p-8 flex flex-col items-center justify-center text-center">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md">
            <div className="text-6xl mb-4">🐾</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">No Pets Found</h2>
            <p className="text-gray-500 mb-6">Add your first pet to start tracking their vaccinations.</p>
            <Link href="/Addpet" className="bg-[#4A90E2] text-white px-6 py-3 rounded-xl font-bold hover:scale-105 transition-transform">Add a Pet</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F7F9] p-4 md:p-10 pb-24">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-end mb-8 border-b-2 border-gray-200 pb-4 gap-4">
            <div>
                <h1 className="text-4xl font-extrabold text-[#333333] mb-2">Health Dashboard</h1>
                <p className="text-gray-500 font-medium">Track vaccinations and upcoming vet visits.</p>
            </div>
            <Link href="/vet-locator" className="bg-white text-[#4A90E2] border-2 border-[#4A90E2] px-6 py-2 rounded-xl font-bold hover:bg-[#4A90E2] hover:text-white transition-colors shadow-sm flex items-center gap-2">
                <LocationIcon /> Find Vet Nearby
            </Link>
        </div>
        
        <div className="space-y-6">
          {pets.map((pet) => (
            <PetSection 
                key={pet._id} 
                pet={pet} 
                onUpdateClick={(id, name) => setUploadModal({ isOpen: true, petId: id, petName: name })} 
            />
          ))}
        </div>

        <UploadModal 
            isOpen={uploadModal.isOpen} 
            petId={uploadModal.petId} 
            petName={uploadModal.petName} 
            onClose={() => setUploadModal({ ...uploadModal, isOpen: false })}
            onSuccess={fetchPetReminders}
        />
      </div>
    </div>
  );
}
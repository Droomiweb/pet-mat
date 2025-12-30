"use client";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../auth-provider";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

// --- ICONS ---
const SyringeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
    </svg>
);
const CalendarIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" />
    </svg>
);
const LocationIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
    </svg>
);
const CheckCircleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-12 h-12 text-green-500">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);
const UploadIcon = ({ className = "w-12 h-12 text-blue-400" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
);
const XIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);

// --- HELPER: DATE CALCULATIONS ---
const getReminderStatus = (expiryDate) => {
    const d = new Date(expiryDate);
    const expiry = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    if (isNaN(expiry.getTime())) return { status: 'unknown', days: 0, label: 'Unknown' };

    // Calculate difference in milliseconds
    const diffTime = expiry.getTime() - today.getTime();
    // Convert to days
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
    const [status, setStatus] = useState("idle");
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white/90 backdrop-blur-xl rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl border border-white/50 animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 px-6 py-5 border-b border-gray-100 flex justify-between items-center">
                    <div>
                        <h3 className="font-bold text-xl text-gray-800">Update Records</h3>
                        <p className="text-xs text-gray-500">For {petName}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors shadow-sm"><XIcon /></button>
                </div>

                {/* Body */}
                <div className="p-8 text-center">
                    {status === 'success' ? (
                        <div className="flex flex-col items-center animate-in slide-in-from-bottom-4 duration-500">
                            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4 shadow-inner">
                                <CheckCircleIcon />
                            </div>
                            <h4 className="text-2xl font-bold text-green-600 mb-2">Verified!</h4>
                            <p className="text-gray-600 text-sm font-medium bg-green-50 px-4 py-2 rounded-full inline-block">{statusMsg}</p>
                        </div>
                    ) : (
                        <>
                            {!preview ? (
                                <label className="flex flex-col items-center justify-center w-full h-56 border-3 border-dashed border-blue-200 rounded-[1.5rem] bg-blue-50/30 cursor-pointer hover:bg-blue-50 hover:border-blue-400 transition-all group">
                                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg mb-4 group-hover:-translate-y-2 transition-transform duration-300">
                                        <UploadIcon className="w-8 h-8 text-[#4A90E2]" />
                                    </div>
                                    <p className="text-base font-bold text-gray-700 group-hover:text-[#4A90E2] transition-colors">Upload Certificate</p>
                                    <p className="text-xs text-gray-400 mt-2">JPG, PNG supported</p>
                                    <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                                </label>
                            ) : (
                                <div className="relative w-full h-56 rounded-[1.5rem] overflow-hidden border-2 border-white shadow-lg mb-6 group">
                                    <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <button onClick={() => { setFile(null); setPreview(null) }} className="bg-white/20 backdrop-blur-md border border-white/50 px-4 py-2 rounded-full text-white font-bold text-sm hover:bg-red-500 hover:border-red-500 transition-all">Remove Image</button>
                                    </div>
                                </div>
                            )}

                            {/* Status or Button */}
                            {status === 'processing' ? (
                                <div className="mt-8 flex flex-col items-center gap-4">
                                    <div className="relative">
                                        <div className="w-12 h-12 border-4 border-[#4A90E2]/30 rounded-full"></div>
                                        <div className="absolute top-0 left-0 w-12 h-12 border-4 border-[#4A90E2] border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                    <p className="text-sm font-bold text-gray-500 animate-pulse">{statusMsg}</p>
                                </div>
                            ) : status === 'error' ? (
                                <div className="mt-6 p-4 bg-red-50 text-red-600 text-sm rounded-2xl font-medium border border-red-100 flex items-center gap-3 animate-in shake">
                                    <span className="text-xl">❌</span> {statusMsg}
                                </div>
                            ) : (
                                <button
                                    onClick={handleUpload}
                                    disabled={!file}
                                    className="w-full mt-8 bg-gradient-to-r from-[#4A90E2] to-[#50E3C2] text-white py-4 rounded-xl font-bold hover:shadow-lg hover:to-[#4A90E2] hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md text-lg tracking-wide"
                                >
                                    Verify with AI
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
        expired: {
            bg: 'bg-red-50/80',
            border: 'border-red-200',
            text: 'text-red-700',
            icon: 'bg-red-100 text-red-600',
            badge: 'bg-gradient-to-r from-red-500 to-red-600'
        },
        upcoming: {
            bg: 'bg-orange-50/80',
            border: 'border-orange-200',
            text: 'text-orange-700',
            icon: 'bg-orange-100 text-orange-600',
            badge: 'bg-gradient-to-r from-orange-400 to-orange-500'
        },
        good: {
            bg: 'bg-green-50/80',
            border: 'border-green-200',
            text: 'text-green-700',
            icon: 'bg-green-100 text-green-600',
            badge: 'bg-gradient-to-r from-green-400 to-green-500'
        },
        unknown: {
            bg: 'bg-gray-50/80',
            border: 'border-gray-200',
            text: 'text-gray-700',
            icon: 'bg-gray-100 text-gray-500',
            badge: 'bg-gray-400'
        }
    }[status] || styles.unknown;

    return (
        <div className={`relative p-5 rounded-2xl border ${styles.bg} ${styles.border} mb-4 transition-all hover:scale-[1.01] hover:shadow-md group backdrop-blur-sm`}>
            <div className="flex items-center gap-5">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${styles.icon} shadow-sm shrink-0 group-hover:rotate-12 transition-transform duration-300`}>
                    <SyringeIcon />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div>
                            <h4 className={`font-bold ${styles.text} text-lg truncate`}>{reminder.vaccineName}</h4>
                            <div className="flex items-center gap-2 mt-1 text-sm font-medium text-gray-500/80">
                                <CalendarIcon />
                                <span>Exp: {new Date(reminder.expiryDate).toLocaleDateString()}</span>
                            </div>
                        </div>

                        <div className="flex flex-row md:flex-col items-center md:items-end justify-between gap-3 md:gap-1">
                            <span className={`px-3 py-1 rounded-full text-[11px] font-bold text-white shadow-sm ${styles.badge} uppercase tracking-wider`}>
                                {label}
                            </span>
                            {status === 'expired' && (
                                <Link href="/vet-locator" className="text-xs font-bold text-[#4A90E2] hover:underline flex items-center gap-1 bg-white/50 px-2 py-1 rounded-lg">
                                    <LocationIcon /> Find Vet
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
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
        <div className="group relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-[#4A90E2] to-[#50E3C2] rounded-[2rem] opacity-30 blur group-hover:opacity-60 transition duration-500"></div>
            <div className="relative bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-xl p-6 md:p-8 overflow-hidden z-10 border border-white/60">
                {/* Decorative BG */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-blue-100/50 to-purple-100/50 rounded-bl-full -z-10"></div>

                <div className="flex flex-col md:flex-row gap-6 md:items-start mb-8">
                    <div className="relative w-24 h-24 md:w-28 md:h-28 rounded-[2rem] shadow-lg overflow-hidden shrink-0 border-4 border-white">
                        <Image src={pet.imageUrls?.[0] || "/imgs/dog.jpg"} alt={pet.name} fill className="object-cover group-hover:scale-110 transition-transform duration-700" />
                    </div>

                    <div className="flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div>
                                <h2 className="text-3xl font-extrabold text-[#333] mb-1">{pet.name}</h2>
                                <p className="text-gray-500 font-medium text-sm flex items-center gap-2">
                                    <span className="bg-gray-100 px-2 py-1 rounded-lg">{pet.breed}</span>
                                    <span>{pet.age} Years Old</span>
                                </p>
                            </div>

                            <div className="flex items-center gap-3">
                                {isHealthy ? (
                                    <span className="bg-green-100/80 text-green-700 text-xs font-bold px-3 py-1.5 rounded-full border border-green-200 shadow-sm flex items-center gap-1.5">
                                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                        All Good
                                    </span>
                                ) : (
                                    <span className="bg-red-100/80 text-red-700 text-xs font-bold px-3 py-1.5 rounded-full border border-red-200 shadow-sm flex items-center gap-1.5 animate-pulse">
                                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                        {reminders.length} Needs Attention
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="mt-6 flex flex-wrap gap-3">
                            <button
                                onClick={() => onUpdateClick(pet._id, pet.name)}
                                className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold text-sm hover:bg-[#4A90E2] hover:text-white hover:border-[#4A90E2] transition-all shadow-sm flex items-center gap-2 group/btn"
                            >
                                <UploadIcon className="w-4 h-4 text-gray-400 group-hover/btn:text-white transition-colors" />
                                Update History
                            </button>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest pl-2">Vaccination Status</h3>
                    {isHealthy ? (
                        <div className="p-8 bg-gradient-to-br from-green-50 to-green-100/50 rounded-[1.5rem] border border-green-200/50 flex flex-col items-center justify-center text-center">
                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                                <CheckCircleIcon />
                            </div>
                            <p className="text-green-800 font-bold text-lg">Fully Vaccinated!</p>
                            <p className="text-green-600/80 text-sm max-w-xs mt-1">Excellent job keeping {pet.name}'s immunizations up to date.</p>
                        </div>
                    ) : (
                        reminders.map((reminder, idx) => (
                            <ReminderCard key={idx} reminder={reminder} />
                        ))
                    )}
                </div>
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
            <div className="min-h-screen bg-[#E2F4EF] flex flex-col items-center justify-center gap-6 relative overflow-hidden">
                <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-purple-200/40 rounded-full blur-3xl"></div>
                <div className="absolute bottom-[-10%] left-[-5%] w-96 h-96 bg-blue-200/40 rounded-full blur-3xl"></div>
                <div className="w-20 h-20 border-8 border-[#4A90E2]/20 border-t-[#4A90E2] rounded-full animate-spin z-10"></div>
                <p className="text-[#4A90E2] font-bold animate-pulse z-10 text-lg">Fetching Records...</p>
            </div>
        );
    }

    if (pets.length === 0) {
        return (
            <div className="min-h-screen bg-[#E2F4EF] p-8 flex flex-col items-center justify-center text-center relative overflow-hidden">
                <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-purple-200/40 rounded-full blur-3xl"></div>
                <div className="absolute bottom-[-10%] left-[-5%] w-96 h-96 bg-blue-200/40 rounded-full blur-3xl"></div>

                <div className="bg-white/60 backdrop-blur-xl p-12 rounded-[3rem] shadow-xl max-w-lg border border-white/50 z-10 animate-in zoom-in duration-500">
                    <div className="text-7xl mb-6 bounce">🐾</div>
                    <h2 className="text-3xl font-extrabold text-gray-800 mb-4">No Pets Found</h2>
                    <p className="text-gray-500 mb-8 text-lg">Add your first pet to start tracking their health & vaccinations.</p>
                    <Link href="/Addpet" className="inline-block bg-[#4A90E2] text-white px-8 py-4 rounded-2xl font-bold hover:scale-105 transition-transform shadow-lg hover:shadow-[#4A90E2]/30">Add a Pet</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#E2F4EF] relative overflow-x-hidden">
            {/* Background Blobs */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-purple-200/30 rounded-full blur-3xl"></div>
                <div className="absolute bottom-[-10%] left-[-5%] w-96 h-96 bg-blue-200/30 rounded-full blur-3xl"></div>
            </div>

            <div className="relative z-10 max-w-5xl mx-auto px-4 md:px-8 pt-24 pb-24">
                {/* Header */}
                <div className="text-center mb-16 animate-in fade-in slide-in-from-top duration-700">
                    <span className="inline-block py-1 px-3 rounded-full bg-white/60 border border-white shadow-sm text-[#4A90E2] text-xs font-bold uppercase tracking-wider mb-4 backdrop-blur-md">
                        Health & Wellness
                    </span>
                    <h1 className="text-4xl md:text-5xl font-extrabold text-[#333] mb-4 tracking-tight">
                        Pet <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#4A90E2] to-[#50E3C2]">Health Dashboard</span>
                    </h1>
                    <p className="text-lg text-gray-500 max-w-2xl mx-auto">
                        Stay on top of vaccinations, checkups, and hygiene. AI-verified for your peace of mind.
                    </p>

                    <div className="mt-8">
                        <Link href="/vet-locator" className="inline-flex items-center gap-2 bg-white/80 backdrop-blur text-[#4A90E2] border-2 border-white px-6 py-3 rounded-2xl font-bold hover:bg-[#4A90E2] hover:text-white hover:border-[#4A90E2] transition-colors shadow-sm hover:shadow-lg">
                            <LocationIcon /> Find Vet Nearby
                        </Link>
                    </div>
                </div>

                <div className="space-y-10">
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
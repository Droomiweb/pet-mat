// app/Profile/page.js
"use client";
import { useState, useEffect, useCallback } from "react";
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
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>;
const LogoutIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" /></svg>;
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>;
const LocationIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>;

export default function Profile() {
  const { user, loading: authLoading, userData, signOut } = useAuth();
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmingPregnancy, setConfirmingPregnancy] = useState(null);
  const router = useRouter();

  // --- FETCH PETS ---
  const fetchUserPets = useCallback(async () => {
    if (user) {
      try {
        setLoading(true);
        const timestamp = new Date().getTime();
        const res = await fetch(`/api/pet/user/${user.uid}?t=${timestamp}`, {
          cache: "no-store",
          headers: { Pragma: "no-cache" },
        });

        if (res.ok) {
          const data = await res.json();
          setPets(data);
          router.refresh();
        }
      } catch (error) {
        console.error("Error fetching pets:", error);
      } finally {
        setLoading(false);
      }
    }
  }, [user, router]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/Login");
    } else if (user) {
      fetchUserPets();
    }
  }, [authLoading, user, router, fetchUserPets]);

  // --- HANDLERS ---
  const handleSignOut = async () => {
    await signOut();
    router.push("/Login");
  };

  const handleConfirmPregnancy = async (petId) => {
    if (!confirm(`Confirm pregnancy for this pet? This will start the Pregnancy Tracker.`)) return;

    setConfirmingPregnancy(petId);
    try {
      const res = await fetch("/api/pet/confirm-pregnancy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ petId, userId: user.uid }),
      });

      if (res.ok) {
        alert("Pregnancy confirmed! Redirecting...");
        router.push(`/pregnancy-tracker/${petId}`);
      } else {
        const data = await res.json();
        alert(`Failed: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      alert("Error confirming pregnancy");
    } finally {
      setConfirmingPregnancy(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#E2F4EF]">
        <div className="w-16 h-16 border-4 border-[#4A90E2] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[#4A90E2] font-bold mt-4 animate-pulse">Loading Profile...</p>
      </div>
    );
  }

  if (!user || !userData) return null;

  return (
    <div className="min-h-screen bg-[#E2F4EF] relative overflow-x-hidden pb-20">
      
      {/* Background Animation */}
      <div className="bg-animation">
        {[...Array(6)].map((_, i) => <div key={i} className="paw-print"></div>)}
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-24 md:pt-28">
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* --- LEFT: USER CARD (Sticky on Desktop) --- */}
          <div className="lg:w-1/3 flex-shrink-0 relative z-10">
            <div className="glass-panel p-8 rounded-[2.5rem] sticky top-28 text-center shadow-2xl border border-white/60 backdrop-blur-xl">
              
              <div className="relative w-32 h-32 mx-auto mb-6">
                <div className="absolute inset-0 bg-gradient-to-tr from-[#4A90E2] to-[#50E3C2] rounded-full animate-pulse opacity-20"></div>
                <Image
                  src={user.photoURL || "/imgs/profile.jpg"}
                  alt="Profile"
                  fill
                  className="rounded-full object-cover border-4 border-white shadow-lg"
                />
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
                    className="w-full flex items-center justify-center gap-2 bg-[#333333] text-white py-3 rounded-xl font-bold shadow-lg hover:scale-[1.02] transition-transform"
                >
                    <PlusIcon /> Add New Pet
                </button>
                
                <div className="grid grid-cols-2 gap-3">
                    <Link href="/forgot-password" className="flex items-center justify-center gap-2 bg-white text-gray-700 border border-gray-200 py-3 rounded-xl font-bold text-sm hover:bg-gray-50 transition">
                        <EditIcon /> Password
                    </Link>
                    <button onClick={handleSignOut} className="flex items-center justify-center gap-2 bg-red-50 text-red-600 border border-red-100 py-3 rounded-xl font-bold text-sm hover:bg-red-100 transition">
                        <LogoutIcon /> Sign Out
                    </button>
                </div>
              </div>

            </div>
          </div>

          {/* --- RIGHT: PETS LIST --- */}
          <div className="lg:w-2/3 relative z-10">
            <div className="flex justify-between items-end mb-6 px-2">
                <div>
                    <h2 className="text-3xl font-extrabold text-[#333333]">My Pets</h2>
                    <p className="text-gray-500 text-sm mt-1">Manage profiles, requests & health.</p>
                </div>
                <span className="bg-white px-3 py-1 rounded-full text-sm font-bold text-[#4A90E2] shadow-sm border border-gray-100">
                    {pets.length} Pets
                </span>
            </div>

            {pets.length > 0 ? (
              <div className="space-y-8">
                {pets.map((pet) => {
                  // --- LOGIC EXTRACTION ---
                  const isMated = pet.matingHistory?.some(req => req.status === "mated") || pet.outgoingRequests?.some(req => req.status === "mated");
                  const isIncoming = pet.isIncomingAdoption;
                  const completedReq = pet.adoptionRequests?.find(r => r.ownerConfirmedHandover && r.requesterConfirmedHandover);
                  const isLegacyAdopted = !pet.adoptionLog && pet.listingType === 'None' && completedReq;
                  
                  let effectivePet = pet;
                  if (isLegacyAdopted) {
                      effectivePet = {
                          ...pet,
                          adoptionLog: {
                              adoptionDate: new Date(),
                              newOwnerName: completedReq.requesterName,
                              previousOwnerName: "Previous Owner",
                              certificateId: `LEGACY-${pet._id}`
                          }
                      };
                  }
                  const showCertificate = (pet.adoptionLog || isLegacyAdopted) && !isIncoming;
                  // ------------------------

                  return (
                    <div 
                        key={pet._id} 
                        className={`group bg-white/90 backdrop-blur-md rounded-[2rem] p-6 md:p-8 shadow-lg border hover:shadow-2xl transition-all duration-300 relative overflow-hidden ${
                            isIncoming ? "border-purple-300 bg-purple-50/90" : "border-white"
                        }`}
                    >
                      {/* Decorative Background Element */}
                      <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-blue-50 to-purple-50 rounded-bl-full opacity-50 group-hover:scale-110 transition-transform duration-500"></div>

                      {/* --- PET HEADER --- */}
                      <div className="flex flex-col sm:flex-row gap-6 relative z-10">
                        <div className="relative shrink-0">
                            <div className="w-28 h-28 rounded-2xl overflow-hidden shadow-md border-4 border-white relative">
                                <Image src={pet.imageUrls[0] || "/imgs/dog.jpg"} alt={pet.name} fill className="object-cover" />
                            </div>
                            {/* Floating Type Icon */}
                            <div className="absolute -bottom-3 -right-3 bg-white p-2 rounded-full shadow-md text-xl border border-gray-100">
                                {pet.type === 'Dog' ? '🐶' : pet.type === 'Cat' ? '🐱' : '🐾'}
                            </div>
                        </div>

                        <div className="flex-1 pt-2">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                                <div>
                                    <h3 className="text-2xl font-extrabold text-gray-800 flex items-center gap-2">
                                        {pet.name}
                                        <span className={`text-xs px-2 py-1 rounded-md border font-bold uppercase tracking-wider ${pet.gender === 'Male' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-pink-50 text-pink-600 border-pink-200'}`}>
                                            {pet.gender}
                                        </span>
                                    </h3>
                                    <p className="text-gray-500 font-medium">{pet.breed}</p>
                                    <div className="flex gap-3 mt-2 text-sm text-gray-400">
                                        <span>{pet.age} Years Old</span>
                                        <span>•</span>
                                        <span className="capitalize">{pet.listingType} Listing</span>
                                    </div>
                                </div>
                                
                                {/* Status Badges */}
                                <div className="flex flex-col items-end gap-2">
                                    {!isIncoming && <PetStatusBadge status={pet.verificationStatus} />}
                                    {pet.isPregnant && (
                                        <span className="bg-pink-500 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-md animate-pulse">
                                            PREGNANT
                                        </span>
                                    )}
                                    {isIncoming && (
                                        <span className="bg-purple-600 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-md">
                                            INCOMING ADOPTION
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                      </div>

                      {/* --- ACTION GRID --- */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6 relative z-10">
                          {/* Primary Action: View/Edit */}
                          <Link 
                            href={`/pet/${pet._id}`}
                            className="flex items-center justify-center gap-2 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-[#4A90E2] hover:text-white hover:border-[#4A90E2] transition-colors"
                          >
                            <span>🔍</span> View Full Profile
                          </Link>

                          {/* Contextual Actions */}
                          {pet.isPregnant && (
                            <Link 
                                href={`/pregnancy-tracker/${pet._id}`} 
                                className="flex items-center justify-center gap-2 py-3 bg-pink-50 border border-pink-200 text-pink-600 rounded-xl font-bold hover:bg-pink-500 hover:text-white hover:border-pink-500 transition-colors"
                            >
                                <span>🤰</span> Track Pregnancy
                            </Link>
                          )}

                          {!pet.isPregnant && isMated && pet.gender === "Female" && !isIncoming && (
                             <button 
                                onClick={() => handleConfirmPregnancy(pet._id)} 
                                disabled={confirmingPregnancy === pet._id}
                                className="flex items-center justify-center gap-2 py-3 bg-blue-50 border border-blue-200 text-blue-600 rounded-xl font-bold hover:bg-blue-500 hover:text-white hover:border-blue-500 transition-colors"
                             >
                                <span>✅</span> {confirmingPregnancy === pet._id ? "Processing..." : "Confirm Pregnancy"}
                             </button>
                          )}
                      </div>

                      {/* --- CERTIFICATE SECTION --- */}
                      {showCertificate && (
                        <div className="mt-6 p-5 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl text-center relative z-10">
                            <h4 className="text-green-800 font-extrabold text-lg mb-1">🎉 Adoption Complete!</h4>
                            <p className="text-green-600 text-sm mb-4">Welcome home, {pet.name}.</p>
                            <div className="w-full sm:w-auto inline-block">
                                <DownloadCertificate pet={effectivePet} />
                            </div>
                        </div>
                      )}

                      {/* --- DYNAMIC REQUESTS SECTION --- */}
                      {/* This renders mating/adoption/handover requests cleanly */}
                      <div className="mt-6 space-y-4 relative z-10">
                          {!isIncoming && <RequestManager pet={pet} onUpdate={fetchUserPets} />}

                          {/* Mating Confirmations */}
                          {!isIncoming && pet.matingHistory?.map((req, idx) => (
                              ['accepted', 'ownerConfirmedMating', 'requesterConfirmedMating', 'mated'].includes(req.status) && 
                              <div key={idx} className="scale-95"><MatingConfirmation pet={pet} request={req} onUpdate={fetchUserPets} /></div>
                          ))}
                          {!isIncoming && pet.outgoingRequests?.map((req, idx) => (
                              req.requestType === "mating" && 
                              <div key={idx} className="scale-95"><MatingConfirmation pet={pet} request={req} onUpdate={fetchUserPets} /></div>
                          ))}

                          {/* Adoption Handovers */}
                          {!isIncoming && !isLegacyAdopted && pet.adoptionRequests?.map((req, idx) => (
                              (req.status === "approved" || req.status === 'confirmHandover') && !(req.ownerConfirmedHandover && req.requesterConfirmedHandover) &&
                              <div key={idx} className="scale-95"><AdoptionHandover pet={pet} request={req} onUpdate={fetchUserPets} isIncoming={false} /></div>
                          ))}

                          {isIncoming && pet.adoptionRequests?.map((req, idx) => (
                              <div key={idx} className="scale-95"><AdoptionHandover pet={pet} request={req} onUpdate={fetchUserPets} isIncoming={true} /></div>
                          ))}
                      </div>

                      {/* --- ALERTS --- */}
                      {["pending", "needs-review", "rejected"].includes(pet.verificationStatus) && !isIncoming && (
                          <div className={`mt-4 p-3 rounded-lg text-xs font-semibold border ${
                              pet.verificationStatus === 'rejected' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                          }`}>
                            ⚠️ Verification Status: {pet.verificationStatus.toUpperCase()}
                          </div>
                      )}

                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 bg-white/60 rounded-[2.5rem] border border-white shadow-sm text-center">
                <div className="text-6xl mb-4 grayscale opacity-50">🐾</div>
                <h3 className="text-xl font-bold text-gray-400">No pets found</h3>
                <p className="text-gray-400 text-sm mt-1">Your furry friends will appear here.</p>
                <button onClick={() => router.push("/Addpet")} className="mt-6 bg-[#4A90E2] text-white px-6 py-2 rounded-full font-bold hover:shadow-lg transition">
                    Add Your First Pet
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
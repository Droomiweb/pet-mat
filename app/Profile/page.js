// app/Profile/page.js
"use client";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../auth-provider";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

// --- IMPORTS ---
import PetStatusBadge from "../components/PetStatusBadge";
import RequestManager from "../components/RequestManager";
import MatingConfirmation from "../components/MatingConfirmation";
import AdoptionHandover from "../components/AdoptionHandover";
import DownloadCertificate from "../components/DownloadCertificate"; 

export default function Profile() {
  const { user, loading: authLoading, userData, signOut } = useAuth();
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmingPregnancy, setConfirmingPregnancy] = useState(null);
  const router = useRouter();

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
        } else {
          console.error(`Failed to fetch pets. Status: ${res.status}`);
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

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push("/Login");
    } catch (error) {
      console.error("Sign out error", error);
    }
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
    return <div className="flex justify-center items-center min-h-screen"><div className="loader">Loading...</div></div>;
  }

  if (!user || !userData) return null;

  return (
    <div className="container mx-auto p-4 pt-20">
      <div className="bg-white shadow-xl rounded-lg overflow-hidden md:max-w-4xl md:mx-auto">
        <div className="md:flex">
          {/* Left Sidebar */}
          <div className="md:w-1/3 p-6 bg-gray-50">
            <div className="flex flex-col items-center">
              <Image
                src={user.photoURL || "/imgs/profile.jpg"}
                alt="Profile"
                width={150}
                height={150}
                className="rounded-full border-4 border-gray-300"
              />
              <h2 className="text-2xl font-bold mt-4 text-gray-800">{userData.name}</h2>
              <p className="text-gray-600">@{userData.username}</p>
              <p className="text-gray-600 mt-2">{userData.phone}</p>
              <p className="text-gray-600 mt-1">{userData.location?.city || "Location not set"}</p>

              <Link href="/forgot-password" className="mt-6 w-full max-w-[200px] text-center btn-fancy-primary text-sm">
                Reset Password
              </Link>

              <button onClick={handleSignOut} className="mt-4 bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-full">
                Sign Out
              </button>
              <button onClick={() => router.push("/Addpet")} className="mt-4 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-full">
                Add New Pet
              </button>
            </div>
          </div>

          {/* Right Content: Pets */}
          <div className="md:w-2/3 p-6">
            <h3 className="text-3xl font-bold text-gray-800 mb-6">My Pets</h3>
            {pets.length > 0 ? (
              <div className="space-y-6">
                {pets.map((pet) => {
                  const isMated = pet.matingHistory?.some(req => req.status === "mated") || 
                                  pet.outgoingRequests?.some(req => req.status === "mated");
                  
                  const isIncoming = pet.isIncomingAdoption;

                  // --- LEGACY ADOPTION LOGIC (FIXED) ---
                  // Check if adoption is technically complete (flags are true) but log is missing
                  const completedReq = pet.adoptionRequests?.find(r => r.ownerConfirmedHandover && r.requesterConfirmedHandover);
                  const isLegacyAdopted = !pet.adoptionLog && pet.listingType === 'None' && completedReq;

                  // Prepare pet object for certificate (Use real log OR generate fake one for legacy)
                  let effectivePet = pet;
                  if (isLegacyAdopted) {
                      effectivePet = {
                          ...pet,
                          adoptionLog: {
                              adoptionDate: new Date(), // Fallback date
                              newOwnerName: completedReq.requesterName,
                              previousOwnerName: "Previous Owner", // Fallback name
                              certificateId: `LEGACY-${pet._id}`
                          }
                      };
                  }
                  
                  // Show certificate if: (Has real log OR is legacy adopted) AND (Not currently incoming process)
                  const showCertificate = (pet.adoptionLog || isLegacyAdopted) && !isIncoming;
                  // -------------------------------------

                  return (
                    <div key={pet._id} className={`p-4 rounded-lg shadow-md border ${isIncoming ? "bg-purple-50 border-purple-200" : pet.isPregnant ? "bg-pink-50 border-pink-200" : "bg-gray-50 border-gray-200"}`}>
                      
                      {isIncoming && (
                        <span className="bg-purple-600 text-white text-xs font-bold px-2 py-1 rounded mb-2 inline-block">
                          INCOMING ADOPTION
                        </span>
                      )}

                      <div className="flex items-center mb-4">
                        <Image src={pet.imageUrls[0] || "/imgs/dog.jpg"} alt={pet.name} width={100} height={100} className="rounded-lg object-cover" />
                        <div className="ml-4">
                          <h4 className="text-2xl font-semibold text-gray-900 flex items-center">
                            {pet.name}
                            {!isIncoming && <PetStatusBadge status={pet.verificationStatus} />}
                            {pet.isPregnant && <span className="ml-2 px-2 py-1 bg-pink-500 text-white text-xs font-bold rounded-full animate-pulse">PREGNANT</span>}
                          </h4>
                          <p className="text-gray-600">{pet.type} | {pet.breed} | {pet.age} years</p>
                          {!isIncoming && <p className="text-sm text-gray-500 capitalize">Listing: {pet.listingType}</p>}
                        </div>
                      </div>

                      {/* --- CERTIFICATE BUTTON --- */}
                      {showCertificate && (
                        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                            <p className="text-green-800 font-bold text-sm mb-2 text-center">🎉 Adoption Complete</p>
                            <DownloadCertificate pet={effectivePet} />
                        </div>
                      )}

                      {/* --- PREGNANT / MATING ACTIONS --- */}
                      {pet.isPregnant && (
                        <Link href={`/pregnancy-tracker/${pet._id}`} className="block w-full text-center bg-pink-500 hover:bg-pink-600 text-white font-bold py-3 px-4 rounded-xl mb-4 shadow-md transition">
                          View Pregnancy Day-by-Day Tracker
                        </Link>
                      )}

                      {!pet.isPregnant && isMated && pet.gender === "Female" && !isIncoming && (
                          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl text-center">
                            <p className="text-blue-800 font-semibold mb-2">Mating is confirmed. Is {pet.name} pregnant?</p>
                            <button onClick={() => handleConfirmPregnancy(pet._id)} disabled={confirmingPregnancy === pet._id} className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded-lg shadow-sm transition disabled:opacity-50">
                              {confirmingPregnancy === pet._id ? "Generating..." : "Confirm Pregnancy ✅"}
                            </button>
                          </div>
                      )}

                      {/* --- STATUS MESSAGES --- */}
                      {["pending", "needs-review", "rejected"].includes(pet.verificationStatus) && !isIncoming && (
                          <div className="p-3 my-2 text-sm bg-yellow-100 border border-yellow-300 rounded-md">
                            <strong>Verification Status: </strong>
                            {pet.verificationStatus === "pending" && "Your pet's certificate is being reviewed by our AI."}
                            {pet.verificationStatus === "needs-review" && "Our AI couldn't verify all details. An admin will review soon."}
                            {pet.verificationStatus === "rejected" && "Verification rejected. Please re-upload certificate."}
                          </div>
                      )}

                      {!isIncoming && <RequestManager pet={pet} onUpdate={fetchUserPets} />}

                      {/* --- MATING CONFIRMATIONS --- */}
                      {!isIncoming && pet.matingHistory?.map((req, idx) => (
                          ['accepted', 'ownerConfirmedMating', 'requesterConfirmedMating', 'mated'].includes(req.status) && 
                          <MatingConfirmation key={req._id || idx} pet={pet} request={req} onUpdate={fetchUserPets} />
                      ))}
                      {!isIncoming && pet.outgoingRequests?.map((req, idx) => (
                          req.requestType === "mating" && 
                          <MatingConfirmation key={req._id || idx} pet={pet} request={req} onUpdate={fetchUserPets} />
                      ))}

                      {/* --- ADOPTION HANDOVER --- */}
                      {/* FIX: Hide handover if adoption is already complete (including legacy) */}
                      {!isIncoming && !isLegacyAdopted && pet.adoptionRequests?.map((req, idx) => (
                          (req.status === "approved" || req.status === 'confirmHandover') && !(req.ownerConfirmedHandover && req.requesterConfirmedHandover) &&
                          <AdoptionHandover key={`handover-owner-${idx}`} pet={pet} request={req} onUpdate={fetchUserPets} isIncoming={false} />
                      ))}

                      {isIncoming && pet.adoptionRequests?.map((req, idx) => (
                          <AdoptionHandover key={`handover-req-${idx}`} pet={pet} request={req} onUpdate={fetchUserPets} isIncoming={true} />
                      ))}

                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-600">You haven't added any pets yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
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

export default function Profile() {
  const { user, loading: authLoading, userData, signOut } = useAuth();
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmingPregnancy, setConfirmingPregnancy] = useState(null); // Stores pet ID being confirmed
  const router = useRouter();

  const fetchUserPets = useCallback(async () => {
    if (user) {
      try {
        setLoading(true);
        const timestamp = new Date().getTime();
        const res = await fetch(`/api/pet/user/${user.uid}?t=${timestamp}`, { 
            cache: 'no-store',
            headers: { 'Pragma': 'no-cache' }
        });
        
        if (res.ok) {
          const data = await res.json();
          setPets(data);
          router.refresh();
        } else {
          console.error(`Failed to fetch pets. Status: ${res.status} ${res.statusText}`);
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

  // --- NEW: HANDLE CONFIRM PREGNANCY ---
  const handleConfirmPregnancy = async (petId) => {
    if(!confirm(`Are you sure you want to confirm pregnancy for this pet?\nThis will switch their profile to 'Pregnancy Mode' and generate a daily care plan.`)) return;
    
    setConfirmingPregnancy(petId);
    try {
        const res = await fetch('/api/pet/confirm-pregnancy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ petId, userId: user.uid })
        });
        
        if(res.ok) {
            alert("Pregnancy confirmed! Redirecting to care tracker...");
            router.push(`/pregnancy-tracker/${petId}`);
        } else {
            alert("Failed to confirm pregnancy.");
        }
    } catch(err) {
        console.error(err);
        alert("Error confirming pregnancy");
    } finally {
        setConfirmingPregnancy(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="loader">Loading...</div>
      </div>
    );
  }

  if (!user || !userData) {
    return null; 
  }

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
                  // Check if this pet has a "mated" status in history
                  const isMated = pet.matingHistory?.some(req => req.status === 'mated');
                  
                  return (
                    <div key={pet._id} className={`p-4 rounded-lg shadow-md border ${pet.isPregnant ? 'bg-pink-50 border-pink-200' : 'bg-gray-50 border-gray-200'}`}>
                      <div className="flex items-center mb-4">
                        <Image
                          src={pet.imageUrls[0] || "/imgs/dog.jpg"}
                          alt={pet.name}
                          width={100}
                          height={100}
                          className="rounded-lg object-cover"
                        />
                        <div className="ml-4">
                          <h4 className="text-2xl font-semibold text-gray-900 flex items-center">
                            {pet.name}
                            <PetStatusBadge status={pet.verificationStatus} />
                            {pet.isPregnant && (
                                <span className="ml-2 px-2 py-1 bg-pink-500 text-white text-xs font-bold rounded-full animate-pulse">PREGNANT</span>
                            )}
                          </h4>
                          <p className="text-gray-600">{pet.type} | {pet.breed} | {pet.age} years</p>
                          <p className="text-sm text-gray-500 capitalize">Listing: {pet.listingType}</p>
                        </div>
                      </div>

                      {/* --- NEW: BUTTONS FOR PREGNANCY WORKFLOW --- */}
                      
                      {/* 1. Pregnant: Show Tracker Link */}
                      {pet.isPregnant && (
                          <Link 
                            href={`/pregnancy-tracker/${pet._id}`}
                            className="block w-full text-center bg-pink-500 hover:bg-pink-600 text-white font-bold py-3 px-4 rounded-xl mb-4 shadow-md transition"
                          >
                            View Pregnancy Day-by-Day Tracker
                          </Link>
                      )}

                      {/* 2. Mated BUT Not Pregnant yet (Female Owner Only): Show Confirm Button */}
                      {!pet.isPregnant && isMated && pet.gender === 'Female' && (
                          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl text-center">
                              <p className="text-blue-800 font-semibold mb-2">Mating is confirmed. Is {pet.name} pregnant?</p>
                              <button 
                                onClick={() => handleConfirmPregnancy(pet._id)}
                                disabled={confirmingPregnancy === pet._id}
                                className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded-lg shadow-sm transition disabled:opacity-50"
                              >
                                {confirmingPregnancy === pet._id ? "Generating Care Plan..." : "Confirm Pregnancy ✅"}
                              </button>
                          </div>
                      )}

                      {/* Verification Status Messages */}
                      {['pending', 'needs-review', 'rejected'].includes(pet.verificationStatus) && (
                        <div className="p-3 my-2 text-sm bg-yellow-100 border border-yellow-300 rounded-md">
                          <strong>Verification Status: </strong>
                          {pet.verificationStatus === 'pending' && "Your pet's certificate is being reviewed by our AI."}
                          {pet.verificationStatus === 'needs-review' && "Our AI couldn't verify all details. An admin will review your pet's certificate soon."}
                          {pet.verificationStatus === 'rejected' && "This pet's verification was rejected. Please check your certificate and try re-uploading."}
                        </div>
                      )}

                      {/* Request Manager */}
                      <RequestManager pet={pet} onUpdate={fetchUserPets} />

                      {/* Mating Confirmations */}
                      {pet.matingHistory && pet.matingHistory.map((request, index) => {
                        if (['accepted', 'ownerConfirmedMating', 'requesterConfirmedMating', 'mated'].includes(request.status)) {
                          return (
                            <MatingConfirmation
                              key={request._id || `inc-${index}`}
                              pet={pet}
                              request={request}
                              onUpdate={fetchUserPets}
                            />
                          );
                        }
                        return null;
                      })}

                      {/* Outgoing Requests */}
                      {pet.outgoingRequests && pet.outgoingRequests.map((request, index) => (
                            <MatingConfirmation
                              key={request._id || `out-${index}`}
                              pet={pet}
                              request={request}
                              onUpdate={fetchUserPets}
                            />
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
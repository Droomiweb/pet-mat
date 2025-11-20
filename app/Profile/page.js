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
  const router = useRouter();

  // (fetchUserPets and useEffect remains the same)

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
          <div className="md:w-1/3 p-6 bg-gray-50">
            <div className="flex flex-col items-center">
              <Image
                src={user.photoURL || "/imgs/profile.jpg"}
                alt="Profile"
                width={150}
                height={150}
                className="rounded-full border-4 border-gray-300"
              />
              <h2 className="text-2xl font-bold mt-4 text-gray-800">
                {userData.name}
              </h2>
              <p className="text-gray-600">@{userData.username}</p>
              <p className="text-gray-600 mt-2">{userData.phone}</p>
              <p className="text-gray-600 mt-1">{userData.location?.city || "Location not set"}</p>
              
              {/* --- UPDATED: Beautiful Reset Password Button --- */}
              {/* Using btn-fancy-primary defined in globals.css */}
              <Link
                href="/forgot-password"
                className="mt-6 w-full max-w-[200px] text-center btn-fancy-primary text-sm"
              >
                Reset Password
              </Link>
              {/* --- END UPDATED --- */}
              
              <button
                onClick={handleSignOut}
                className="mt-4 bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-full"
              >
                Sign Out
              </button>
              <button
                onClick={() => router.push("/Addpet")}
                className="mt-4 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-full"
              >
                Add New Pet
              </button>
            </div>
          </div>

          <div className="md:w-2/3 p-6">
            <h3 className="text-3xl font-bold text-gray-800 mb-6">My Pets</h3>
            {pets.length > 0 ? (
              <div className="space-y-6">
                {pets.map((pet) => (
                  <div
                    key={pet._id}
                    className="p-4 bg-gray-50 rounded-lg shadow-md border border-gray-200"
                  >
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
                        </h4>
                        <p className="text-gray-600">
                          {pet.type} | {pet.breed} | {pet.age} years old
                        </p>
                        <p className="text-sm text-gray-500 capitalize">
                          Listing: {pet.listingType}
                        </p>
                      </div>
                    </div>

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

                    {/* 1. INCOMING REQUESTS (As Owner) */}
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

                    {/* 2. OUTGOING REQUESTS (As Requester) */}
                    {pet.outgoingRequests && pet.outgoingRequests.map((request, index) => (
                          <MatingConfirmation
                            key={request._id || `out-${index}`}
                            pet={pet}
                            request={request}
                            onUpdate={fetchUserPets}
                          />
                    ))}
                    
                  </div>
                ))}
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
// app/messages/page.js
"use client";
import { useEffect, useState } from "react";
import { db } from "../lib/firebase"; // Import db for Firestore
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { useAuth } from "../auth-provider"; // ✅ Use the auth hook for reliable user data
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function MessagesPage() {
  const [myPets, setMyPets] = useState([]); // Pets owned by user (for requests)
  const [conversations, setConversations] = useState([]); // Active chats (Firestore)
  
  // We manage a local loading state that starts true
  const [dataLoading, setDataLoading] = useState(true); 
  
  const router = useRouter();
  // ✅ Get user from the hook. This ensures we wait for Firebase to initialize.
  const { user, loading: authLoading } = useAuth(); 

  useEffect(() => {
    // 1. Wait for Auth to finish loading
    if (authLoading) return;
    
    // 2. If not logged in, redirect
    if (!user) {
      router.push("/Login");
      return;
    }

    // 3. Fetch My Pets (MongoDB) - To show pending REQUESTS
    const fetchMyPetsRequests = async () => {
      try {
        const res = await fetch(`/api/pet/user/${user.uid}`);
        if (res.ok) {
          const data = await res.json();
          setMyPets(data);
        }
      } catch (err) {
        console.error("Error fetching pets:", err);
      }
    };

    fetchMyPetsRequests();

    // 4. Fetch Conversations (Firestore) - To show ACTIVE CHATS
    try {
        const q = query(
          collection(db, "conversations"),
          where("participants", "array-contains", user.uid),
          orderBy("updatedAt", "desc")
        );

        const unsubscribe = onSnapshot(q, async (snapshot) => {
          const chats = [];
          
          for (const doc of snapshot.docs) {
            const data = doc.data();
            const conversationId = doc.id; 
            const petId = data.petId || conversationId.split('_')[0];

            // Fetch Pet Details for the UI
            try {
                let petDetails = { name: 'Unknown Pet', image: '/imgs/dog.jpg' };
                if (petId && petId.length > 10) {
                    const res = await fetch(`/api/pet/${petId}`);
                    if(res.ok) {
                        const p = await res.json();
                        petDetails = { name: p.name, image: p.imageUrls?.[0] || '/imgs/dog.jpg' };
                    }
                }

                chats.push({
                  id: conversationId,
                  petId: petId,
                  petName: petDetails.name,
                  petImage: petDetails.image,
                  lastMessage: data.lastMessage || "Image/Start of chat",
                  timestamp: data.updatedAt ? data.updatedAt.toDate() : new Date()
                });
            } catch (e) {
                console.error("Error fetching pet details", e);
            }
          }
          
          setConversations(chats);
          setDataLoading(false); // ✅ Turn off loading on success
        }, (error) => {
            // ✅ ERROR HANDLER: If index is missing, this runs
            console.error("Firestore Error:", error);
            alert("Database Error: Please check the console for a link to create the required index.");
            setDataLoading(false); // ✅ Turn off loading even on error
        });

        return () => unsubscribe();
    } catch (err) {
        console.error("Setup Error:", err);
        setDataLoading(false);
    }

  }, [user, authLoading, router]); // Dependencies updated
  
  // Combined loading state
  if (authLoading || dataLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-[#F4F7F9]">
        <div className="text-[#4A90E2] text-xl font-bold animate-pulse">
            Loading your conversations...
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#F4F7F9] p-4 md:p-10">
      <div className="max-w-5xl mx-auto bg-white rounded-3xl shadow-2xl p-6 md:p-10 border-t-8 border-[#4A90E2]">
        <h1 className="text-3xl font-extrabold text-[#333333] mb-8 border-b pb-3 border-gray-100">
            Inbox & Requests
        </h1>

        {/* SECTION 1: PENDING REQUESTS */}
        <div className="mb-10">
            <h2 className="text-xl font-bold text-[#333333] mb-4 flex items-center">
                <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-sm mr-3 border border-yellow-200">
                    My Pet Requests
                </span>
            </h2>
            
            {myPets.filter(pet => 
                (pet.matingHistory?.some(r => r.status === 'pending')) || 
                (pet.adoptionRequests?.some(r => r.status === 'pending'))
            ).length > 0 ? (
                <div className="grid gap-4">
                    {myPets.map(pet => {
                        const matingPending = pet.matingHistory?.filter(r => r.status === 'pending').length || 0;
                        const adoptionPending = pet.adoptionRequests?.filter(r => r.status === 'pending').length || 0;
                        const totalPending = matingPending + adoptionPending;

                        if (totalPending === 0) return null;

                        return (
                            <div key={pet._id} className="border border-yellow-300 bg-yellow-50 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-center shadow-sm">
                                <div className="flex items-center gap-4 mb-3 sm:mb-0">
                                    <img src={pet.imageUrls?.[0]} alt={pet.name} className="w-12 h-12 rounded-full object-cover border-2 border-yellow-200" />
                                    <div>
                                        <h3 className="font-bold text-[#4A90E2] text-lg">{pet.name}</h3>
                                        <p className="text-sm text-gray-600">
                                            has <span className="font-bold text-red-500">{totalPending}</span> new request(s).
                                        </p>
                                    </div>
                                </div>
                                <Link href={`/pet/${pet._id}`} className="bg-[#4A90E2] text-white px-5 py-2 rounded-lg font-bold text-sm hover:bg-[#3A75B9] transition-colors shadow-md">
                                    Manage Requests
                                </Link>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <p className="text-gray-500 text-sm italic bg-gray-50 p-4 rounded-lg">No pending requests for your pets.</p>
            )}
        </div>

        {/* SECTION 2: ACTIVE CONVERSATIONS */}
        <div>
            <h2 className="text-xl font-bold text-[#333333] mb-4 flex items-center">
                 <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm mr-3 border border-blue-200">
                     Active Chats
                 </span>
            </h2>
            
            {conversations.length === 0 ? (
                <div className="text-center py-10 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                    <p className="text-[#333333] text-lg font-medium">No active chats yet.</p>
                    <p className="text-gray-500 text-sm mt-2">Chats appear here once a request is accepted and a message is sent.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {conversations.map((chat) => (
                        <Link href={`/messages/${chat.id}`} key={chat.id} className="block">
                            <div className="flex items-center bg-white border border-gray-200 p-4 rounded-xl shadow-sm hover:shadow-md hover:border-[#4A90E2] transition-all cursor-pointer group">
                                <img 
                                    src={chat.petImage} 
                                    alt={chat.petName} 
                                    className="w-16 h-16 rounded-full object-cover border-2 border-gray-100 mr-4 group-hover:border-[#4A90E2] transition-colors"
                                />
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-center mb-1">
                                        <h3 className="font-bold text-lg text-[#333333] truncate">
                                            {chat.petName}
                                        </h3>
                                        <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
                                            {chat.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        </span>
                                    </div>
                                    <p className="text-gray-600 text-sm truncate pr-4">
                                        {chat.lastMessage}
                                    </p>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>

      </div>
    </div>
  );
}
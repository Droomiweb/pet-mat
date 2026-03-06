// app/messages/page.js
"use client";
import { useEffect, useState } from "react";
import { db } from "../lib/firebase";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { useAuth } from "../auth-provider";
import { useRouter } from "next/navigation";
import Link from "next/link";

// --- ICONS ---
const TrashIcon = () => (
  <svg className="w-5 h-5 text-red-500 hover:text-red-700 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
);
const CheckIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
);
const XIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
);
const ChatIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.159 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" /></svg>;
const ChevronRightIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>;


export default function MessagesPage() {
  const [activeTab, setActiveTab] = useState("messages"); // 'messages' | 'requests'
  const [myPets, setMyPets] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [allRequests, setAllRequests] = useState([]); // Flattened list of requests

  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/Login");
      return;
    }

    // 1. Fetch My Pets & Requests
    const fetchMyPetsRequests = async () => {
      try {
        const timestamp = new Date().getTime();
        const res = await fetch(`/api/pet/user/${user.uid}?t=${timestamp}`, {
          cache: 'no-store', headers: { 'Pragma': 'no-cache' }
        });
        if (res.ok) {
          const pets = await res.json();
          setMyPets(pets);

          // Flatten requests for easy display
          const flatRequests = [];
          pets.forEach(pet => {
            // Mating Requests
            if (pet.matingHistory) {
              pet.matingHistory.forEach(req => {
                flatRequests.push({ ...req, type: 'mating', petId: pet._id, petName: pet.name, ownerId: pet.ownerId });
              });
            }
            // Adoption Requests
            if (pet.adoptionRequests) {
              pet.adoptionRequests.forEach(req => {
                flatRequests.push({ ...req, type: 'adoption', petId: pet._id, petName: pet.name, ownerId: pet.ownerId });
              });
            }
          });
          // Sort by date (newest first)
          flatRequests.sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));
          setAllRequests(flatRequests);
        }
      } catch (err) { console.error("Error fetching pets:", err); }
    };
    fetchMyPetsRequests();

    // 2. Real-time Listen for Conversations
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

          // Unread check
          const myUnread = data.unreadCounts && data.unreadCounts[user.uid];
          const unreadCount = typeof myUnread === 'number' ? myUnread : 0;

          let petDetails = { name: 'Loading...', image: '/imgs/dog.jpg' };

          if (petId && petId.length > 10) {
            try {
              const res = await fetch(`/api/pet/${petId}`);
              if (res.ok) {
                const p = await res.json();
                petDetails = { name: p.name, image: p.imageUrls?.[0] || '/imgs/dog.jpg' };
              } else {
                petDetails = { name: 'Pet Unavailable', image: '/imgs/dog.jpg' };
              }
            } catch (e) { }
          }

          chats.push({
            id: conversationId,
            petId: petId,
            petName: petDetails.name,
            petImage: petDetails.image,
            lastMessage: (data.lastMessage || "Start of conversation").replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1"),
            timestamp: data.updatedAt ? data.updatedAt.toDate() : new Date(),
            unreadCount: unreadCount,
            otherUserName: data.participants.find(id => id !== user.uid) || "User" // Simplified
          });
        }

        setConversations(chats);
        setDataLoading(false);
      });

      return () => unsubscribe();
    } catch (err) {
      console.error("Setup Error:", err);
      setDataLoading(false);
    }

  }, [user, authLoading, router]);

  // --- ACTIONS ---

  const handleDeleteChat = async (conversationId) => {
    if (!confirm("Are you sure you want to delete this chat? This cannot be undone.")) return;

    try {
      const res = await fetch(`/api/chat?conversationId=${conversationId}&userId=${user.uid}`, {
        method: "DELETE"
      });
      if (res.ok) {
        // Optimistically remove from UI (Snapshot will eventually update, but this is faster feedback)
        // setConversations(prev => prev.filter(c => c.id !== conversationId)); 
        alert("Conversation deleted.");
      } else {
        alert("Failed to delete chat.");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting chat.");
    }
  };

  const handleRequestAction = async (request, action) => {
    // action: 'accepted' | 'rejected' | 'approved' | 'confirmHandover'
    // Map 'accepted'/'rejected' for Mating, 'approved'/'rejected' for Adoption

    let statusToSend = action;
    if (request.type === 'adoption' && action === 'accepted') statusToSend = 'approved';

    try {
      const res = await fetch("/api/pet/requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerId: user.uid,
          petId: request.petId,
          requestId: request._id,
          requestType: request.type, // 'mating' or 'adoption'
          newStatus: statusToSend,
          requesterId: request.requesterId
        })
      });

      if (res.ok) {
        alert(`Request ${statusToSend}!`);
        // Update UI locally
        setAllRequests(prev => prev.map(req => {
          if (req._id === request._id) return { ...req, status: statusToSend };
          return req;
        }));
      } else {
        const errorData = await res.json();
        alert(`Failed: ${errorData.error}`);
      }
    } catch (err) {
      console.error(err);
      alert("Error updating request.");
    }
  };

  if (authLoading || dataLoading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-[#E2F4EF]">
        <div className="w-12 h-12 border-4 border-[#4A90E2] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-[#4A90E2] font-bold animate-pulse">Loading inbox...</p>
      </div>
    );
  }

  if (!user) return null;

  const pendingCount = allRequests.filter(r => r.status === 'pending').length;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 font-sans">

      {/* Background Decor */}
      <div className="hidden md:block fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-purple-200/30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-10%] left-[-5%] w-96 h-96 bg-blue-200/30 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 md:px-8 pt-20 md:pt-28">

        <h1 className="text-3xl md:text-4xl font-black text-[#333333] mb-8">Inbox</h1>

        {/* --- TABS --- */}
        <div className="flex bg-white rounded-2xl p-1 shadow-sm mb-8 w-max mx-auto md:mx-0 border border-gray-100">
          <button
            onClick={() => setActiveTab("messages")}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "messages" ? "bg-gray-900 text-white shadow-md" : "text-gray-500 hover:bg-gray-50"}`}
          >
            Messages
          </button>
          <button
            onClick={() => setActiveTab("requests")}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === "requests" ? "bg-gray-900 text-white shadow-md" : "text-gray-500 hover:bg-gray-50"}`}
          >
            Requests
            {pendingCount > 0 && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${activeTab === "requests" ? "bg-red-500 text-white" : "bg-red-100 text-red-600"}`}>
                {pendingCount}
              </span>
            )}
          </button>
        </div>

        {/* --- CONTENT AREA --- */}
        <div className="min-h-[400px]">

          {/* 1. MESSAGES TAB */}
          {activeTab === "messages" && (
            conversations.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-[#4A90E2] mx-auto mb-4">
                  <ChatIcon />
                </div>
                <h3 className="text-lg font-bold text-gray-600">No messages yet</h3>
                <p className="text-gray-400 text-sm mt-2">Start a conversation from a pet's profile.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {conversations.map((chat) => (
                  <div key={chat.id} className="group relative bg-white p-4 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-all flex items-center justify-between">
                    <Link href={`/messages/${chat.id}`} className="flex-1 flex items-center gap-4 min-w-0">
                      <img
                        src={chat.petImage}
                        alt={chat.petName}
                        className="w-14 h-14 rounded-full object-cover bg-gray-100"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h3 className={`font-bold text-base truncate ${chat.unreadCount > 0 ? 'text-gray-900' : 'text-gray-700'}`}>
                            {chat.petName}
                          </h3>
                          <span className="text-xs text-gray-400">• {chat.timestamp.toLocaleDateString()}</span>
                        </div>
                        <p className={`text-sm truncate ${chat.unreadCount > 0 ? 'font-bold text-gray-900' : 'text-gray-500'}`}>
                          {chat.lastMessage}
                        </p>
                      </div>
                      {chat.unreadCount > 0 && (
                        <div className="ml-auto mr-4 w-6 h-6 bg-[#4A90E2] text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg shadow-blue-200">
                          {chat.unreadCount}
                        </div>
                      )}
                    </Link>

                    {/* Delete Button */}
                    <button
                      onClick={(e) => { e.preventDefault(); handleDeleteChat(chat.id); }}
                      className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                      title="Delete Chat"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                ))}
              </div>
            )
          )}

          {/* 2. REQUESTS TAB */}
          {activeTab === "requests" && (
            allRequests.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                <span className="text-4xl grayscale opacity-50">📭</span>
                <h3 className="text-lg font-bold text-gray-600 mt-4">No requests found</h3>
                <p className="text-gray-400 text-sm mt-2">Requests for mating or adoption will appear here.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {allRequests.map((req) => (
                  <div key={req._id} className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6 hover:shadow-md transition-all">

                    {/* Request Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${req.type === 'adoption' ? 'bg-purple-100 text-purple-600' : 'bg-pink-100 text-pink-600'}`}>
                          {req.type}
                        </span>
                        <span className="text-xs text-gray-400">
                          {req.timestamp ? new Date(req.timestamp).toLocaleDateString() : 'Recent'}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-gray-800 leading-snug mb-2">
                        {req.type === 'mating' && req.requesterPetId ? (
                          <>
                            <Link href={`/pet/${req.requesterPetId}`} className="text-blue-600 hover:underline">
                              {req.requesterPetName || "Unknown Pet"}
                            </Link>
                            <span> wants to mate with </span>
                          </>
                        ) : (
                          <>
                            <span className="text-blue-600">{req.requesterName}</span>
                            <span> wants to {req.type === 'adoption' ? 'adopt' : 'mate with'} </span>
                          </>
                        )}
                        <Link href={`/pet/${req.petId}`} className="underline decoration-wavy decoration-gray-300 hover:text-blue-600">
                          {req.petName}
                        </Link>
                      </h3>

                      {req.messageText && (
                        <div className="bg-gray-50 p-3 rounded-xl text-sm text-gray-600 italic border border-gray-100 relative">
                          <span className="absolute -top-2 left-4 text-2xl text-gray-200">"</span>
                          {req.messageText}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col justify-center gap-3 min-w-[140px]">
                      {req.status === 'pending' ? (
                        <>
                          <button
                            onClick={() => handleRequestAction(req, 'accepted')}
                            className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold text-sm shadow-lg hover:bg-green-600 transition-all flex items-center justify-center gap-2"
                          >
                            <CheckIcon /> Accept
                          </button>
                          <button
                            onClick={() => handleRequestAction(req, 'rejected')}
                            className="w-full py-3 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold text-sm hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all flex items-center justify-center gap-2"
                          >
                            <XIcon /> Decline
                          </button>
                        </>
                      ) : (
                        <div className={`py-3 px-4 rounded-xl font-bold text-center text-sm border ${req.status === 'accepted' || req.status === 'approved'
                          ? 'bg-green-50 text-green-700 border-green-100'
                          : req.status === 'rejected'
                            ? 'bg-red-50 text-red-600 border-red-100'
                            : 'bg-gray-100 text-gray-500 border-gray-200'
                          }`}>
                          {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                        </div>
                      )}
                    </div>

                  </div>
                ))}
              </div>
            )
          )}

        </div>

      </div>
    </div>
  );
}
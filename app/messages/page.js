// app/messages/page.js
"use client";
import { useEffect, useState } from "react";
import { db } from "../lib/firebase"; 
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { useAuth } from "../auth-provider"; 
import { useRouter } from "next/navigation";
import Link from "next/link";

// --- ICONS ---
const ChatIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.159 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" /></svg>;
const ChevronRightIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>;

export default function MessagesPage() {
  const [myPets, setMyPets] = useState([]); 
  const [conversations, setConversations] = useState([]); 
  const [dataLoading, setDataLoading] = useState(true); 
  
  const router = useRouter();
  const { user, loading: authLoading } = useAuth(); 

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/Login");
      return;
    }

    // 1. Fetch My Pets (for Request Section)
    const fetchMyPetsRequests = async () => {
      try {
        const timestamp = new Date().getTime();
        const res = await fetch(`/api/pet/user/${user.uid}?t=${timestamp}`, { 
            cache: 'no-store', headers: { 'Pragma': 'no-cache' }
        });
        if (res.ok) {
          const data = await res.json();
          setMyPets(data);
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
                    if(res.ok) {
                        const p = await res.json();
                        petDetails = { name: p.name, image: p.imageUrls?.[0] || '/imgs/dog.jpg' };
                    } else {
                        petDetails = { name: 'Pet Unavailable', image: '/imgs/dog.jpg' };
                    }
                } catch (e) {}
            }

            chats.push({
              id: conversationId,
              petId: petId,
              petName: petDetails.name,
              petImage: petDetails.image,
              lastMessage: data.lastMessage || "Start of conversation",
              timestamp: data.updatedAt ? data.updatedAt.toDate() : new Date(),
              unreadCount: unreadCount 
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
  
  if (authLoading || dataLoading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-[#E2F4EF]">
        <div className="w-12 h-12 border-4 border-[#4A90E2] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-[#4A90E2] font-bold animate-pulse">Loading messages...</p>
      </div>
    );
  }

  if (!user) return null;

  // --- HELPERS FOR REQUESTS ---
  const pendingRequestsPets = myPets.filter(pet => 
    (pet.matingHistory?.some(r => r.status === 'pending')) || 
    (pet.adoptionRequests?.some(r => r.status === 'pending'))
  );

  return (
    <div className="min-h-screen bg-[#E2F4EF] pb-24">
      
      {/* Decorative Background - Hidden on small mobile to save performance/space */}
      <div className="hidden md:block fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-purple-200/30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-10%] left-[-5%] w-96 h-96 bg-blue-200/30 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 md:px-8 pt-20 md:pt-28">
        
        {/* --- HEADER --- */}
        <div className="flex flex-col items-start justify-between mb-6 md:mb-8 gap-1">
            <h1 className="text-3xl md:text-4xl font-extrabold text-[#333333] flex items-center gap-3">
                Messages
            </h1>
            <p className="text-gray-500 font-medium text-sm md:text-base">
                Your chats and pending requests.
            </p>
        </div>

        {/* --- MAIN GRID --- */}
        {/* Stacks on mobile (grid-cols-1), splits on desktop (lg:grid-cols-3) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
            
            {/* --- SECTION 1: REQUESTS (Top on mobile, Left on desktop) --- */}
            <div className="lg:col-span-1 space-y-4">
                <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-5 shadow-lg border border-white/50">
                    <h2 className="text-lg font-bold text-[#333333] mb-4 flex items-center gap-2">
                        <span className="text-xl">🔔</span> Requests
                    </h2>
                    
                    {pendingRequestsPets.length > 0 ? (
                        <div className="space-y-3">
                            {pendingRequestsPets.map(pet => {
                                const matingPending = pet.matingHistory?.filter(r => r.status === 'pending').length || 0;
                                const adoptionPending = pet.adoptionRequests?.filter(r => r.status === 'pending').length || 0;
                                const totalPending = matingPending + adoptionPending;

                                if (totalPending === 0) return null;

                                return (
                                    <Link href={`/pet/${pet._id}`} key={pet._id} className="block">
                                        <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-2xl flex items-center justify-between hover:shadow-md transition-all active:scale-95 group">
                                            <div className="flex items-center gap-3">
                                                <img src={pet.imageUrls?.[0]} alt={pet.name} className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm" />
                                                <div>
                                                    <h3 className="font-bold text-gray-800 text-sm">{pet.name}</h3>
                                                    <p className="text-xs text-yellow-700 font-semibold">{totalPending} New Request(s)</p>
                                                </div>
                                            </div>
                                            <span className="text-yellow-400 group-hover:translate-x-1 transition-transform"><ChevronRightIcon /></span>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-6 opacity-60">
                            <p className="text-gray-400 text-sm">No new requests.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* --- SECTION 2: CHAT LIST (Bottom on mobile, Right on desktop) --- */}
            <div className="lg:col-span-2">
                <div className="bg-white/90 backdrop-blur-xl rounded-[2rem] p-1 shadow-xl border border-white/50 min-h-[400px] md:min-h-[500px]">
                    {conversations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full py-20 text-center px-4">
                            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-[#4A90E2] mb-4">
                                <ChatIcon />
                            </div>
                            <h3 className="text-lg font-bold text-gray-600">No messages yet</h3>
                            <p className="text-gray-400 text-sm mt-2">Start a conversation from a pet's profile.</p>
                        </div>
                    ) : (
                        <div className="flex flex-col pb-2">
                            {conversations.map((chat) => (
                                <Link href={`/messages/${chat.id}`} key={chat.id} className="group relative block">
                                    <div className={`flex items-center p-4 md:p-5 hover:bg-blue-50/50 rounded-[1.8rem] transition-all duration-300 active:bg-blue-100/50 border-b border-gray-50 last:border-0 ${chat.unreadCount > 0 ? 'bg-blue-50/30' : ''}`}>
                                        
                                        {/* Avatar */}
                                        <div className="relative shrink-0 mr-4">
                                            <div className="w-14 h-14 md:w-16 md:h-16 rounded-full p-1 bg-white shadow-sm group-hover:shadow-md transition-all">
                                                <img 
                                                    src={chat.petImage} 
                                                    alt={chat.petName} 
                                                    className="w-full h-full rounded-full object-cover"
                                                />
                                            </div>
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0 mr-2">
                                            <div className="flex justify-between items-baseline mb-1">
                                                <h3 className={`font-bold text-base md:text-lg truncate ${chat.unreadCount > 0 ? 'text-gray-900' : 'text-gray-800'} ${chat.petName === 'Pet Unavailable' ? 'text-red-400' : ''}`}>
                                                    {chat.petName}
                                                </h3>
                                                <span className={`text-[10px] md:text-xs font-medium whitespace-nowrap ml-2 ${chat.unreadCount > 0 ? 'text-[#4A90E2] font-bold' : 'text-gray-400'}`}>
                                                    {chat.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                </span>
                                            </div>
                                            <p className={`text-xs md:text-sm truncate leading-relaxed ${chat.unreadCount > 0 ? 'font-bold text-gray-900' : 'text-gray-500'}`}>
                                                {chat.lastMessage}
                                            </p>
                                        </div>

                                        {/* Unread Badge */}
                                        <div className="flex items-center justify-center w-6">
                                            {chat.unreadCount > 0 ? (
                                                <span className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-[#4A90E2] text-white text-[10px] md:text-xs font-bold flex items-center justify-center shadow-md animate-pulse">
                                                    {chat.unreadCount > 9 ? '9+' : chat.unreadCount}
                                                </span>
                                            ) : (
                                                <span className="text-gray-300 group-hover:text-[#4A90E2] transition-colors">
                                                    <ChevronRightIcon />
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>

        </div>
      </div>
    </div>
  );
}
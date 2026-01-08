"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { auth, db } from "../../../app/lib/firebase";
import { collection, query, orderBy, doc, updateDoc, onSnapshot, limit } from "firebase/firestore";
import Image from "next/image";

// --- ICONS ---
const PaperClipIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" /></svg>;
const SendIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" /></svg>;
const XMarkIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;
const ChevronLeftIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>;

// --- READ RECEIPT COMPONENT ---
const MessageStatus = ({ isRead }) => (
    <span className={`ml-1 -mb-0.5 ${isRead ? 'text-blue-200' : 'text-gray-300'} inline-block align-bottom`}>
        {/* Double Tick SVG */}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
            <path d="M17.293 6.293a1 1 0 0 1 1.414 1.414l-9 9a1 1 0 0 1-1.414 0l-4-4a1 1 0 1 1 1.414-1.414L9 14.586l8.293-8.293Z" />
            <path d="M21.707 6.293a1 1 0 0 1 0 1.414l-9 9a1 1 0 0 1-1.414 0l-1.293-1.293 1.414-1.414 1.293 1.293 8-8a1 1 0 0 1 1.414 0Z" />
        </svg>
    </span>
);

export default function ChatSessionPage() {
    const [pet, setPet] = useState(null);
    const [messages, setMessages] = useState([]);

    // Input State
    const [replyText, setReplyText] = useState("");
    const [mediaFile, setMediaFile] = useState(null);
    const [mediaPreview, setMediaPreview] = useState(null);

    // UI State
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);

    // --- NEW FEATURES STATE ---
    const [isTyping, setIsTyping] = useState(false);
    const [partnerTyping, setPartnerTyping] = useState(false);
    const typingTimeoutRef = useRef(null);

    const params = useParams();
    const router = useRouter();
    const user = auth.currentUser;

    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const conversationId = params.petId;

    // --- HELPER: Parse Text for Links & Markdown ---
    const renderTextWithLinks = (text, isSender) => {
        // Regex for markdown links: [Label](Url)
        const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;

        // Split by markdown links first
        const parts = [];
        let lastIndex = 0;
        let match;

        while ((match = markdownLinkRegex.exec(text)) !== null) {
            if (match.index > lastIndex) {
                parts.push({ type: 'text', content: text.slice(lastIndex, match.index) });
            }
            parts.push({ type: 'link', label: match[1], url: match[2] });
            lastIndex = markdownLinkRegex.lastIndex;
        }
        if (lastIndex < text.length) {
            parts.push({ type: 'text', content: text.slice(lastIndex) });
        }

        // Process each part (fallback for raw URLs in text parts)
        return parts.map((part, index) => {
            if (part.type === 'link') {
                return (
                    <a
                        key={index}
                        href={part.url}
                        // Internal links use router or standard navigation, external new tab.
                        // For simplicity, we stick to standard anchor behavior but no target=_blank for internal to avoid loss of context,
                        // unless it's a "popup" feel. Let's use standard anchor.
                        className={`underline font-bold ${isSender ? 'text-white hover:text-gray-200' : 'text-blue-600 hover:text-blue-800'}`}
                    >
                        {part.label}
                    </a>
                );
            } else {
                // Regex to find raw URLs (starts with http/https)
                const urlRegex = /(https?:\/\/[^\s]+)/g;
                return part.content.split(urlRegex).map((subPart, subIndex) => {
                    if (subPart.match(urlRegex)) {
                        return (
                            <a
                                key={`${index}-${subIndex}`}
                                href={subPart}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`underline font-bold break-all ${isSender ? 'text-white hover:text-gray-200' : 'text-blue-600 hover:text-blue-800'}`}
                            >
                                {subPart}
                            </a>
                        );
                    }
                    return subPart;
                });
            }
        });
    };

    // --- HANDLE REQUEST ACTIONS ---
    const handleRequestAction = async (requestId, status) => {
        if (!pet || !user) return;

        // Optimistic Update: Immediately update local state to hide buttons
        const previousPetState = { ...pet };
        
        let requesterIdToUpdate = null;
        const targetRequest = pet.matingHistory?.find(r => r._id === requestId);
        if (targetRequest) requesterIdToUpdate = targetRequest.requesterId;
        
        const updatedHistory = pet.matingHistory?.map(r => {
            if (r._id === requestId) return { ...r, status: status };
            // Also update duplicates from same requester
            if (requesterIdToUpdate && r.requesterId === requesterIdToUpdate && r.status === 'pending') {
                return { ...r, status: status };
            }
            return r;
        }) || [];

        setPet({ ...pet, matingHistory: updatedHistory });

        try {
            const res = await fetch('/api/pet/requests', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ownerId: user.uid,
                    petId: pet._id,
                    requestId: requestId,
                    requestType: 'mating', // Assuming mating for now based on context
                    newStatus: status,
                    requesterId: requesterIdToUpdate // Pass requesterId to help backend if needed
                })
            });
            if (res.ok) {
                fetchPetData(); // Refresh to hide button
            } else {
                setPet(previousPetState); // Revert on failure
                alert("Failed to update.");
            }
        } catch (e) { 
            console.error(e);
            setPet(previousPetState); // Revert on failure
        }
    };

    const getPendingRequest = () => {
        if (!pet || !user || !conversationId) return null;
        // Extract IDs from conversationId: petId_uid1_uid2
        const parts = conversationId.split('_');
        if (parts.length < 3) return null;

        const otherUid = parts[1] === user.uid ? parts[2] : parts[1];

        // Am I the owner?
        if (pet.ownerId !== user.uid) return null;

        // Look for pending request from otherUid
        return pet.matingHistory?.find(r => r.requesterId === otherUid && r.status === 'pending');
    };

    const pendingRequest = getPendingRequest();

    // --- 1. DATA FETCHING & LISTENERS ---

    const fetchPetData = useCallback(async () => {
        if (!conversationId) return;
        const petIdStr = conversationId.split("_")[0];
        if (!petIdStr) return;

        try {
            const timestamp = new Date().getTime();
            const res = await fetch(`/api/pet/${petIdStr}?t=${timestamp}`, {
                cache: 'no-store', headers: { 'Pragma': 'no-cache' }
            });
            if (!res.ok) return;
            const data = await res.json();
            setPet(data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [conversationId]);

    useEffect(() => {
        if (!user || !conversationId) return;

        // Request Notification Permission
        if ("Notification" in window && Notification.permission !== "granted") {
            Notification.requestPermission();
        }

        fetchPetData();

        // A. Listen to Messages & Mark as Read
        const q = query(
            collection(db, "conversations", conversationId, "messages"),
            orderBy("createdAt", "asc")
        );

        const unsubscribeMessages = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            setMessages(msgs);
            setLoading(false);

            // 1. Mark incoming unread messages as Read
            const unreadMsgs = snapshot.docs.filter(doc => {
                const data = doc.data();
                return data.senderId !== user.uid && !data.read;
            });

            if (unreadMsgs.length > 0) {
                unreadMsgs.forEach(docSnap => {
                    updateDoc(doc(db, "conversations", conversationId, "messages", docSnap.id), { read: true });
                });

                // Reset unread counter for ME
                updateDoc(doc(db, "conversations", conversationId), {
                    [`unreadCounts.${user.uid}`]: 0
                });
            }

            // 2. Trigger Browser Notification (if backgrounded)
            const lastMsg = msgs[msgs.length - 1];
            if (lastMsg && lastMsg.senderId !== user.uid && document.visibilityState === 'hidden') {
                const now = new Date().getTime();
                if (lastMsg.createdAt && (now - lastMsg.createdAt.toMillis()) < 2000) {
                    if (Notification.permission === "granted") {
                        new Notification(`New message from ${lastMsg.senderName}`, {
                            body: lastMsg.text || "Sent a photo",
                            icon: "/icon.svg"
                        });
                    }
                }
            }
        });

        // B. Listen to Conversation Doc (for Typing Status)
        const unsubscribeConv = onSnapshot(doc(db, "conversations", conversationId), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                const othersTyping = data.typing
                    ? Object.entries(data.typing).some(([uid, isTyping]) => uid !== user.uid && isTyping)
                    : false;
                setPartnerTyping(othersTyping);
            }
        });

        return () => {
            unsubscribeMessages();
            unsubscribeConv();
        };
    }, [conversationId, user, fetchPetData]);

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, partnerTyping, mediaPreview]);


    // --- 2. HANDLERS ---

    // Input Change with Typing Indicator Logic
    const handleInputChange = (e) => {
        setReplyText(e.target.value);

        if (!user || !conversationId) return;

        if (!isTyping) {
            setIsTyping(true);
            updateDoc(doc(db, "conversations", conversationId), {
                [`typing.${user.uid}`]: true
            });
        }

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

        typingTimeoutRef.current = setTimeout(() => {
            setIsTyping(false);
            updateDoc(doc(db, "conversations", conversationId), {
                [`typing.${user.uid}`]: false
            });
        }, 2000);
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            setMediaFile(file);
            setMediaPreview(URL.createObjectURL(file));
        }
    };

    const clearMedia = () => {
        setMediaFile(null);
        setMediaPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const fileToBase64 = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });

    const sendReply = async (e) => {
        e.preventDefault();
        if ((!replyText.trim() && !mediaFile) || sending || !user || !conversationId) return;

        setSending(true);

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        setIsTyping(false);
        updateDoc(doc(db, "conversations", conversationId), { [`typing.${user.uid}`]: false });

        const petId = conversationId.split("_")[0];

        try {
            let mediaBase64 = null;
            let mediaType = null;

            if (mediaFile) {
                mediaBase64 = await fileToBase64(mediaFile);
                mediaType = mediaFile.type;
            }

            const res = await fetch(`/api/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    petId: petId,
                    conversationId: conversationId,
                    senderId: user.uid,
                    senderName: user.displayName || user.email.split("@")[0],
                    text: replyText,
                    mediaBase64,
                    mediaType
                }),
            });

            if (res.ok) {
                setReplyText("");
                clearMedia();
            }
        } catch (err) {
            console.error(err);
            alert("Failed to send.");
        }
        finally {
            setSending(false);
        }
    };

    if (loading) {
        return (
            <div className="h-screen w-screen bg-[#F4F7F9] flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-[#4A90E2] border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 h-[100dvh] w-full bg-[#F4F7F9] z-50 flex flex-col">

            {/* --- HEADER --- */}
            <div className="bg-white/90 backdrop-blur-md border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm shrink-0 z-20 safe-area-top">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.push("/messages")}
                        className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600 active:bg-gray-200"
                    >
                        <ChevronLeftIcon />
                    </button>

                    <div className="relative">
                        {pet?.imageUrls?.[0] ? (
                            <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-200 shadow-sm">
                                <img src={pet.imageUrls[0]} alt="Pet" className="w-full h-full object-cover" />
                            </div>
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-lg">🐾</div>
                        )}
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                    </div>

                    <div className="flex flex-col">
                        <h1 className="font-bold text-gray-800 text-sm leading-tight">{pet?.name || "Unknown Pet"}</h1>
                        <p className="text-[10px] text-gray-500 font-medium flex items-center gap-1">
                            {partnerTyping ? (
                                <span className="text-[#4A90E2] font-bold animate-pulse">Typing...</span>
                            ) : (
                                pet?.breed || "Chat"
                            )}
                        </p>
                    </div>
                </div>
            </div>

            {/* --- PENDING REQUEST ACTION BAR --- */}
            {pendingRequest && (
                <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-3 flex items-center justify-between shrink-0">
                    <div className="text-sm text-yellow-800">
                        <span className="font-bold">Mating Request</span> from {pendingRequest.requesterPetName}
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => handleRequestAction(pendingRequest._id, 'rejected')} className="px-3 py-1 bg-white border border-yellow-300 text-yellow-700 rounded-lg text-xs font-bold shadow-sm">Reject</button>
                        <button onClick={() => handleRequestAction(pendingRequest._id, 'accepted')} className="px-3 py-1 bg-green-500 text-white rounded-lg text-xs font-bold shadow-sm">Accept</button>
                    </div>
                </div>
            )}

            {/* --- MESSAGES --- */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F4F7F9] scroll-smooth">
                {messages.map((msg) => {
                    const isSender = msg.senderId === user.uid;
                    const isSystem = msg.senderId === "system";

                    if (isSystem) {
                        return (
                            <div key={msg.id} className="flex justify-center my-4">
                                <div className="bg-green-100 text-green-800 border border-green-200 px-4 py-1.5 rounded-full text-[10px] font-bold shadow-sm text-center max-w-[90%]">
                                    {/* Allow links in system messages too */}
                                    {renderTextWithLinks(msg.text, false)}
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div key={msg.id} className={`flex w-full ${isSender ? "justify-end" : "justify-start"}`}>
                            <div className={`flex flex-col max-w-[80%] md:max-w-[60%] ${isSender ? "items-end" : "items-start"}`}>

                                {!isSender && <span className="text-[10px] text-gray-400 ml-1 mb-1 font-medium">{msg.senderName}</span>}

                                <div
                                    className={`relative px-4 py-2.5 rounded-2xl text-sm shadow-sm break-words ${isSender
                                            ? "bg-[#4A90E2] text-white rounded-br-none"
                                            : "bg-white text-gray-800 border border-gray-200 rounded-bl-none"
                                        }`}
                                >
                                    {/* MEDIA */}
                                    {msg.mediaUrl && (
                                        <div className="mb-2 rounded-lg overflow-hidden bg-black/5 border border-black/10">
                                            {msg.mediaType === 'video' ? (
                                                <video src={msg.mediaUrl} controls className="max-w-full max-h-60 object-contain" />
                                            ) : (
                                                <img src={msg.mediaUrl} alt="Attachment" className="max-w-full h-auto object-cover rounded-lg" />
                                            )}
                                        </div>
                                    )}

                                    {/* TEXT WITH LINK PARSING */}
                                    {msg.text && (
                                        <p className="leading-relaxed whitespace-pre-wrap">
                                            {renderTextWithLinks(msg.text, isSender)}
                                        </p>
                                    )}

                                    {/* METADATA ROW (Time + Ticks) */}
                                    <div className={`flex items-center justify-end mt-1 gap-1 ${isSender ? "opacity-90" : "opacity-50"}`}>
                                        <span className={`text-[9px] font-medium ${isSender ? "text-blue-50" : "text-gray-400"}`}>
                                            {msg.createdAt ? new Date(msg.createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "..."}
                                        </span>
                                        {isSender && <MessageStatus isRead={msg.read} />}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {/* TYPING BUBBLE */}
                {partnerTyping && (
                    <div className="flex w-full justify-start animate-in fade-in slide-in-from-bottom-2">
                        <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm flex items-center gap-1">
                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-75"></div>
                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-150"></div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} className="pb-2" />
            </div>

            {/* --- INPUT AREA --- */}
            <div className="bg-white px-3 py-3 border-t border-gray-200 shrink-0 safe-area-bottom">

                {/* PREVIEW */}
                {mediaPreview && (
                    <div className="flex items-center gap-4 mb-3 px-2 animate-in slide-in-from-bottom-2">
                        <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-gray-200 shadow-md group">
                            {mediaFile?.type.startsWith('video') ? (
                                <video src={mediaPreview} className="w-full h-full object-cover" />
                            ) : (
                                <img src={mediaPreview} alt="Preview" className="w-full h-full object-cover" />
                            )}
                            <button
                                onClick={clearMedia}
                                className="absolute top-0.5 right-0.5 bg-black/60 hover:bg-red-500 text-white rounded-full p-1 transition-colors"
                            >
                                <XMarkIcon />
                            </button>
                        </div>
                        <span className="text-xs font-bold text-gray-500">Ready to send...</span>
                    </div>
                )}

                <form onSubmit={sendReply} className="flex items-end gap-2 max-w-4xl mx-auto">

                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-3 text-gray-400 hover:text-[#4A90E2] bg-gray-50 hover:bg-blue-50 rounded-full transition-all active:scale-95"
                        disabled={sending}
                    >
                        <PaperClipIcon />
                    </button>
                    <input
                        type="file"
                        accept="image/*,video/*"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        className="hidden"
                    />

                    <div className="flex-1 bg-gray-100 rounded-[1.5rem] border border-transparent focus-within:border-[#4A90E2] focus-within:bg-white transition-all flex items-center">
                        <textarea
                            value={replyText}
                            onChange={handleInputChange}
                            placeholder="Type a message..."
                            className="w-full bg-transparent border-none focus:ring-0 text-gray-800 text-base px-4 py-3 max-h-32 resize-none placeholder-gray-400"
                            rows={1}
                            disabled={sending}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    sendReply(e);
                                }
                            }}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={sending || (!replyText.trim() && !mediaFile)}
                        className={`p-3 rounded-full text-white shadow-md transition-all active:scale-95 flex items-center justify-center ${(sending || (!replyText.trim() && !mediaFile))
                                ? "bg-gray-300 cursor-not-allowed"
                                : "bg-[#4A90E2] hover:bg-[#3A75B9]"
                            }`}
                    >
                        {sending ? (
                            <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <SendIcon />
                        )}
                    </button>
                </form>
            </div>

        </div>
    );
}
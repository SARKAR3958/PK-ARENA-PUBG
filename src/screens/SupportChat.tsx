import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Send, Image as ImageIcon, RefreshCcw, User, ShieldCheck, Headset, Lock, Ban } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { firestore } from '../lib/firebase';
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  doc,
  setDoc,
  limit,
  updateDoc,
  getDocs,
  where
} from 'firebase/firestore';
import { SupportMessage, SupportChatRoom } from '../types';
import toast from 'react-hot-toast';
import { SUPPORT_ICON, PK_LOGO_IMAGE } from '../lib/assets';

export function SupportChat() {
  const { currentUser, appSettings } = useApp();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [roomInfo, setRoomInfo] = useState<SupportChatRoom | null>(null);
  const [inputText, setInputText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const COLLECTION_NAME = 'PK-Arena_Support_ChaT';

  // Listen for room info (blocking status, unread count)
  useEffect(() => {
    if (!currentUser?.uid) return;
    const roomRef = doc(firestore, COLLECTION_NAME, currentUser.uid);
    const unsubscribe = onSnapshot(roomRef, { includeMetadataChanges: true }, (snapshot) => {
      if (snapshot.exists()) {
        setRoomInfo({ id: snapshot.id, ...snapshot.data() } as SupportChatRoom);
      }
    });
    return () => unsubscribe();
  }, [currentUser?.uid]);

  // Listen for messages and mark admin messages as seen
  useEffect(() => {
    if (!currentUser?.uid) return;

    const messagesRef = collection(firestore, COLLECTION_NAME, currentUser.uid, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'), limit(100));

    const unsubscribe = onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SupportMessage[];
      setMessages(msgs);

      // Mark admin messages as read
      snapshot.docs.forEach(async (d) => {
        const data = d.data();
        if (data.isAdmin && !data.isRead) {
          await updateDoc(doc(firestore, COLLECTION_NAME, currentUser.uid!, 'messages', d.id), {
            isRead: true
          });
        }
      });
    });

    return () => unsubscribe();
  }, [currentUser?.uid]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (text?: string, imageUrl?: string) => {
    if (!currentUser?.uid || (!text?.trim() && !imageUrl)) return;
    if (roomInfo?.isBlocked) {
      toast.error('You are blocked from sending messages');
      return;
    }

    // Spam protection: check unread messages by user
    const unreadMessagesCount = messages.filter(m => !m.isAdmin && !m.isRead).length;
    if (unreadMessagesCount >= 6) {
      toast.error('Please wait for admin to read your previous messages before sending more.');
      return;
    }

    const trimmedText = text?.trim() || '';
    setInputText('');
    setIsSending(true);

    try {
      const msgData = {
        senderId: currentUser.uid,
        senderName: currentUser.username,
        senderAvatar: currentUser.avatarUrl || '',
        text: trimmedText,
        imageUrl: imageUrl || '',
        timestamp: Date.now(),
        isAdmin: false,
        isRead: false
      };

      // Add message to subcollection
      await addDoc(collection(firestore, COLLECTION_NAME, currentUser.uid, 'messages'), {
        ...msgData,
        timestamp: serverTimestamp()
      });

      // Update room info for admin dashboard
      await setDoc(doc(firestore, COLLECTION_NAME, currentUser.uid), {
        userId: currentUser.uid,
        username: currentUser.username,
        userAvatar: currentUser.avatarUrl || '',
        userEmail: currentUser.email || '',
        userPhone: currentUser.phone || '',
        lastMessage: imageUrl ? '📷 Image' : trimmedText,
        lastTimestamp: Date.now(),
        unreadCount: (roomInfo?.unreadCount || 0) + 1,
        lastMessageSenderId: currentUser.uid
      }, { merge: true });

      // Auto reply from Admin Support on every message sent by user
      const userUid = currentUser.uid;
      const autoReplyText = "Admin Will Reply to your Msg As Soon As Possible !";
      setTimeout(async () => {
        try {
          await addDoc(collection(firestore, COLLECTION_NAME, userUid, 'messages'), {
            senderId: 'admin',
            senderName: 'Admin Support',
            senderAvatar: PK_LOGO_IMAGE,
            text: autoReplyText,
            imageUrl: '',
            timestamp: serverTimestamp(),
            isAdmin: true,
            isRead: false
          });

          await setDoc(doc(firestore, COLLECTION_NAME, userUid), {
            lastMessage: autoReplyText,
            lastTimestamp: Date.now()
          }, { merge: true });
        } catch (autoErr) {
          console.error('Error sending auto reply:', autoErr);
        }
      }, 400);

    } catch (err) {
      console.error('Error sending message:', err);
      toast.error('Failed to send message');
      // Restore text if it failed
      if (trimmedText) setInputText(trimmedText);
    } finally {
      setIsSending(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    if (!appSettings?.imgbbApiKey) {
      toast.error('Image upload not configured');
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${appSettings.imgbbApiKey}`, {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      if (data.success) {
        await handleSendMessage('', data.data.url);
      } else {
        toast.error('Upload failed');
      }
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const formatTimestamp = (ts: any) => {
    if (!ts) return '';
    try {
      const date = ts?.toDate ? ts.toDate() : new Date(ts);
      if (isNaN(date.getTime())) return '';
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  const formatChatDate = (ts: any) => {
    if (!ts) return '';
    try {
      const date = ts?.toDate ? ts.toDate() : new Date(ts);
      if (isNaN(date.getTime())) return '';
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
      const m = date.getMonth() + 1;
      const d = date.getDate();
      const y = date.getFullYear().toString().slice(-2);
      return `${m}/${d}/${y} • ${dayName}`;
    } catch (e) {
      return '';
    }
  };

  return (
    <div className="flex flex-col h-full bg-black relative">
      {/* Blocked Modal */}
      <AnimatePresence>
        {roomInfo?.isBlocked && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-6 text-center"
          >
            <div className="bg-zinc-900 border border-zinc-800 rounded-[40px] p-8 space-y-6 max-w-xs shadow-2xl">
              <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto border border-red-500/20">
                <Ban className="w-10 h-10 text-red-500" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-black text-white uppercase tracking-tighter italic">Access Blocked</h2>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest leading-relaxed">
                  Your support access has been restricted by the administrator due to policy violations.
                </p>
              </div>
              <button 
                onClick={() => navigate('/home')}
                className="w-full bg-zinc-800 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-zinc-700 transition-colors"
              >
                Return to Arena
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center px-4 py-4 bg-zinc-950 border-b border-zinc-800 sticky top-0 z-50">
        <button onClick={() => navigate('/home')} className="p-2 -ml-2 text-zinc-400 hover:text-white transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="flex items-center space-x-3 ml-2">
          <div className="w-10 h-10 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center overflow-hidden">
            <img src={SUPPORT_ICON} alt="Support" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
          <div>
            <h1 className="text-sm font-black text-white uppercase tracking-widest">Admin Support</h1>
            <div className="flex items-center space-x-1">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">CUSTOMER SUPPORT</span>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] bg-fixed"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4 py-10">
            <div className="w-16 h-16 bg-zinc-900 rounded-3xl flex items-center justify-center">
              <Headset className="w-8 h-8 text-zinc-700" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-black text-white uppercase tracking-widest">How can we help?</h3>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest max-w-[200px]">
                Send a message and our team will get back to you shortly.
              </p>
            </div>
          </div>
        )}

        {messages.map((msg, index) => {
          const currentDate = formatChatDate(msg.timestamp);
          const previousDate = index > 0 ? formatChatDate(messages[index - 1].timestamp) : null;
          const showDateSeparator = currentDate && currentDate !== previousDate;

          return (
            <React.Fragment key={msg.id}>
              {showDateSeparator && (
                <div className="flex justify-center my-6">
                  <div className="px-4 py-1.5 bg-zinc-900/50 border border-zinc-800/50 rounded-full backdrop-blur-sm">
                    <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">
                      {currentDate}
                    </span>
                  </div>
                </div>
              )}
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={`flex ${msg.isAdmin ? 'justify-start' : 'justify-end'}`}
              >
            <div className={`max-w-[80%] space-y-1 ${msg.isAdmin ? 'items-start' : 'items-end'} flex flex-col`}>
              <div className={`p-3 rounded-2xl text-xs font-medium shadow-lg relative ${
                msg.isAdmin 
                  ? 'bg-zinc-900 text-white rounded-tl-none border border-zinc-800' 
                  : 'bg-yellow-500 text-black rounded-tr-none font-bold'
              }`}>
                {msg.isAdmin && (
                  <div className="text-[8px] font-black uppercase tracking-[0.2em] text-yellow-500 mb-1">
                    Admin Support
                  </div>
                )}
                {msg.imageUrl && (
                  <img 
                    src={msg.imageUrl} 
                    alt="Uploaded" 
                    className="max-w-full rounded-xl mb-2 border border-black/10 shadow-md"
                    onLoad={() => {
                       if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                    }}
                  />
                )}
                {msg.text}
              </div>
              <div className="flex items-center space-x-1.5 px-1">
                <span className="text-[8px] text-zinc-600 font-bold uppercase tracking-widest">
                  {formatTimestamp(msg.timestamp)}
                </span>
                {!msg.isAdmin && (
                  <span className={`text-[8px] font-black uppercase tracking-widest ${msg.isRead ? 'text-green-500' : 'text-blue-500'}`}>
                    {msg.isRead ? 'Seen' : 'Unseen'}
                  </span>
                )}
              </div>
            </div>
          </motion.div>
            </React.Fragment>
          );
        })}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-zinc-950 border-t border-zinc-900 pb-6">
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSendMessage(inputText); }}
          className="flex items-center space-x-2"
        >
          <input 
            type="file" 
            accept="image/*" 
            id="chat-upload" 
            className="hidden" 
            onChange={(e) => {
              if (e.target.files?.[0]) handleImageUpload(e.target.files[0]);
            }}
          />
          <button 
            type="button" 
            onClick={() => document.getElementById('chat-upload')?.click()}
            disabled={isUploading || roomInfo?.isBlocked}
            className="p-3 bg-zinc-900 text-zinc-400 hover:text-white rounded-2xl border border-zinc-800 transition-colors shadow-lg"
          >
            {isUploading ? <RefreshCcw className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5" />}
          </button>
          <input 
            type="text" 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={roomInfo?.isBlocked}
            placeholder={roomInfo?.isBlocked ? "Chat disabled" : "Type your message..."}
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-xs text-white focus:outline-none focus:border-yellow-500 transition-colors shadow-inner disabled:opacity-50"
          />
          <button 
            type="submit"
            disabled={(!inputText.trim() && !isSending) || isSending || roomInfo?.isBlocked}
            className="p-3 bg-yellow-500 text-black rounded-2xl hover:bg-yellow-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_5px_15px_rgba(234,179,8,0.2)] active:scale-95"
          >
            {isSending ? <RefreshCcw className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </form>
      </div>
    </div>
  );
}

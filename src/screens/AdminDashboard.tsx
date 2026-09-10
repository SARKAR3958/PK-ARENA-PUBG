import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, Trophy, DollarSign, 
  Search, Edit2, Trash2, Plus, 
  CheckCircle, ShieldAlert, Clock, MapPin, Calendar, Lock, Key,
  ChevronDown, X, LayoutDashboard, ChevronRight, Menu, Check, ChevronLeft,
  TrendingUp, Activity, BarChart3, Bell, Settings, Gift,
  Award, Image as ImageIcon, Filter, Download, MoreVertical,
  UserCheck, UserX, Ban, ExternalLink, RefreshCcw, Save, 
  Smartphone, Globe, Info, CreditCard, Wallet, Share2,
  ListOrdered, Swords, Zap, MessageSquare, Database,
  FileText, UserPlus, FileSearch, Power, Medal, Tag,
  FileClock, Shield, Copy, Sliders, ShieldCheck, LogOut,
  AlertTriangle, Coins as CoinsIcon, Play, Link2, Send,
  Mail, Phone, User as UserIcon, Megaphone, BellRing
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, BarChart, Bar, 
  PieChart as RechartsPieChart, Pie, Cell 
} from 'recharts';
import { useApp } from '../context/AppContext';
import { db, firestore } from '../lib/firebase';
import { ref, onValue, update, remove, push, set, get } from 'firebase/database';
import toast from 'react-hot-toast';
import { Tournament, User, Transaction, Banner, AppSettings, AdminRole, SupportMessage, SupportChatRoom, Team, Announcement, AppPopup } from '../types';
import { format } from 'date-fns';
import { PinResetRequestsManager } from '../components/PinResetRequestsManager';
import { PK_COIN_ICON, PK_LOGO_IMAGE, DEFAULT_AVATAR, EASYPAISA_LOGO, JAZZCASH_LOGO, SADAPAY_LOGO, NAYAPAY_LOGO } from '../lib/assets';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  doc,
  setDoc,
  limit,
  addDoc,
  getDocs,
  where,
  updateDoc,
  deleteDoc,
  writeBatch
} from 'firebase/firestore';
import { HelpCircle, UserMinus } from 'lucide-react';

const ADMIN_LOGO = PK_LOGO_IMAGE;
const ADMIN_AVATAR = DEFAULT_AVATAR;

const AdminSupportView = ({ onMenuClick }: { onMenuClick?: () => void }) => {
  const [rooms, setRooms] = useState<SupportChatRoom[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showUserInfo, setShowUserInfo] = useState(false);

  const COLLECTION_NAME = 'PK-Arena_Support_ChaT';

  useEffect(() => {
    const q = query(collection(firestore, COLLECTION_NAME), orderBy('lastTimestamp', 'desc'));
    const unsubscribe = onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
      const roomList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SupportChatRoom[];
      setRooms(roomList);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!selectedRoomId) return;

    const messagesRef = collection(firestore, COLLECTION_NAME, selectedRoomId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'), limit(200));

    const unsubscribe = onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SupportMessage[];
      setMessages(msgs);

      // Mark messages as read when admin opens the chat
      snapshot.docs.forEach(async (d) => {
        const data = d.data();
        if (!data.isAdmin && !data.isRead) {
          await updateDoc(doc(firestore, COLLECTION_NAME, selectedRoomId, 'messages', d.id), {
            isRead: true
          });
        }
      });

      // Reset unread count in room doc
      updateDoc(doc(firestore, COLLECTION_NAME, selectedRoomId), {
        unreadCount: 0
      });
    });

    return () => unsubscribe();
  }, [selectedRoomId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (text?: string, imageUrl?: string) => {
    if (!selectedRoomId || (!text?.trim() && !imageUrl)) return;

    const trimmedText = text?.trim() || '';
    setInputText('');
    setIsSending(true);

    try {
      const msgData = {
        senderId: 'admin',
        senderName: 'Admin Support',
        senderAvatar: PK_LOGO_IMAGE,
        text: trimmedText,
        imageUrl: imageUrl || '',
        timestamp: Date.now(),
        isAdmin: true,
        isRead: false
      };

      await addDoc(collection(firestore, COLLECTION_NAME, selectedRoomId, 'messages'), {
        ...msgData,
        timestamp: serverTimestamp()
      });

      await setDoc(doc(firestore, COLLECTION_NAME, selectedRoomId), {
        lastMessage: imageUrl ? '📷 Image' : trimmedText,
        lastTimestamp: Date.now(),
        lastMessageSenderId: 'admin'
      }, { merge: true });

    } catch (err) {
      console.error('Error sending message:', err);
      toast.error('Failed to send message');
      // Restore text if it failed
      if (trimmedText) setInputText(trimmedText);
    } finally {
      setIsSending(false);
    }
  };

  const handleClearChat = async () => {
    if (!selectedRoomId) return;
    if (!window.confirm('Are you sure you want to clear this chat history?')) return;

    try {
      const messagesRef = collection(firestore, COLLECTION_NAME, selectedRoomId, 'messages');
      const snapshot = await getDocs(messagesRef);
      const batch = writeBatch(firestore);
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      
      await updateDoc(doc(firestore, COLLECTION_NAME, selectedRoomId), {
        lastMessage: 'Chat cleared',
        lastTimestamp: Date.now()
      });
      
      toast.success('Chat cleared');
    } catch (err) {
      console.error('Error clearing chat:', err);
      toast.error('Failed to clear chat');
    }
  };

  const handleToggleBlock = async () => {
    if (!selectedRoomId) return;
    const room = rooms.find(r => r.id === selectedRoomId);
    const newStatus = !room?.isBlocked;
    
    try {
      await updateDoc(doc(firestore, COLLECTION_NAME, selectedRoomId), {
        isBlocked: newStatus
      });
      toast.success(newStatus ? 'User blocked' : 'User unblocked');
    } catch (err) {
      toast.error('Action failed');
    }
  };

  const handleImageUpload = async (file: File) => {
    const settingsRef = ref(db, 'appSettings');
    const snapshot = await get(settingsRef);
    const settings = snapshot.val();
    
    if (!settings?.imgbbApiKey) {
      toast.error('Image upload not configured in App Settings');
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${settings.imgbbApiKey}`, {
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
      return format(date, 'HH:mm');
    } catch (e) {
      return '';
    }
  };

  const formatChatDate = (ts: any) => {
    if (!ts) return '';
    try {
      const date = ts?.toDate ? ts.toDate() : new Date(ts);
      if (isNaN(date.getTime())) return '';
      return format(date, 'M/d/yy • EEEE').toUpperCase();
    } catch (e) {
      return '';
    }
  };

  const filteredRooms = rooms.filter(room => 
    room.username?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    room.userPhone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    room.userId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeRoom = rooms.find(r => r.id === selectedRoomId);

  return (
    <div className={`flex flex-col lg:flex-row bg-black/40 lg:rounded-3xl lg:border border-zinc-800 overflow-hidden shadow-2xl backdrop-blur-md fixed lg:relative inset-0 lg:inset-auto z-[100] lg:z-0 lg:h-[calc(100vh-120px)] h-[100dvh]`}>
      {/* Mobile TopBar for Admin Support */}
      <div className="lg:hidden flex items-center justify-between p-4 pb-2 bg-zinc-950 border-b border-zinc-900">
        <div className="flex items-center space-x-3">
          <button 
            type="button"
            onClick={onMenuClick}
            className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
          >
            <Menu className="w-5 h-5 text-yellow-500" />
          </button>
          <div className="flex flex-col">
            <span className="text-sm text-yellow-500 font-black tracking-tighter uppercase italic">DASHBOARD</span>
            <span className="text-[10px] text-zinc-500 font-bold tracking-tight uppercase">Support Inbox</span>
          </div>
        </div>
      </div>

      {/* User List Sidebar */}
      <div className={`w-full lg:w-80 flex flex-col min-h-0 overflow-hidden border-r border-zinc-800 bg-zinc-950/50 ${selectedRoomId ? 'hidden lg:flex' : 'flex'}`}>
        <div className="p-4 border-b border-zinc-800 bg-zinc-900/50">
          <h2 className="text-sm font-black text-white uppercase tracking-widest mb-4 flex items-center">
            <MessageSquare className="w-4 h-4 mr-2 text-yellow-500" />
            Support Inbox
          </h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input 
              type="text" 
              placeholder="Search by name or phone..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-9 pr-4 text-xs text-white focus:outline-none focus:border-yellow-500/50 transition-colors"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filteredRooms.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center p-4">
               <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">No conversations found</div>
            </div>
          ) : (
            filteredRooms.map(room => (
              <button 
                key={room.id}
                onClick={() => setSelectedRoomId(room.id)}
                className={`w-full p-4 flex items-center space-x-3 transition-colors border-b border-zinc-800/50 ${selectedRoomId === room.id ? 'bg-yellow-500/5 border-l-2 border-l-yellow-500' : 'hover:bg-zinc-900/30'}`}
              >
                <div className="relative">
                  <div className="w-11 h-11 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center overflow-hidden">
                    {room.userAvatar ? (
                      <img src={room.userAvatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon className="w-6 h-6 text-zinc-700" />
                    )}
                  </div>
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="flex justify-between items-start">
                    <p className="text-xs font-black text-white truncate">{room.username}</p>
                    <span className="text-[8px] text-zinc-600 font-bold uppercase whitespace-nowrap ml-2">
                      {formatTimestamp(room.lastTimestamp)}
                    </span>
                  </div>
                  <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-tight truncate">
                    {room.userPhone || 'No Phone'}
                  </p>
                  <p className={`text-[10px] truncate mt-0.5 ${room.lastMessageSenderId !== 'admin' ? 'text-yellow-500 font-bold italic' : 'text-zinc-500 font-medium'}`}>
                    {room.lastMessage}
                  </p>
                </div>
                {room.lastMessageSenderId !== 'admin' && room.unreadCount > 0 && (
                   <div className="w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center text-[9px] font-black text-black shadow-lg animate-pulse shrink-0 ml-2">
                     {room.unreadCount}
                   </div>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`flex-1 flex flex-col min-h-0 overflow-hidden bg-zinc-950/20 ${selectedRoomId ? 'flex' : 'hidden lg:flex'}`}>
        {selectedRoomId ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
              <div className="flex items-center space-x-3">
                <button onClick={() => setSelectedRoomId(null)} className="lg:hidden p-2 bg-zinc-800 rounded-xl text-zinc-400 hover:text-white mr-1 shadow-lg">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="w-10 h-10 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center overflow-hidden">
                   {activeRoom?.userAvatar ? <img src={activeRoom.userAvatar} alt="" className="w-full h-full object-cover" /> : <UserIcon className="w-5 h-5 text-zinc-700" />}
                </div>
                <div>
                  <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center">
                    {activeRoom?.username}
                    {activeRoom?.isBlocked && <Lock className="w-3 h-3 text-red-500 ml-1.5" />}
                  </h3>
                  <div className="flex items-center space-x-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Active Chat</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                 <button 
                  onClick={() => setShowUserInfo(true)}
                  className="p-2.5 bg-zinc-900 rounded-xl border border-zinc-800 text-zinc-400 hover:text-yellow-500 transition-all shadow-lg"
                 >
                    <HelpCircle className="w-4 h-4" />
                 </button>
                 <div className="relative group">
                    <button className="p-2.5 bg-zinc-900 rounded-xl border border-zinc-800 text-zinc-400 hover:text-white transition-all shadow-lg">
                        <MoreVertical className="w-4 h-4" />
                    </button>
                    <div className="absolute right-0 top-full mt-2 w-48 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden hidden group-hover:block z-[110]">
                       <button 
                        onClick={handleClearChat}
                        className="w-full px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:bg-zinc-800 hover:text-red-500 flex items-center border-b border-zinc-800"
                       >
                          <Trash2 className="w-3.5 h-3.5 mr-2.5" />
                          Clear History
                       </button>
                       <button 
                        onClick={handleToggleBlock}
                        className={`w-full px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest flex items-center hover:bg-zinc-800 ${activeRoom?.isBlocked ? 'text-green-500' : 'text-red-500'}`}
                       >
                          <UserMinus className="w-3.5 h-3.5 mr-2.5" />
                          {activeRoom?.isBlocked ? 'Unblock User' : 'Block User'}
                       </button>
                    </div>
                 </div>
              </div>
            </div>

            {/* User Info Modal Overlay */}
            <AnimatePresence>
              {showUserInfo && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-[120] bg-black/60 backdrop-blur-md flex items-center justify-center p-6"
                >
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="w-full max-w-xs bg-zinc-900 border border-zinc-800 rounded-[32px] p-8 shadow-2xl space-y-6 relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 blur-[40px] -mr-10 -mt-10" />
                    
                    <div className="text-center space-y-4">
                      <div className="w-20 h-20 bg-zinc-800 rounded-[32px] border border-zinc-700 flex items-center justify-center mx-auto shadow-2xl overflow-hidden">
                        {activeRoom?.userAvatar ? <img src={activeRoom.userAvatar} alt="" className="w-full h-full object-cover" /> : <UserIcon className="w-10 h-10 text-zinc-600" />}
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-lg font-black text-white uppercase italic tracking-tighter">{activeRoom?.username}</h4>
                        <p className="text-[9px] text-yellow-500 font-bold uppercase tracking-[0.2em]">User Profile</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="bg-black/40 border border-zinc-800/50 rounded-2xl p-4 space-y-1">
                        <span className="text-[8px] text-zinc-500 font-black uppercase tracking-widest">Email Address</span>
                        <p className="text-[10px] text-zinc-300 font-medium truncate">{activeRoom?.userEmail || 'N/A'}</p>
                      </div>
                      <div className="bg-black/40 border border-zinc-800/50 rounded-2xl p-4 space-y-1">
                        <span className="text-[8px] text-zinc-500 font-black uppercase tracking-widest">Phone Number</span>
                        <p className="text-[10px] text-zinc-300 font-medium">{activeRoom?.userPhone || 'N/A'}</p>
                      </div>
                      <div className="bg-black/40 border border-zinc-800/50 rounded-2xl p-4 space-y-1">
                        <span className="text-[8px] text-zinc-500 font-black uppercase tracking-widest">User ID</span>
                        <p className="text-[9px] text-zinc-300 font-medium truncate">{activeRoom?.userId}</p>
                      </div>
                    </div>

                    <button 
                      onClick={() => setShowUserInfo(false)}
                      className="w-full bg-yellow-500 text-black py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg hover:bg-yellow-400 transition-all active:scale-95"
                    >
                      Close Details
                    </button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Messages */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] bg-fixed"
            >
              {messages.map((msg, index) => {
                const currentDate = formatChatDate(msg.timestamp);
                const previousDate = index > 0 ? formatChatDate(messages[index - 1].timestamp) : null;
                const showDateSeparator = currentDate && currentDate !== previousDate;

                return (
                  <React.Fragment key={msg.id}>
                    {showDateSeparator && (
                      <div className="flex justify-center my-6">
                        <div className="px-5 py-2 bg-zinc-900/40 border border-zinc-800/50 rounded-full backdrop-blur-md">
                          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.25em]">
                            {currentDate}
                          </span>
                        </div>
                      </div>
                    )}
                    <div className={`flex ${msg.isAdmin ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] ${msg.isAdmin ? 'items-end' : 'items-start'} flex flex-col space-y-1.5`}>
                    <div className={`p-3.5 rounded-2xl text-xs shadow-xl relative ${
                      msg.isAdmin 
                        ? 'bg-yellow-500 text-black font-black rounded-tr-none shadow-[0_10px_20px_rgba(234,179,8,0.15)] border border-yellow-400/20' 
                        : 'bg-zinc-900 text-white font-medium rounded-tl-none border border-zinc-800'
                    }`}>
                      {msg.imageUrl && (
                        <img 
                          src={msg.imageUrl} 
                          alt="Support Attachment" 
                          className="max-w-full rounded-xl mb-2.5 border border-black/10 shadow-lg cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => window.open(msg.imageUrl, '_blank')}
                        />
                      )}
                      {msg.text}
                    </div>
                    <div className="flex items-center space-x-2 px-1">
                      <span className="text-[8px] text-zinc-600 font-bold uppercase tracking-widest">
                        {formatTimestamp(msg.timestamp)}
                      </span>
                      {msg.isAdmin && (
                        <span className={`text-[8px] font-black uppercase tracking-widest ${msg.isRead ? 'text-blue-500' : 'text-zinc-700'}`}>
                          {msg.isRead ? 'Seen' : 'Unseen'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </React.Fragment>
            );
          })}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-zinc-900/80 border-t border-zinc-800 backdrop-blur-md pb-6 lg:pb-4">
              {activeRoom?.isBlocked && (
                <div className="mb-3 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center">
                  <ShieldAlert className="w-3 h-3 text-red-500 mr-2" />
                  <span className="text-[9px] text-red-500 font-black uppercase tracking-widest">User is blocked</span>
                </div>
              )}
              <form 
                onSubmit={(e) => { e.preventDefault(); handleSendMessage(inputText); }}
                className="flex items-center space-x-3"
              >
                <input 
                  type="file" 
                  accept="image/*" 
                  id="admin-chat-upload" 
                  className="hidden" 
                  onChange={(e) => {
                    if (e.target.files?.[0]) handleImageUpload(e.target.files[0]);
                  }}
                />
                <button 
                  type="button" 
                  onClick={() => document.getElementById('admin-chat-upload')?.click()}
                  disabled={isUploading}
                  className="p-3.5 bg-zinc-800 text-zinc-400 hover:text-white rounded-2xl border border-zinc-700 transition-all shadow-lg active:scale-95"
                >
                  {isUploading ? <RefreshCcw className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5" />}
                </button>
                <input 
                  type="text" 
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Type a response..."
                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-4 text-xs text-white focus:outline-none focus:border-yellow-500/50 transition-all shadow-inner placeholder:text-zinc-700"
                />
                <button 
                  type="submit"
                  disabled={(!inputText.trim() && !isSending) || isUploading || isSending}
                  className="p-4 bg-yellow-500 text-black rounded-2xl hover:bg-yellow-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_8px_20px_rgba(234,179,8,0.3)] active:scale-95"
                >
                  {isSending ? <RefreshCcw className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-6 opacity-40">
            <div className="w-24 h-24 bg-zinc-900 rounded-[40px] flex items-center justify-center border border-zinc-800 shadow-2xl">
              <MessageSquare className="w-12 h-12 text-zinc-700" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-black text-white uppercase tracking-widest">Select a Conversation</h3>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest max-w-[280px] leading-relaxed">
                Choose a user from the sidebar to view their support history and respond to their inquiries.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Charts Data Will Be Derived ---

const Sidebar = ({ 
    activeTab, 
    setActiveTab, 
    setIsMobileMenuOpen, 
    currentAdminRole, 
    setIsAdminAuthenticated, 
    setCurrentAdminRole,
    navItems
  }: any) => {
    const filteredNavItems = useMemo(() => {
      if (!currentAdminRole) return navItems;
      return navItems.filter((item: any) => currentAdminRole.permissions[item.id as keyof typeof currentAdminRole.permissions]);
    }, [currentAdminRole, navItems]);

    return (
      <div className="flex flex-col h-full bg-[#0a0a0a] border-r border-yellow-500/10 shadow-[4px_0_24px_rgba(0,0,0,0.5)]">
        <div className="p-6 flex flex-col items-center justify-center border-b border-yellow-500/10">
          <div className="relative mb-2">
            <img src={ADMIN_LOGO} alt="Pak Arena Logo" className="w-16 h-16 object-contain relative z-10" />
            <div className="absolute inset-0 bg-yellow-500 blur-xl opacity-20" />
          </div>
          <h1 className="text-xl font-black tracking-widest text-yellow-500 uppercase leading-none text-center">Pak Arena</h1>
          <p className="text-[8px] text-zinc-400 font-bold uppercase tracking-[0.2em] mt-1 text-center">Battle Beyond Limits</p>
        </div>

          <div className="flex-1 overflow-y-auto py-4 space-y-1 px-3 custom-scrollbar" style={{ scrollBehavior: 'smooth' }}>
          {filteredNavItems.map((item: any) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center space-x-4 px-4 py-3.5 rounded-xl text-xs transition-all duration-300 ${
                activeTab === item.id 
                  ? 'bg-yellow-500/10 border border-yellow-500/30 shadow-[inset_0_0_15px_rgba(234,179,8,0.1)] text-yellow-500 font-bold' 
                  : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 font-medium'
              }`}
            >
              <item.icon className={`w-4 h-4 ${activeTab === item.id ? 'text-yellow-500' : 'text-zinc-500'}`} />
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-yellow-500/10 bg-[#0a0a0a]">
           <div className="flex items-center space-x-3 p-3 rounded-xl border border-zinc-800 bg-zinc-950">
              <img src={ADMIN_AVATAR} alt="Admin" className="w-10 h-10 rounded-full border border-yellow-500/50" />
              <div className="flex-1">
                 <p className="text-sm font-bold text-white">{currentAdminRole?.adminName || 'Admin'}</p>
                 <p className="text-[10px] text-zinc-500">{currentAdminRole ? 'Moderator' : 'Super Administrator'}</p>
                 <div className="flex items-center mt-1 space-x-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_5px_#22c55e]" />
                    <span className="text-[9px] text-green-500 uppercase font-bold tracking-wider">Online</span>
                 </div>
              </div>
           </div>
           <button 
             onClick={() => {
               localStorage.removeItem('adminToken');
               setIsAdminAuthenticated(false);
               setCurrentAdminRole(null);
               localStorage.removeItem('admin_access_key');
               toast.success('Logged out from Admin Dashboard');
             }}
             className="w-full mt-3 flex items-center justify-center space-x-2 p-2 rounded-xl border border-red-500/20 bg-red-500/5 text-red-500 hover:bg-red-500 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest"
           >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
           </button>
        </div>
      </div>
    );
  };


const PrizeDistributionEditor = ({ match, setMatch }: { match: any, setMatch: (m: any) => void }) => {
  const dist = match.prizeDistribution || [];
  const nextRank = dist.length + 1;
  const [editingRank, setEditingRank] = React.useState<number | null>(null);
  const [editAmount, setEditAmount] = React.useState<number | ''>('');
  const [newAmount, setNewAmount] = React.useState<number | ''>('');
  const [showAdd, setShowAdd] = React.useState(dist.length === 0);

  const handleSaveNew = () => {
    if (newAmount === '') return;
    setMatch({ ...match, prizeDistribution: [...dist, { rank: nextRank, prize: Number(newAmount) }] });
    setNewAmount('');
    setShowAdd(false);
  };

  const handleSaveEdit = () => {
    if (editAmount === '' || editingRank === null) return;
    const newDist = dist.map((d: any) => d.rank === editingRank ? { ...d, prize: Number(editAmount) } : d);
    setMatch({ ...match, prizeDistribution: newDist });
    setEditingRank(null);
    setEditAmount('');
  };

  const handleDelete = (rank: number) => {
    // If we delete a rank, we should probably re-calculate ranks? Or just filter?
    // Usually it's better to just re-index
    const filtered = dist.filter((d: any) => d.rank !== rank);
    const reindexed = filtered.map((d: any, idx: number) => ({ ...d, rank: idx + 1 }));
    setMatch({ ...match, prizeDistribution: reindexed });
  };

  return (
    <div className="col-span-2 space-y-3 bg-zinc-900/30 p-4 rounded-xl border border-zinc-800/50">
      <label className="block text-xs font-bold text-yellow-500 uppercase tracking-widest">Prize Distribution</label>
      
      <div className="space-y-2">
        {dist.map((d: any) => (
          <div key={d.rank} className="flex flex-col space-y-2 bg-zinc-900 p-3 rounded-xl border border-zinc-800">
            <span className="text-[10px] text-yellow-500 font-black uppercase tracking-[0.2em]">Top {d.rank}</span>
            
            {editingRank === d.rank ? (
              <div className="space-y-2">
                <input 
                  type="number" 
                  value={editAmount} 
                  onChange={e => setEditAmount(e.target.value === '' ? '' : Number(e.target.value))} 
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:border-yellow-500 outline-none" 
                  placeholder="Enter prize amount"
                />
                <div className="flex space-x-2">
                  <button type="button" onClick={handleSaveEdit} className="flex-1 py-2 bg-yellow-500 text-black text-[10px] font-black uppercase rounded-lg shadow-lg">Save</button>
                  <button type="button" onClick={() => setEditingRank(null)} className="flex-1 py-2 bg-zinc-800 text-zinc-400 text-[10px] font-bold uppercase rounded-lg">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-sm font-black text-white">PKR {d.prize}</span>
                <div className="flex space-x-2">
                  <button type="button" onClick={() => { setEditingRank(d.rank); setEditAmount(d.prize); }} className="p-2 bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-colors">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" onClick={() => handleDelete(d.rank)} className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {showAdd ? (
        <div className="flex flex-col space-y-2 bg-yellow-500/5 p-3 rounded-xl border border-yellow-500/20 mt-2">
          <span className="text-[10px] text-yellow-500 font-black uppercase tracking-[0.2em]">Top {nextRank}</span>
          <input 
            type="number" 
            value={newAmount} 
            onChange={e => setNewAmount(e.target.value === '' ? '' : Number(e.target.value))} 
            placeholder="Prize amount"
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:border-yellow-500 outline-none" 
          />
          <div className="flex space-x-2">
            <button type="button" onClick={handleSaveNew} className="flex-1 py-2 bg-yellow-500 text-black text-[10px] font-black uppercase rounded-lg shadow-lg">Save</button>
            {dist.length > 0 && (
              <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-2 bg-zinc-800 text-zinc-400 text-[10px] font-bold uppercase rounded-lg">Cancel</button>
            )}
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setShowAdd(true)} className="mt-2 text-[10px] text-yellow-500 font-bold uppercase tracking-widest flex items-center hover:text-yellow-400">
          <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
          Add More
        </button>
      )}
    </div>
  );
};


const AdminTeamsView = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);

  useEffect(() => {
    const teamsRef = ref(db, 'teams');
    const unsubscribe = onValue(teamsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const teamsArray = Object.keys(data).map(key => ({
          ...data[key],
          id: key
        })) as Team[];
        setTeams(teamsArray);
      } else {
        setTeams([]);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleDeleteTeam = async (team: Team) => {
    if (!window.confirm(`Are you sure you want to permanently delete team "${team.name}"?`)) return;
    try {
      await remove(ref(db, `teams/${team.id}`));
      await remove(ref(db, `teamChats/${team.id}`));
      toast.success(`Team ${team.name} deleted.`);
    } catch (err: any) {
      toast.error('Failed to delete team: ' + err.message);
    }
  };

  const handleKickMember = async (team: Team, memberUid: string, memberName: string) => {
    if (!window.confirm(`Are you sure you want to kick ${memberName} from team "${team.name}"?`)) return;
    try {
      await remove(ref(db, `teams/${team.id}/members/${memberUid}`));
      toast.success(`${memberName} kicked from ${team.name}`);
    } catch (err: any) {
      toast.error('Failed to kick member: ' + err.message);
    }
  };

  const filteredTeams = teams.filter(t => 
    t.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.captainName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.inviteCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white uppercase tracking-wider flex items-center space-x-2">
            <ShieldCheck className="w-6 h-6 text-yellow-500" />
            <span>Squads Management</span>
          </h2>
          <p className="text-sm text-zinc-400 mt-1">Manage all user squads, kick members, or delete teams.</p>
        </div>
        
        <div className="relative w-full md:w-72">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search teams, captains, codes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-yellow-500/50 transition-colors"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredTeams.map(team => {
          const membersList = team.members ? Object.values(team.members) : [];
          const isExpanded = expandedTeam === team.id;
          
          return (
            <div key={team.id} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden shadow-lg transition-all hover:border-yellow-500/30">
              <div className="p-5 border-b border-zinc-800 bg-zinc-900/80">
                <div className="flex justify-between items-start">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center overflow-hidden shrink-0">
                      {team.logoUrl ? (
                        <img src={team.logoUrl} alt={team.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-lg font-black text-yellow-500 uppercase">{team.name.charAt(0)}</span>
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white uppercase">{team.name}</h3>
                      <p className="text-xs text-zinc-400">Captain: <span className="text-zinc-200 font-bold">{team.captainName}</span></p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="px-2 py-1 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded-md text-[10px] font-black tracking-widest uppercase">
                      Code: {team.code}
                    </span>
                    <span className="text-xs text-zinc-500 mt-1">{membersList.length}/6 Members</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 mt-4">
                  <button 
                    onClick={() => setExpandedTeam(isExpanded ? null : team.id)}
                    className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-2 rounded-lg text-xs transition-colors flex items-center justify-center space-x-1"
                  >
                    <Users className="w-4 h-4" />
                    <span>{isExpanded ? 'Hide Members' : 'View Members'}</span>
                  </button>
                  <button 
                    onClick={() => handleDeleteTeam(team)}
                    className="w-10 h-10 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-lg flex items-center justify-center transition-colors"
                    title="Delete Team"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <AnimatePresence>
                {isExpanded && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="bg-black/40 overflow-hidden"
                  >
                    <div className="p-4 space-y-2">
                      <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 border-b border-zinc-800 pb-1">Team Roster</h4>
                      {membersList.length === 0 ? (
                        <p className="text-xs text-zinc-500 text-center py-2">No members</p>
                      ) : (
                        membersList.map((member: any) => (
                          <div key={member.uid} className="flex items-center justify-between bg-zinc-900/50 rounded-lg p-2 border border-zinc-800/50">
                            <div className="flex items-center space-x-2 overflow-hidden">
                              <img src={member.avatarUrl || DEFAULT_AVATAR} alt={member.username} className="w-6 h-6 rounded-full object-cover shrink-0" />
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-white truncate">{member.username}</p>
                                <p className="text-[9px] text-zinc-500 truncate">IGN: {member.inGameName} | UID: {member.uid}</p>
                              </div>
                            </div>
                            
                            {member.uid !== team.captainUid ? (
                              <button 
                                onClick={() => handleKickMember(team, member.uid, member.username)}
                                className="ml-2 p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-md transition-colors shrink-0"
                                title="Kick Member"
                              >
                                <UserX className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <span className="text-[9px] font-black text-yellow-500 uppercase tracking-wider px-2 py-1 bg-yellow-500/10 rounded border border-yellow-500/20">
                                CAPT
                              </span>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
        {filteredTeams.length === 0 && (
          <div className="col-span-full py-12 flex flex-col items-center justify-center text-zinc-500">
            <Users className="w-12 h-12 mb-3 opacity-20" />
            <p>No squads found.</p>
          </div>
        )}
      </div>
    </div>
  );
};
export const AdminDashboard: React.FC = () => {
  const { currentUser, logout } = useApp();

  const getAdminDeviceId = () => {
    let devId = localStorage.getItem('admin_device_id');
    if (!devId) {
      devId = 'dev_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
      localStorage.setItem('admin_device_id', devId);
    }
    return devId;
  };

  const [banners, setBanners] = useState<Banner[]>([]);
  const [isBannerModalOpen, setIsBannerModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [newBanner, setNewBanner] = useState<Partial<Banner>>({
    imageUrl: '',
    link: '',
    type: 'home',
    isActive: true
  });
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    description: '',
    imageUrl: '',
    tag: 'NEWS'
  });
  const [isPublishingAnnouncement, setIsPublishingAnnouncement] = useState(false);
  const [isUploadingAnnouncementImg, setIsUploadingAnnouncementImg] = useState(false);
  const [popups, setPopups] = useState<AppPopup[]>([]);
  const [isPopupModalOpen, setIsPopupModalOpen] = useState(false);
  const [editingPopup, setEditingPopup] = useState<AppPopup | null>(null);
  const [newPopup, setNewPopup] = useState({
    title: '',
    description: '',
    imageUrl: '',
    isActive: true
  });
  const [isPublishingPopup, setIsPublishingPopup] = useState(false);
  const [isUploadingPopupImg, setIsUploadingPopupImg] = useState(false);
  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationUrl, setNotificationUrl] = useState('');
  const [isSendingNotification, setIsSendingNotification] = useState(false);
  const [adminKey, setAdminKey] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  

  useEffect(() => {
     
       
     
     
  }, []);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [rememberMe, setRememberMe] = useState(true);
  const [ownerKey, setOwnerKey] = useState<string | null>(null);
  const [newOwnerKey, setNewOwnerKey] = useState('');
  const [isUpdatingKey, setIsUpdatingKey] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Payment Settings States
  const [paymentSettings, setPaymentSettings] = useState({
    easypaisaEnabled: true,
    easypaisaLogo: EASYPAISA_LOGO,
    easypaisaTitle: "ADMIN_E_ACCOUNT",
    easypaisaNumber: "03123456789",
    jazzcashEnabled: true,
    jazzcashLogo: JAZZCASH_LOGO,
    jazzcashTitle: "ADMIN_J_ACCOUNT",
    jazzcashNumber: "03213456789",
    withdrawalEnabled: true,
    withdrawEasypaisaEnabled: true,
    withdrawJazzcashEnabled: true,
    withdrawSadapayEnabled: false,
    sadapayLogo: SADAPAY_LOGO,
    withdrawNayapayEnabled: false,
    nayapayLogo: NAYAPAY_LOGO
  });
  const [paymentSubTab, setPaymentSubTab] = useState<'deposit' | 'withdrawal'>('deposit');
  
  // Sub-tabs State for Transactions & Withdrawals
  const [depositSubTab, setDepositSubTab] = useState<'pending' | 'history'>('pending');
  const [withdrawalSubTab, setWithdrawalSubTab] = useState<'pending' | 'history'>('pending');

  // Promo Codes Admin States
  const [promoCodesList, setPromoCodesList] = useState<any[]>([]);
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [promoAmountInput, setPromoAmountInput] = useState('');
  const [promoExpireDate, setPromoExpireDate] = useState('');
  const [promoUsedLimit, setPromoUsedLimit] = useState<number>(1);
  const [promoSubTab, setPromoSubTab] = useState<'active' | 'used'>('active');
  const [selectedPromoRedeemers, setSelectedPromoRedeemers] = useState<any>(null);
  const [isRedeemersModalOpen, setIsRedeemersModalOpen] = useState(false);
  const [selectedPromoCode, setSelectedPromoCode] = useState('');
  
  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'success' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const [notifConfirmModal, setNotifConfirmModal] = useState<{
    title: string;
    message: string;
    onConfirmSend: () => Promise<void>;
    onConfirmSaveOnly: () => Promise<void>;
  } | null>(null);
  
  // Modals & Form State
  const [isCreateMatchModalOpen, setIsCreateMatchModalOpen] = useState(false);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [isCoinsModalOpen, setIsCoinsModalOpen] = useState(false);
  const [selectedMatchId, setSelectedMatchId] = useState('');
  const [winnerId, setWinnerId] = useState('');
  const [winnerKills, setWinnerKills] = useState(0);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [coinsAmount, setCoinsAmount] = useState(0);
  
  // User Edit/Ban State
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [isBanModalOpen, setIsBanModalOpen] = useState(false);
  const [viewingProofUrl, setViewingProofUrl] = useState<string | null>(null);
  const [isProofModalOpen, setIsProofModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [banReason, setBanReason] = useState('');

  // Admin Role Create State
  const [isCreateRoleModalOpen, setIsCreateRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<AdminRole | null>(null);
  const [newAdminRole, setNewAdminRole] = useState<Partial<AdminRole>>({
    adminName: '',
    adminKey: '',
    permissions: {
      dashboard: true,
      users: false,
      tournaments: false,
      results: false,
      wallet: false,
      transactions: false,
      withdrawals: false,
      promo_codes: false,
      leaderboard: false,
      referrals: false,
      teams: false,
      notifications: false,
      banners: false,
      payment_settings: false,
      settings: false,
      roles: false,
      system: false,
      themes: false
    }
  });

  const [isEditMatchModalOpen, setIsEditMatchModalOpen] = useState(false);
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [isPlayersModalOpen, setIsPlayersModalOpen] = useState(false);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [playerSearchTerm, setPlayerSearchTerm] = useState('');
  const [editingMatch, setEditingMatch] = useState<any>(null);
  const [editingRulesMatch, setEditingRulesMatch] = useState<any>(null);
  const [matchRulesText, setMatchRulesText] = useState('Emulators are strictly prohibited. Using them will result in a ban without refund.\nTeam up in solo matches is not allowed. All players involved will be disqualified.\nEnsure your in-game name matches exactly with your profile name.');
  const [newRuleInput, setNewRuleInput] = useState('');
  const [roomData, setRoomData] = useState({ roomId: '', password: '' });
  const [matchPlayers, setMatchPlayers] = useState<any[]>([]);

  const [newMatch, setNewMatch] = useState({
    title: '', type: 'TDM', mode: 'SOLO', time: '', date: '', entryFee: 0, prizePool: 0, map: 'Bermuda', spotsTotal: 48, perKill: 0, image: '', prizeDistribution: []
  });
  const [isUploadingImg, setIsUploadingImg] = useState(false);

  const handleImageUpload = async (file: File) => {
    setIsUploadingImg(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const apiKey = settings?.imgbbApiKey?.trim() || '67f626f212906e57b545d94edfa694c9';
      const res = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if(data.success) {
        return data.data.url;
      }
      throw new Error(data.error?.message || "Upload failed");
    } catch (err: any) {
      toast.error(err.message || 'Image upload failed');
      return null;
    } finally {
      setIsUploadingImg(false);
    }
  };

  // Data State
  const [users, setUsers] = useState<User[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [adminRoles, setAdminRoles] = useState<AdminRole[]>([]);
  const [pinResetRequests, setPinResetRequests] = useState<any[]>([]);
  const [currentAdminRole, setCurrentAdminRole] = useState<AdminRole | null>(null);

  // Computed Real Data
  const totalUsers = users.length;
  const onlineUsers = users.filter(u => u.status === 'online').length;
  const totalMatches = tournaments.length;
  const liveMatches = tournaments.filter(t => t.status === 'IN-PROGRESS' || t.status === 'LIVE').length;
  
  const totalCoins = users.reduce((sum, u) => sum + (u.walletBalance || 0), 0);
  
  const completedDeposits = transactions.filter(t => t.type === 'deposit' && t.status === 'completed');
  const totalRevenue = completedDeposits.reduce((sum, t) => sum + (t.amount || 0), 0);
  
  const pendingDeposits = transactions.filter(t => t.type === 'deposit' && t.status === 'pending').length;
  const pendingWithdraw = transactions.filter(t => t.type === 'withdraw' && t.status === 'pending').length;
  const totalWithdrawals = transactions.filter(t => t.type === 'withdraw' && t.status === 'completed').reduce((sum, t) => sum + (t.amount || 0), 0);

  const totalEarnings = users.reduce((sum, u) => sum + (u.totalEarnings || 0), 0);
  const totalMatchesPlayed = users.reduce((sum, u) => sum + (u.totalMatches || 0), 0);
  const totalKills = users.reduce((sum, u) => sum + (u.totalKills || 0), 0);

  const depositTransactions = useMemo(() => transactions.filter(t => t.type === 'deposit'), [transactions]);
  const pendingDepositsList = useMemo(() => depositTransactions.filter(t => t.status === 'pending'), [depositTransactions]);
  const historyDepositsList = useMemo(() => depositTransactions.filter(t => t.status === 'completed' || t.status === 'approved' || t.status === 'APPROVED' || t.status === 'rejected'), [depositTransactions]);

  const withdrawalTransactions = useMemo(() => transactions.filter(t => t.type === 'withdrawal' || t.type === 'withdraw'), [transactions]);
  const pendingWithdrawalsList = useMemo(() => withdrawalTransactions.filter(t => t.status === 'pending'), [withdrawalTransactions]);
  const historyWithdrawalsList = useMemo(() => withdrawalTransactions.filter(t => t.status === 'completed' || t.status === 'approved' || t.status === 'APPROVED' || t.status === 'rejected'), [withdrawalTransactions]);

  const matchStats = useMemo(() => {
    const stats = [
      { name: 'BR', value: tournaments.filter(t => t.type === 'BR').length, color: '#EAB308' },
      { name: 'CS', value: tournaments.filter(t => t.type === 'CS').length, color: '#3B82F6' },
      { name: '1v1', value: tournaments.filter(t => t.type === '1v1').length, color: '#22C55E' },
    ].filter(s => s.value > 0);
    
    if (stats.length === 0) return [{ name: 'No Data', value: 1, color: '#3f3f46', percentage: 100 }];
    
    const total = stats.reduce((sum, s) => sum + s.value, 0);
    return stats.map(s => ({ ...s, percentage: ((s.value / total) * 100).toFixed(1) }));
  }, [tournaments]);

  const recentMatches = useMemo(() => {
    return [...tournaments]
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 5);
  }, [tournaments]);

  const topPlayers = useMemo(() => {
    return [...users]
      .sort((a, b) => (b.totalEarnings || 0) - (a.totalEarnings || 0))
      .slice(0, 10);
  }, [users]);

  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) return users;
    const term = searchTerm.toLowerCase();
    return users.filter(u => 
      u.username?.toLowerCase().includes(term) ||
      u.email?.toLowerCase().includes(term) ||
      u.phone?.toLowerCase().includes(term) ||
      u.inGameName?.toLowerCase().includes(term) ||
      u.gameUid?.toLowerCase().includes(term)
    );
  }, [users, searchTerm]);
  
  const revenueData = useMemo(() => {
    const grouped = completedDeposits.reduce((acc: any, t) => {
      const date = new Date(t.createdAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
      acc[date] = (acc[date] || 0) + t.amount;
      return acc;
    }, {});
    const data = Object.keys(grouped).map(k => ({ name: k, revenue: grouped[k] }));
    if (data.length === 0) return [{ name: 'Today', revenue: 0 }];
    return data;
  }, [completedDeposits]);

  useEffect(() => {
    if (currentUser?.role === 'admin' || currentUser?.email === 'alibabaappo@gmail.com') {
      setIsAdminAuthenticated(true);
    }

    const usersRef = ref(db, 'users');
    const tourRef = ref(db, 'tournaments');
    const transRef = ref(db, 'transactions');
    const settingsRef = ref(db, 'appSettings');

    const unsubUsers = onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) setUsers(Object.values(data));
    });

    const unsubTour = onValue(tourRef, (snapshot) => {
      const data = snapshot.val();
      if (data) setTournaments(Object.values(data));
    });

    const unsubTrans = onValue(transRef, (snapshot) => {
      const data = snapshot.val();
      if (data) setTransactions(Object.values(data));
    });

    const unsubSettings = onValue(settingsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) setSettings(data);
    });

    const paymentSettingsRef = ref(db, 'paymentSettings');
    const unsubPayment = onValue(paymentSettingsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setPaymentSettings(prev => ({
          ...prev,
          ...data,
          easypaisaLogo: (!data.easypaisaLogo || data.easypaisaLogo.includes('ibb.co')) ? EASYPAISA_LOGO : data.easypaisaLogo,
          jazzcashLogo: (!data.jazzcashLogo || data.jazzcashLogo.includes('ibb.co')) ? JAZZCASH_LOGO : data.jazzcashLogo,
          sadapayLogo: (!data.sadapayLogo || data.sadapayLogo.includes('ibb.co')) ? SADAPAY_LOGO : data.sadapayLogo,
          nayapayLogo: (!data.nayapayLogo || data.nayapayLogo.includes('ibb.co')) ? NAYAPAY_LOGO : data.nayapayLogo,
        }));
      }
    });

    const bannersRef = ref(db, 'banners');
    const unsubBanners = onValue(bannersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) setBanners(Object.values(data));
      else setBanners([]);
    });

    const announcementsRef = ref(db, 'announcements');
    const unsubAnnouncements = onValue(announcementsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list: Announcement[] = Object.values(data);
        list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        setAnnouncements(list);
      } else {
        setAnnouncements([]);
      }
    });

    const popupsRef = ref(db, 'popups');
    const unsubPopups = onValue(popupsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list: AppPopup[] = Object.values(data);
        list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        setPopups(list);
      } else {
        setPopups([]);
      }
    });

    const rolesRef = ref(db, 'adminRoles');
    const unsubRoles = onValue(rolesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const rolesList = Object.values(data) as AdminRole[];
        setAdminRoles(rolesList);
      }
    });

    const pinResetRef = ref(db, 'pinResetRequests');
    const unsubPinResets = onValue(pinResetRef, (snapshot) => {
      const data = snapshot.val();
      if (data) setPinResetRequests(Object.values(data));
      else setPinResetRequests([]);
    });

    const ownerRef = ref(db, 'owner');
    const unsubOwner = onValue(ownerRef, (snapshot) => {
      const data = snapshot.val();
      if (snapshot.exists()) {
        if (typeof data === 'string') {
          setOwnerKey(data);
        } else if (data && typeof data === 'object') {
          setOwnerKey(data.key || data.adminKey || null);
        }
      } else {
        // Set safe default master key if not found in db so owner is never locked out
        set(ownerRef, { key: 'PAKARENA' });
        setOwnerKey('PAKARENA');
      }
    });

    const promoCodesRef = ref(db, 'promoCodes');
    const unsubPromoCodes = onValue(promoCodesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const promoList = Object.entries(data).map(([key, value]: [string, any]) => {
          if (value && typeof value === 'object') {
            return {
              code: key,
              ...value
            };
          } else {
            return {
              code: key,
              coins: value,
              usedLimit: 1,
              expireDate: '',
              status: 'active'
            };
          }
        });
        setPromoCodesList(promoList);
      } else {
        setPromoCodesList([]);
      }
    });

    return () => {
      unsubUsers();
      unsubTour();
      unsubTrans();
      unsubSettings();
      unsubPayment();
      unsubBanners();
      unsubAnnouncements();
      unsubPopups();
      unsubRoles();
      unsubPinResets();
      unsubOwner();
      unsubPromoCodes();
    };
  }, [currentUser]);

  
  useEffect(() => {
    if (adminRoles.length === 0 && ownerKey === null) return;
    const checkAuth = async () => {
      const savedKey = localStorage.getItem('admin_access_key');
      if (savedKey) {
        const devId = getAdminDeviceId();

        if (ownerKey && savedKey === ownerKey) {
          // Check if device matches
          const ownerSnap = await get(ref(db, 'owner'));
          let boundDev = null;
          if (ownerSnap.exists()) {
            const v = ownerSnap.val();
            if (v && typeof v === 'object') boundDev = v.deviceId || null;
          }
          if (boundDev && boundDev !== devId) {
            localStorage.removeItem('admin_access_key');
            setIsAdminAuthenticated(false);
            setIsCheckingAuth(false);
            toast.error('This Admin Key is locked to another device!');
            return;
          }

          setIsAdminAuthenticated(true);
          setCurrentAdminRole(null);
          setIsCheckingAuth(false);
          return;
        }
        const role = adminRoles.find(r => r.adminKey === savedKey);
        if (role) {
          if (role.deviceId && role.deviceId !== devId) {
            localStorage.removeItem('admin_access_key');
            setIsAdminAuthenticated(false);
            setIsCheckingAuth(false);
            toast.error('This Admin Key is locked to another device!');
            return;
          }

          setCurrentAdminRole(role);
          setIsAdminAuthenticated(true);
          const allowedTabs = navItems.filter(item => role.permissions[item.id as keyof typeof role.permissions]);
          if (allowedTabs.length > 0) setActiveTab(allowedTabs[0].id);
          setIsCheckingAuth(false);
          return;
        } else {
           // Key invalid or changed, wait 2 seconds then show login UI
           setTimeout(() => {
             setIsCheckingAuth(false);
             localStorage.removeItem('admin_access_key');
           }, 2000);
           return;
        }
      } else {
        // No key saved
        setTimeout(() => {
           setIsCheckingAuth(false);
        }, 2000);
      }
    };
    checkAuth();
  }, [adminRoles, ownerKey]);

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBanner.imageUrl) return toast.error('Banner Image URL is required');
    try {
      if (editingBanner) {
        await update(ref(db, `banners/${editingBanner.id}`), newBanner);
        toast.success('Banner updated successfully');
      } else {
        const newBannerRef = push(ref(db, 'banners'));
        await set(newBannerRef, {
          id: newBannerRef.key,
          ...newBanner,
          createdAt: new Date().toISOString()
        });
        toast.success('Banner added successfully');
      }
      setIsBannerModalOpen(false);
      setEditingBanner(null);
      setNewBanner({ imageUrl: '', link: '', type: 'home', isActive: true });
    } catch (err) {
      toast.error('Failed to save banner');
    }
  };

  const handlePublishAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnouncement.title.trim()) return toast.error('Announcement Title is required');
    if (!newAnnouncement.description.trim()) return toast.error('Description is required');

    setIsPublishingAnnouncement(true);
    try {
      const newRef = push(ref(db, 'announcements'));
      const createdItem = {
        id: newRef.key || Date.now().toString(),
        title: newAnnouncement.title.trim(),
        description: newAnnouncement.description.trim(),
        imageUrl: newAnnouncement.imageUrl?.trim() || '',
        tag: newAnnouncement.tag || 'NEWS',
        createdAt: new Date().toISOString(),
        timestamp: Date.now()
      };
      await set(newRef, createdItem);
      setAnnouncements(prev => [createdItem, ...prev.filter(a => a.id !== createdItem.id)]);
      toast.success('Announcement published successfully!');
      setIsAnnouncementModalOpen(false);
      setNewAnnouncement({ title: '', description: '', imageUrl: '', tag: 'NEWS' });
    } catch (err) {
      toast.error('Failed to publish announcement');
    } finally {
      setIsPublishingAnnouncement(false);
    }
  };

  const handleDeleteAnnouncement = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Announcement',
      message: 'Are you sure you want to delete this announcement? This action cannot be undone.',
      type: 'danger',
      confirmText: 'Delete',
      onConfirm: async () => {
        try {
          await remove(ref(db, `announcements/${id}`));
          setAnnouncements(prev => prev.filter(a => a.id !== id));
          toast.success('Announcement deleted');
        } catch (e) {
          toast.error('Failed to delete announcement');
        }
      }
    });
  };

  const handleOpenAddPopup = () => {
    setEditingPopup(null);
    setNewPopup({
      title: '',
      description: '',
      imageUrl: '',
      isActive: true
    });
    setIsPopupModalOpen(true);
  };

  const handleOpenEditPopup = (item: AppPopup) => {
    setEditingPopup(item);
    setNewPopup({
      title: item.title,
      description: item.description,
      imageUrl: item.imageUrl || '',
      isActive: item.isActive !== false
    });
    setIsPopupModalOpen(true);
  };

  const handleSavePopup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPopup.title.trim()) return toast.error('Popup Title is required');
    if (!newPopup.description.trim()) return toast.error('Description is required');

    setIsPublishingPopup(true);
    try {
      if (editingPopup) {
        const updatedItem: AppPopup = {
          ...editingPopup,
          title: newPopup.title.trim(),
          description: newPopup.description.trim(),
          imageUrl: newPopup.imageUrl?.trim() || '',
          isActive: newPopup.isActive
        };
        await set(ref(db, `popups/${editingPopup.id}`), updatedItem);
        setPopups(prev => prev.map(p => p.id === editingPopup.id ? updatedItem : p));
        toast.success('Popup updated successfully!');
      } else {
        const newRef = push(ref(db, 'popups'));
        const createdItem: AppPopup = {
          id: newRef.key || Date.now().toString(),
          title: newPopup.title.trim(),
          description: newPopup.description.trim(),
          imageUrl: newPopup.imageUrl?.trim() || '',
          isActive: newPopup.isActive,
          createdAt: new Date().toISOString(),
          timestamp: Date.now()
        };
        await set(newRef, createdItem);
        setPopups(prev => [createdItem, ...prev.filter(p => p.id !== createdItem.id)]);
        toast.success('Popup added successfully!');
      }
      setIsPopupModalOpen(false);
      setNewPopup({ title: '', description: '', imageUrl: '', isActive: true });
      setEditingPopup(null);
    } catch (err) {
      toast.error(editingPopup ? 'Failed to update popup' : 'Failed to create popup');
    } finally {
      setIsPublishingPopup(false);
    }
  };

  const handleDeletePopup = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Popup',
      message: 'Are you sure you want to delete this popup? It will no longer show when users open the app.',
      type: 'danger',
      confirmText: 'Delete',
      onConfirm: async () => {
        try {
          await remove(ref(db, `popups/${id}`));
          setPopups(prev => prev.filter(p => p.id !== id));
          toast.success('Popup deleted successfully');
        } catch (e) {
          toast.error('Failed to delete popup');
        }
      }
    });
  };

  const handleSendPushNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notificationTitle || !notificationMessage) {
      return toast.error('Please enter both title and message');
    }

    if (!settings?.onesignalAppId || !settings?.onesignalRestApiKey) {
      return toast.error('OneSignal is not configured in System Settings');
    }

    setIsSendingNotification(true);
    try {
      const response = await fetch('/api/send-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appId: settings.onesignalAppId,
          restApiKey: settings.onesignalRestApiKey,
          title: notificationTitle,
          message: notificationMessage,
          url: notificationUrl
        }),
      });

      const data = await response.json();
      if (data.success) {
        await push(ref(db, 'notifications'), {
          title: notificationTitle,
          message: notificationMessage,
          url: notificationUrl || '',
          createdAt: Date.now()
        });
        toast.success('Notification sent successfully!');
        setNotificationTitle('');
        setNotificationMessage('');
        setNotificationUrl('');
      } else {
        throw new Error(data.error || 'Failed to send notification');
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSendingNotification(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const devId = getAdminDeviceId();

    if (ownerKey && adminKey === ownerKey) {
      try {
        const ownerRef = ref(db, 'owner');
        const ownerSnap = await get(ownerRef);
        let currentBoundDevice = null;
        if (ownerSnap.exists()) {
          const ownerVal = ownerSnap.val();
          if (ownerVal && typeof ownerVal === 'object') {
            currentBoundDevice = ownerVal.deviceId || null;
          }
        }

        if (!currentBoundDevice) {
          const ownerVal = ownerSnap.val();
          if (ownerVal && typeof ownerVal === 'object') {
            await update(ownerRef, { deviceId: devId });
          } else {
            const kVal = typeof ownerVal === 'string' ? ownerVal : 'PAKARENA';
            await set(ownerRef, { key: kVal, deviceId: devId });
          }
        } else if (currentBoundDevice !== devId) {
          toast.error('This Admin Key is locked to another device!');
          return;
        }

        setIsAdminAuthenticated(true);
        setCurrentAdminRole(null);
        if (rememberMe) { localStorage.setItem('admin_access_key', adminKey); } else { localStorage.removeItem('admin_access_key'); }
        toast.success('Access Granted - Welcome Master Admin');
      } catch (err: any) {
        toast.error(err.message || 'Verification failed');
      }
      return;
    }

    // Check custom roles
    const matchedRole = adminRoles.find(r => r.adminKey === adminKey);
    if (matchedRole) {
      try {
        const currentBoundDevice = matchedRole.deviceId || null;
        if (!currentBoundDevice) {
          await update(ref(db, `adminRoles/${matchedRole.id}`), { deviceId: devId });
        } else if (currentBoundDevice !== devId) {
          toast.error('This Admin Key is locked to another device!');
          return;
        }

        setIsAdminAuthenticated(true);
        setCurrentAdminRole(matchedRole);
        if (rememberMe) { localStorage.setItem('admin_access_key', adminKey); } else { localStorage.removeItem('admin_access_key'); }
        
        // Set active tab to the first allowed permission
        const allowedTabs = navItems.filter(item => matchedRole.permissions[item.id as keyof typeof matchedRole.permissions]);
        if (allowedTabs.length > 0) setActiveTab(allowedTabs[0].id);
        
        toast.success(`Access Granted - Welcome ${matchedRole.adminName}`);
      } catch (err: any) {
        toast.error(err.message || 'Verification failed');
      }
    } else {
      toast.error('Invalid Administrator Key');
      setAdminKey('');
    }
  };

  // --- Promo Code Helpers & Memo Derivation ---
  const { activePromos, usedPromos } = useMemo(() => {
    const active: any[] = [];
    const used: any[] = [];
    const now = new Date();
    
    promoCodesList.forEach((promo) => {
      const redeemersObj = promo.redeemers || {};
      const redeemersCount = Object.keys(redeemersObj).length;
      const limitVal = promo.usedLimit !== undefined ? Number(promo.usedLimit) : 1;
      
      let isExpired = false;
      if (promo.expireDate) {
        const expDate = new Date(promo.expireDate);
        expDate.setHours(23, 59, 59, 999);
        isExpired = now > expDate;
      }
      
      if (redeemersCount >= limitVal || promo.status === 'used' || promo.isUsed === true || isExpired) {
        used.push({
          ...promo,
          redeemersCount,
          isExpired
        });
      } else {
        active.push({
          ...promo,
          redeemersCount,
          isExpired
        });
      }
    });
    
    return { activePromos: active, usedPromos: used };
  }, [promoCodesList]);

  const handleGeneratePromoCode = async () => {
     const code = promoCodeInput.trim().toUpperCase();
     const amount = Number(promoAmountInput);
     const limitVal = promoUsedLimit > 0 ? Number(promoUsedLimit) : 1;
     
     if (!code) {
        toast.error("Please enter a Promo Code text");
        return;
     }
     if (code.length < 3) {
        toast.error("Promo Code must be at least 3 characters");
        return;
     }
     if (isNaN(amount) || amount <= 0) {
        toast.error("Please enter a valid Amount of coins");
        return;
     }

     try {
        const promoRef = ref(db, `promoCodes/${code}`);
        const snap = await get(promoRef);
        if (snap.exists()) {
           toast.error("This promo code already exists!");
           return;
        }

        await set(promoRef, {
           coins: amount,
           usedLimit: limitVal,
           expireDate: promoExpireDate || "",
           createdAt: new Date().toISOString(),
           status: "active"
        });

        toast.success(`Promo Code "${code}" generated successfully!`);
        // Reset fields
        setPromoCodeInput('');
        setPromoAmountInput('');
        setPromoExpireDate('');
        setPromoUsedLimit(1);
     } catch (err: any) {
        toast.error(err.message || "Failed to generate promo code");
     }
  };

  const handleDeletePromoCode = async (code: string) => {
     if (window.confirm(`Are you sure you want to delete promo code "${code}"?`)) {
        try {
           await remove(ref(db, `promoCodes/${code}`));
           toast.success(`Promo Code "${code}" deleted successfully.`);
        } catch (err: any) {
           toast.error("Failed to delete promo code");
        }
     }
  };

  const handleCreateMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newTourRef = push(ref(db, 'tournaments'));
      await set(newTourRef, {
        id: newTourRef.key,
        ...newMatch,
        status: 'UPCOMING',
        spotsFilled: 0,
        createdAt: new Date().toISOString()
      });
      toast.success('Match created successfully!');
      setIsCreateMatchModalOpen(false);
      setNewMatch({ title: '', type: 'TDM', mode: 'SOLO', time: '', date: '', entryFee: 0, prizePool: 0, map: 'Bermuda', spotsTotal: 48, perKill: 0, prizeDistribution: [] });
    } catch (err) {
      toast.error('Failed to create match');
    }
  };

  const handleUpdateMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await update(ref(db, `tournaments/${editingMatch.id}`), editingMatch);
      toast.success('Match updated successfully!');
      setIsEditMatchModalOpen(false);
    } catch (err) {
      toast.error('Failed to update match');
    }
  };

  const handleUpdateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRoomModalOpen(false);

    const performSaveAndSend = async () => {
      try {
        await update(ref(db, `tournaments/${selectedMatchId}`), {
           roomId: roomData.roomId,
           password: roomData.password
        });
        toast.success('Room details updated & notification sent!');

        try {
          const match = tournaments.find(t => t.id === selectedMatchId);
          const matchTitle = match ? match.title : 'Match';
          
          const usersRef = ref(db, 'userMatches');
          const snapshot = await get(usersRef);
          const allUserMatches = snapshot.val();
          const joinedUserIds: string[] = [];
          
          if (allUserMatches) {
            for (const uid in allUserMatches) {
              for (const mid in allUserMatches[uid]) {
                if (allUserMatches[uid][mid].tournamentId === selectedMatchId) {
                  if (!joinedUserIds.includes(uid)) {
                    joinedUserIds.push(uid);
                  }
                }
              }
            }
          }

          // 1. Always write to each joined user's private notification list in the DB
          for (const uid of joinedUserIds) {
            await push(ref(db, `userNotifications/${uid}`), {
              title: `${matchTitle} Room Details`,
              message: `ROOM ID (${roomData.roomId}), ROOM PASS (${roomData.password}) given fast join`,
              createdAt: Date.now()
            });
          }

          // 2. Send targeted push notification via OneSignal if configured
          if (joinedUserIds.length > 0 && settings?.onesignalAppId && settings?.onesignalRestApiKey) {
            await fetch('/api/send-notification', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                appId: settings.onesignalAppId,
                restApiKey: settings.onesignalRestApiKey,
                title: `${matchTitle} Room Details`,
                message: `ROOM ID (${roomData.roomId}), ROOM PASS (${roomData.password}) given fast join`,
                include_external_user_ids: joinedUserIds
              }),
            });
          }
        } catch (notifErr) {
          console.error('Failed to send room push notifications:', notifErr);
        }
      } catch (err: any) {
        toast.error('Failed to update room details: ' + err.message);
      }
    };

    const performSaveOnly = async () => {
      try {
        await update(ref(db, `tournaments/${selectedMatchId}`), {
           roomId: roomData.roomId,
           password: roomData.password
        });
        toast.success('Room details updated (Notification skipped)!');
      } catch (err: any) {
        toast.error('Failed to update room details: ' + err.message);
      }
    };

    setNotifConfirmModal({
      title: 'Send Notification to Participants?',
      message: `Would you like to send a Push Notification with Room ID (${roomData.roomId}) and Password (${roomData.password}) to all joined players of this match?`,
      onConfirmSend: performSaveAndSend,
      onConfirmSaveOnly: performSaveOnly
    });
  };

  const handleUpdateRules = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRulesMatch) return;
    try {
      await update(ref(db, `tournaments/${editingRulesMatch.id}`), {
        rules: matchRulesText
      });
      toast.success('Rules updated successfully!');
      setIsRulesModalOpen(false);
    } catch (err) {
      toast.error('Failed to update rules');
    }
  };

  const handleViewPlayers = async (matchId: string) => {
      setSelectedMatchId(matchId);
      setIsPlayersModalOpen(true);
      setPlayerSearchTerm('');
      const usersRef = ref(db, 'userMatches');
      const snapshot = await get(usersRef);
      const allUserMatches = snapshot.val();
      const players = [];
      if (allUserMatches) {
          for (const uid in allUserMatches) {
             for (const mid in allUserMatches[uid]) {
                if (allUserMatches[uid][mid].tournamentId === matchId) {
                   const user = users.find(u => u.uid === uid);
                   players.push({
                      ...allUserMatches[uid][mid],
                      uid: uid,
                      username: user?.username || 'Unknown',
                      inGameName: user?.inGameName || 'Unknown',
                      gameUid: user?.gameUid || 'Unknown',
                      phone: user?.phone || 'N/A',
                      profilePic: user?.profilePic || 'https://ui-avatars.com/api/?name=' + (user?.username || 'U')
                   });
                }
             }
          }
      }
      setMatchPlayers(players.sort((a, b) => a.slot - b.slot));
  };

  const handleKickPlayer = async (player: any) => {
      // Direct kick without window.confirm due to iframe limitations
      try {
          const match = tournaments.find(t => t.id === selectedMatchId);
          if (!match) return toast.error('Match not found');

          const userRef = ref(db, `users/${player.uid}`);
          const userSnap = await get(userRef);
          const userData = userSnap.val();
          
          if (userData) {
              const newBalance = (userData.walletBalance || 0) + (match.entryFee || 0);
              const updates: any = {};
              updates[`users/${player.uid}/walletBalance`] = newBalance;
              updates[`userMatches/${player.uid}/${player.id}`] = null; // Delete match from user's list
              updates[`tournaments/${selectedMatchId}/spotsFilled`] = Math.max((match.spotsFilled || 1) - 1, 0);

              // Create refund transaction
              const txRef = push(ref(db, 'transactions'));
              updates[`transactions/${txRef.key}`] = {
                  id: txRef.key,
                  userId: player.uid,
                  username: player.username,
                  amount: match.entryFee,
                  type: 'refund',
                  status: 'completed',
                  createdAt: new Date().toISOString()
              };

              await update(ref(db), updates);
              toast.success('Player kicked and refunded');
              handleViewPlayers(selectedMatchId); // Refresh list
          }
      } catch (err) {
          console.error(err); toast.error('Failed to kick player: ' + err.message);
      }
  };

  const [resultData, setResultData] = useState({ kills: 0, rank: 1, winnings: 0 });
  const [resultPlayerId, setResultPlayerId] = useState('');
  
  const handleAddPlayerResult = async (player: any) => {
      // Bypassed: the actual save operations are moved to confirmAddPlayerResult to handle choice in single modal
  };


  const handleAssignResult = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedMatchId || !winnerId) return toast.error('Select match and winner');
      const match = tournaments.find(t => t.id === selectedMatchId);
      if (!match) return;

      setIsResultModalOpen(false);

      const performSaveAndSend = async () => {
         try {
           const userRef = ref(db, `users/${winnerId}`);
           const userSnap = await get(userRef);
           const userData = userSnap.val();
           
           if (userData) {
              const newBalance = (userData.walletBalance || 0) + (match.prizePool || 0);
              const newEarnings = (userData.totalEarnings || 0) + (match.prizePool || 0);
              const newWins = (userData.totalWins || 0) + 1;
              const newKills = (userData.totalKills || 0) + winnerKills;
              
              await update(userRef, {
                  walletBalance: newBalance,
                  totalEarnings: newEarnings,
                  totalWins: newWins,
                  totalKills: newKills
              });

              if (match.prizePool > 0) {
                const txRef = push(ref(db, 'transactions'));
                await set(txRef, {
                    id: txRef.key,
                    userId: winnerId,
                    username: userData.username,
                    amount: match.prizePool,
                    type: 'match_win',
                    status: 'completed',
                    createdAt: new Date().toISOString()
                });
              }
           }

           await update(ref(db, `tournaments/${selectedMatchId}`), {
              status: 'COMPLETED',
              winnerId,
              winnerKills,
              hasResults: true
           });
           toast.success('Result assigned & notification sent!');

           // 1. Write in-app notification to the winner's list
           await push(ref(db, `userNotifications/${winnerId}`), {
             title: `${match.title} RESULT ADDED`,
             message: `YOUR WINNING OF (${match.title}) SUCCESSFULLY added to your account. Winnings: PKR ${match.prizePool || 0}, Kills: ${winnerKills}, Rank: #1`,
             createdAt: Date.now()
           });

           // Send targeted push notification with winnings, kills and rank details!
           try {
             if (settings?.onesignalAppId && settings?.onesignalRestApiKey) {
               await fetch('/api/send-notification', {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({
                   appId: settings.onesignalAppId,
                   restApiKey: settings.onesignalRestApiKey,
                   title: `${match.title} RESULT ADDED`,
                   message: `YOUR WINNING OF (${match.title}) SUCCESSFULLY added to your account. Winnings: PKR ${match.prizePool || 0}, Kills: ${winnerKills}, Rank: #1`,
                   include_external_user_ids: [winnerId]
                 }),
               });
             }
           } catch (notifErr) {
             console.error('Failed to send winner result push notification:', notifErr);
           }
         } catch(err) {
            toast.error('Failed to assign result');
         }
      };

      const performSaveOnly = async () => {
         try {
           const userRef = ref(db, `users/${winnerId}`);
           const userSnap = await get(userRef);
           const userData = userSnap.val();
           
           if (userData) {
              const newBalance = (userData.walletBalance || 0) + (match.prizePool || 0);
              const newEarnings = (userData.totalEarnings || 0) + (match.prizePool || 0);
              const newWins = (userData.totalWins || 0) + 1;
              const newKills = (userData.totalKills || 0) + winnerKills;
              
              await update(userRef, {
                  walletBalance: newBalance,
                  totalEarnings: newEarnings,
                  totalWins: newWins,
                  totalKills: newKills
              });

              if (match.prizePool > 0) {
                const txRef = push(ref(db, 'transactions'));
                await set(txRef, {
                    id: txRef.key,
                    userId: winnerId,
                    username: userData.username,
                    amount: match.prizePool,
                    type: 'match_win',
                    status: 'completed',
                    createdAt: new Date().toISOString()
                });
              }
           }

           await update(ref(db, `tournaments/${selectedMatchId}`), {
              status: 'COMPLETED',
              winnerId,
              winnerKills,
              hasResults: true
           });
           toast.success('Result assigned successfully (Notification skipped)!');
         } catch(err) {
            toast.error('Failed to assign result');
         }
      };

      setNotifConfirmModal({
        title: 'Send Notification to Winner?',
        message: `Would you like to send a Push Notification with match results (Winnings: PKR ${match.prizePool || 0}, Kills: ${winnerKills}, Rank: #1) to the winner?`,
        onConfirmSend: performSaveAndSend,
        onConfirmSaveOnly: performSaveOnly
      });
  };

  const handleAddCoins = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedUserId || coinsAmount <= 0) return toast.error('Select user and amount');
      try {
         const userRef = ref(db, `users/${selectedUserId}`);
         const userSnap = await get(userRef);
         const userData = userSnap.val();
         if (userData) {
            await update(userRef, {
                walletBalance: (userData.walletBalance || 0) + Number(coinsAmount)
            });
            const txRef = push(ref(db, 'transactions'));
            await set(txRef, {
                id: txRef.key,
                userId: selectedUserId,
                username: userData.username,
                amount: Number(coinsAmount),
                type: 'deposit',
                status: 'completed',
                paymentMethod: 'admin_added',
                createdAt: new Date().toISOString()
            });
            toast.success(`Successfully added ${coinsAmount} coins!`);
            setIsCoinsModalOpen(false);
            setCoinsAmount(0);
         }
      } catch (err) {
         toast.error('Failed to add coins');
      }
  };

  const handleApproveTransaction = async (t: Transaction) => {
    try {
        if (t.type === 'deposit') {
            const userRef = ref(db, `users/${t.userId}/walletBalance`);
            const userSnapshot = await get(userRef);
            const currentBalance = userSnapshot.val() || 0;
            await update(ref(db, `users/${t.userId}`), {
                walletBalance: Number(currentBalance) + Number(t.amount)
            });
        }
        await update(ref(db, `transactions/${t.id}`), {
            status: 'completed'
        });
        if (t.userId) {
            await update(ref(db, `userTransactions/${t.userId}/${t.id}`), {
                status: 'completed'
            });
        }
        toast.success(`Transaction approved`);
    } catch (error) {
        toast.error('Failed to approve transaction');
    }
  };

  const handleRejectTransaction = async (t: Transaction) => {
    try {
        if (t.type === 'withdrawal') { // refund withdrawn amount
             const userRef = ref(db, `users/${t.userId}/walletBalance`);
             const userSnapshot = await get(userRef);
             const currentBalance = userSnapshot.val() || 0;
             await update(ref(db, `users/${t.userId}`), {
                 walletBalance: Number(currentBalance) + Number(t.amount)
             });
        }
        await update(ref(db, `transactions/${t.id}`), {
            status: 'rejected'
        });
        if (t.userId) {
            await update(ref(db, `userTransactions/${t.userId}/${t.id}`), {
                status: 'rejected'
            });
        }
        toast.success(`Transaction rejected`);
    } catch (error) {
        toast.error('Failed to reject transaction');
    }
  };

  // --- Confirmation Wrappers ---
  const confirmApproveTransaction = (t: Transaction) => {
    setConfirmModal({
      isOpen: true,
      title: 'Confirm Approval',
      message: `Are you sure you want to approve this ${t.type} request of PKR ${t.amount} for user "${t.username || 'Unknown'}"?`,
      type: 'success',
      confirmText: 'Approve',
      onConfirm: () => handleApproveTransaction(t)
    });
  };

  const confirmRejectTransaction = (t: Transaction) => {
    setConfirmModal({
      isOpen: true,
      title: 'Confirm Rejection',
      message: `Are you sure you want to reject this ${t.type} request of PKR ${t.amount} for user "${t.username || 'Unknown'}"?`,
      type: 'danger',
      confirmText: 'Reject',
      onConfirm: () => handleRejectTransaction(t)
    });
  };

  const confirmKickPlayer = (player: any) => {
    setConfirmModal({
      isOpen: true,
      title: 'Kick & Refund Player',
      message: `Are you sure you want to kick "${player.username || 'Unknown'}" (IGN: ${player.inGameName}) from this match and refund their entry fee of PKR ${tournaments.find(m => m.id === selectedMatchId)?.entryFee || 0}?`,
      type: 'danger',
      confirmText: 'Kick & Refund',
      onConfirm: () => handleKickPlayer(player)
    });
  };

  const confirmAddPlayerResult = (player: any) => {
    const match = tournaments.find(m => m.id === selectedMatchId);
    if (!match) return toast.error('Match not found');

    const killPrize = (match.perKill || 0) * resultData.kills;
    const totalPrize = killPrize + (resultData.winnings || 0);

    const performSaveAndSend = async () => {
      try {
        const userRef = ref(db, `users/${player.uid}`);
        const userSnap = await get(userRef);
        const userData = userSnap.val();
        
        if (userData) {
          const updates: any = {};
          updates[`users/${player.uid}/walletBalance`] = (userData.walletBalance || 0) + totalPrize;
          updates[`users/${player.uid}/totalKills`] = (userData.totalKills || 0) + resultData.kills;
          if (resultData.rank === 1) {
              updates[`users/${player.uid}/totalWins`] = (userData.totalWins || 0) + 1;
          }
          updates[`users/${player.uid}/totalEarnings`] = (userData.totalEarnings || 0) + totalPrize;

          updates[`userMatches/${player.uid}/${player.id}/rank`] = resultData.rank;
          updates[`userMatches/${player.uid}/${player.id}/kills`] = resultData.kills;
          updates[`userMatches/${player.uid}/${player.id}/reward`] = totalPrize;
          updates[`userMatches/${player.uid}/${player.id}/winnings`] = resultData.winnings || 0;
          updates[`userMatches/${player.uid}/${player.id}/status`] = 'COMPLETED';
          updates[`tournaments/${selectedMatchId}/hasResults`] = true;

          if (totalPrize > 0) {
             const txRef = push(ref(db, 'transactions'));
             updates[`transactions/${txRef.key}`] = {
                 id: txRef.key,
                 userId: player.uid,
                 username: player.username || 'User',
                 amount: totalPrize,
                 type: 'match_win',
                 status: 'completed',
                 date: new Date().toISOString(),
                 details: `Match winnings (${resultData.kills} kills, rank ${resultData.rank})`
             };
          }

          await update(ref(db), updates);
          toast.success('Result added & notification sent!');

          // 1. Write in-app notification to the player's private list
          await push(ref(db, `userNotifications/${player.uid}`), {
            title: `${match.title} RESULT ADDED`,
            message: `YOUR WINNING OF (${match.title}) SUCCESSFULLY added to your account. Winnings: PKR ${totalPrize}, Kills: ${resultData.kills}, Rank: #${resultData.rank}`,
            createdAt: Date.now()
          });

          // Send targeted push notification to this specific user with detailed kills & winnings!
          try {
            if (settings?.onesignalAppId && settings?.onesignalRestApiKey) {
              await fetch('/api/send-notification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  appId: settings.onesignalAppId,
                  restApiKey: settings.onesignalRestApiKey,
                  title: `${match.title} RESULT ADDED`,
                  message: `YOUR WINNING OF (${match.title}) SUCCESSFULLY added to your account. Winnings: PKR ${totalPrize}, Kills: ${resultData.kills}, Rank: #${resultData.rank}`,
                  include_external_user_ids: [player.uid]
                }),
              });
            }
          } catch (notifErr) {
            console.error('Failed to send player result push notification:', notifErr);
          }

          setResultPlayerId('');
          handleViewPlayers(selectedMatchId);
        }
      } catch (err: any) {
        toast.error('Failed to save result: ' + err.message);
      }
    };

    const performSaveOnly = async () => {
      try {
        const userRef = ref(db, `users/${player.uid}`);
        const userSnap = await get(userRef);
        const userData = userSnap.val();
        
        if (userData) {
          const updates: any = {};
          updates[`users/${player.uid}/walletBalance`] = (userData.walletBalance || 0) + totalPrize;
          updates[`users/${player.uid}/totalKills`] = (userData.totalKills || 0) + resultData.kills;
          if (resultData.rank === 1) {
              updates[`users/${player.uid}/totalWins`] = (userData.totalWins || 0) + 1;
          }
          updates[`users/${player.uid}/totalEarnings`] = (userData.totalEarnings || 0) + totalPrize;

          updates[`userMatches/${player.uid}/${player.id}/rank`] = resultData.rank;
          updates[`userMatches/${player.uid}/${player.id}/kills`] = resultData.kills;
          updates[`userMatches/${player.uid}/${player.id}/reward`] = totalPrize;
          updates[`userMatches/${player.uid}/${player.id}/winnings`] = resultData.winnings || 0;
          updates[`userMatches/${player.uid}/${player.id}/status`] = 'COMPLETED';
          updates[`tournaments/${selectedMatchId}/hasResults`] = true;

          if (totalPrize > 0) {
             const txRef = push(ref(db, 'transactions'));
             updates[`transactions/${txRef.key}`] = {
                 id: txRef.key,
                 userId: player.uid,
                 username: player.username || 'User',
                 amount: totalPrize,
                 type: 'match_win',
                 status: 'completed',
                 date: new Date().toISOString(),
                 details: `Match winnings (${resultData.kills} kills, rank ${resultData.rank})`
               };
          }

          await update(ref(db), updates);
          toast.success('Result added successfully (Notification skipped)!');
          setResultPlayerId('');
          handleViewPlayers(selectedMatchId);
        }
      } catch (err: any) {
        toast.error('Failed to save result: ' + err.message);
      }
    };

    setNotifConfirmModal({
      title: 'Send Notification to Participant?',
      message: `Would you like to send a Push Notification with results to ${player.username || 'User'}? Rank: #${resultData.rank}, Kills: ${resultData.kills}, Reward: PKR ${totalPrize}`,
      onConfirmSend: performSaveAndSend,
      onConfirmSaveOnly: performSaveOnly
    });
  };

  const handleDeleteMatch = async (id: string) => {
      const match = tournaments.find(t => t.id === id);
      const isCompleted = match?.status === 'COMPLETED' || match?.hasResults;

      setConfirmModal({
        isOpen: true,
        title: isCompleted ? 'Archive Match' : 'Delete Tournament',
        message: isCompleted 
          ? 'This match has results. It will be hidden from the active list but kept in Result History. Proceed?' 
          : 'Are you sure you want to delete this tournament? This action cannot be undone.',
        type: isCompleted ? 'warning' : 'danger',
        confirmText: isCompleted ? 'Archive' : 'Delete',
        onConfirm: async () => {
           try {
               if (isCompleted) {
                  await update(ref(db, `tournaments/${id}`), { isDeleted: true });
                  toast.success("Match archived to Result History");
               } else {
                  await remove(ref(db, `tournaments/${id}`));
                  toast.success("Match deleted successfully");
               }
           } catch (error) {
               toast.error("Action failed");
           }
           setConfirmModal({ isOpen: false });
        }
      });
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'support', label: 'Support Chat', icon: MessageSquare },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'tournaments', label: 'Tournaments', icon: Trophy },
    { id: 'results', label: 'Result History', icon: Award },
    { id: 'announcements', label: 'Announcements', icon: Megaphone },
    { id: 'popups', label: 'Popups', icon: BellRing },
    { id: 'transactions', label: 'Deposits', icon: CreditCard },
    { id: 'withdrawals', label: 'Withdrawals', icon: DollarSign },
    { id: 'promo_codes', label: 'Promo Codes', icon: Tag },
    { id: 'leaderboard', label: 'Leaderboard', icon: Medal },
    { id: 'referrals', label: 'Referral System', icon: Users },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'teams', label: 'Teams', icon: ShieldCheck },
    { id: 'banners', label: 'Banners', icon: ImageIcon },
    { id: 'payment_settings', label: 'Payment Settings', icon: Sliders },
    { id: 'settings', label: 'App Settings', icon: Settings },
    { id: 'roles', label: 'Admin Roles', icon: Shield },
    { id: 'themes', label: 'Themes', icon: Sliders },
    { id: 'pin_resets', label: 'PIN Resets', icon: Key },
  ];

  if (!isAdminAuthenticated) {
    if (isCheckingAuth) {
      return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center relative overflow-hidden">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="w-16 h-16 border-4 border-zinc-800 border-t-yellow-500 rounded-full" />
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-8 text-xs font-black text-yellow-500 uppercase tracking-[0.2em]">Authenticating Core...</motion.div>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 md:p-6 relative overflow-hidden">
        {/* Background Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-yellow-500/10 blur-[120px] rounded-full" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-yellow-500/10 blur-[120px] rounded-full" />
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] shadow-[inset_0_0_100px_rgba(0,0,0,0.8)]" />
        </div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md relative z-10"
        >
          <div className="bg-zinc-950/40  p-8 md:p-12 rounded-[2.5rem] border border-zinc-800/50 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
            <div className="flex flex-col items-center mb-10 text-center">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-3xl overflow-hidden border-2 border-yellow-500/20 mb-6 p-1.5 bg-zinc-900/50 shadow-[0_0_50px_rgba(234,179,8,0.1)] relative group">
                <div className="absolute inset-0 bg-yellow-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <img src={ADMIN_LOGO} alt="Logo" className="w-full h-full object-cover rounded-2xl relative z-10" />
              </div>
              <h1 className="text-xl md:text-2xl font-black text-white tracking-[0.2em] uppercase mb-1">Terminal Admin</h1>
              <p className="text-yellow-500/60 text-[9px] font-black uppercase tracking-[0.4em]">Secure Access Required</p>
            </div>

            <form onSubmit={handleAdminLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest ml-4">Identity Authorization Key</label>
                <div className="relative group">
                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-700 group-focus-within:text-yellow-500 transition-colors" />
                  <input 
                    type="password"
                    value={adminKey}
                    onChange={(e) => setAdminKey(e.target.value)}
                    placeholder="ENTER KEY"
                    className="w-full bg-zinc-900/40 border border-zinc-800 rounded-2xl py-5 pl-14 pr-6 text-white focus:outline-none focus:border-yellow-500/40 transition-all font-mono tracking-[0.2em] text-base placeholder:text-zinc-800 placeholder:tracking-normal"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-3 ml-2">
                <input 
                  type="checkbox" 
                  checked={rememberMe} 
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-800 bg-zinc-900/50 text-yellow-500 focus:ring-yellow-500/20"
                />
                <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest cursor-pointer" onClick={() => setRememberMe(!rememberMe)}>
                  Remember Me
                </label>
              </div>
              <button 
                type="submit"
                className="w-full h-16 bg-yellow-500 text-black font-black rounded-2xl shadow-[0_15px_30px_rgba(234,179,8,0.2)] hover:bg-yellow-400 active:scale-[0.98] transition-all flex items-center justify-center space-x-3 text-xs uppercase tracking-[0.2em]"
              >
                <ShieldCheck className="w-5 h-5" />
                <span>Initialize Core</span>
              </button>
            </form>
          </div>
          
          <div className="mt-8 flex justify-center space-x-6 text-[9px] font-black text-zinc-600 uppercase tracking-widest">
            <span className="flex items-center"><div className="w-1 h-1 bg-green-500 rounded-full mr-2" /> Server Live</span>
            <span className="flex items-center"><div className="w-1 h-1 bg-yellow-500 rounded-full mr-2" /> V4.2 Encrypted</span>
          </div>
        </motion.div>
      </div>
    );
  }

  const handleCreateOrUpdateAdminRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminRole.adminKey || !newAdminRole.adminName) {
      toast.error('Key and Name are required');
      return;
    }
    
    try {
      if (editingRole) {
        await update(ref(db, `adminRoles/${editingRole.id}`), newAdminRole);
        toast.success('Admin Role updated successfully');
      } else {
        const roleRef = push(ref(db, 'adminRoles'));
        await set(roleRef, {
          ...newAdminRole,
          id: roleRef.key,
          createdAt: new Date().toISOString()
        });
        toast.success('Admin Role created successfully');
      }
      setIsCreateRoleModalOpen(false);
      setEditingRole(null);
      setNewAdminRole({
        adminKey: '',
        adminName: '',
        permissions: {
          dashboard: true,
          users: false,
          tournaments: false,
          results: false,
          wallet: false,
          transactions: false,
          withdrawals: false,
          promo_codes: false,
          leaderboard: false,
          referrals: false,
          teams: false,
          notifications: false,
          banners: false,
          payment_settings: false,
          settings: false,
          roles: false,
          system: false,
          themes: false
        }
      });
    } catch (error) {
      toast.error('Failed to save role');
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    
    try {
      await update(ref(db, `users/${editingUser.uid}`), editingUser);
      toast.success('User updated successfully');
      setIsEditUserModalOpen(false);
    } catch (error) {
      toast.error('Failed to update user');
    }
  };

  const handleBanUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    
    try {
      const updates: any = {};
      updates[`users/${editingUser.uid}/status`] = 'banned';
      updates[`users/${editingUser.uid}/isBanned`] = true;
      updates[`users/${editingUser.uid}/banReason`] = banReason;
      await update(ref(db), updates);
      toast.success(`User ${editingUser.username} banned`);
      setIsBanModalOpen(false);
      setBanReason('');
    } catch (error) {
      toast.error('Failed to ban user');
    }
  };

  const handleChangeOwnerKey = async () => {
    if (!newOwnerKey.trim()) return;
    setIsUpdatingKey(true);
    try {
      await update(ref(db, 'owner'), { key: newOwnerKey.trim() });
      toast.success('Owner Key updated successfully');
      setNewOwnerKey('');
    } catch (error) {
      toast.error('Failed to update owner key');
    } finally {
      setIsUpdatingKey(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      await update(ref(db, 'appSettings'), settings || {});
      await update(ref(db, 'paymentSettings'), paymentSettings);
      toast.success('Settings updated successfully');
    } catch (error) {
      toast.error('Failed to update settings');
    }
  };

  return (
    <div className="min-h-screen bg-[#000000] text-zinc-100 flex font-sans selection:bg-yellow-500/30 overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-[280px] flex-col h-screen fixed top-0 left-0 z-40">
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          setIsMobileMenuOpen={setIsMobileMenuOpen} 
          currentAdminRole={currentAdminRole}
          setIsAdminAuthenticated={setIsAdminAuthenticated}
          setCurrentAdminRole={setCurrentAdminRole}
          navItems={navItems}
        />
      </aside>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/90  z-[110] lg:hidden"
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              className="fixed inset-y-0 left-0 w-[280px] z-[120] lg:hidden"
            >
              <Sidebar 
                activeTab={activeTab} 
                setActiveTab={setActiveTab} 
                setIsMobileMenuOpen={setIsMobileMenuOpen} 
                currentAdminRole={currentAdminRole}
                setIsAdminAuthenticated={setIsAdminAuthenticated}
                setCurrentAdminRole={setCurrentAdminRole}
                navItems={navItems}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:pl-[280px] min-w-0 h-screen bg-[#050505] relative overflow-hidden">
        {/* Top Header */}
        <header className="sticky top-0 h-[70px] border-b border-zinc-800 bg-[#0a0a0a]/90  flex items-center justify-between px-4 shrink-0 shadow-sm z-30">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-yellow-500"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden md:flex p-2 bg-zinc-900 border border-zinc-800 rounded-lg">
              <Menu className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
               <h2 className="text-xl font-bold uppercase tracking-widest text-yellow-500 leading-none">DASHBOARD</h2>
               <p className="text-[10px] text-zinc-400 mt-1">Battle Beyond Limits</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 md:space-x-6">
            <div className="relative hidden md:block">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
               <input 
                 type="text" 
                 placeholder="Search..." 
                 className="bg-zinc-900 border border-zinc-800 rounded-lg py-2 pl-10 pr-4 text-xs w-64 text-white focus:outline-none focus:border-yellow-500/50"
               />
            </div>
            <div className="flex items-center space-x-2 md:space-x-4">
               <div className="relative">
                  <Bell className="w-5 h-5 text-zinc-400 cursor-pointer hover:text-yellow-500" />
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center border-2 border-[#0a0a0a]">
                     <span className="text-[8px] font-black text-black">8</span>
                  </div>
               </div>
               <button 
                 onClick={() => {
                   localStorage.removeItem('adminToken');
                   setIsAdminAuthenticated(false);
                 }}
                 className="p-2 text-zinc-400 hover:text-red-500"
               >
                  <Power className="w-5 h-5" />
               </button>
            </div>
          </div>
        </header>

        {/* Scrollable Content Container */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-4 md:p-8 space-y-8 pb-32">
           {activeTab === 'dashboard' ? (
             <>
               {/* Top Stats Cards */}
               <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                  <StatCard title="TOTAL USERS" value={totalUsers.toLocaleString()} icon={Users} color="text-yellow-500" hideSub />
                  <StatCard title="ONLINE USERS" value="0" sub="Live" icon={Activity} color="text-green-500" />
                  <StatCard title="TOTAL MATCHES" value={totalMatches.toLocaleString()} icon={Swords} color="text-white" hideSub />
                  <StatCard title="LIVE MATCHES" value={liveMatches.toLocaleString()} sub={liveMatches > 0 ? "Live" : ""} icon={MonitorPlay} color={liveMatches > 0 ? "text-red-500" : "text-zinc-500"} />
                  <StatCard title="TOTAL REVENUE" value={`PKR ${totalRevenue.toLocaleString()}`} icon={DollarSign} color="text-yellow-500" hideSub />
                  <StatCard title="TOTAL COINS" value={totalCoins.toLocaleString()} icon={Database} color="text-yellow-500" hideSub />
                  <StatCard title="PENDING DEPOSITS" value={pendingDeposits.toLocaleString()} icon={Wallet} color="text-red-500" hideSub />
                  <StatCard title="PENDING WITHDRAW" value={pendingWithdraw.toLocaleString()} icon={CreditCard} color="text-orange-500" hideSub />
               </div>

               {/* Middle Row */}
               <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Revenue Overview */}
                  <div className="lg:col-span-5 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 flex flex-col">
                     <div className="flex justify-between items-start mb-6">
                        <div>
                          <h3 className="text-[11px] font-bold text-yellow-500 uppercase tracking-wider mb-1">REVENUE OVERVIEW</h3>
                          <div className="flex items-end space-x-2">
                            <h4 className="text-2xl font-black text-white">PKR {totalRevenue.toLocaleString()}</h4>
                          </div>
                        </div>
                        <div className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 flex items-center space-x-2 text-[10px] text-zinc-300">
                          <span>This Week</span>
                          <ChevronDown className="w-3 h-3" />
                        </div>
                     </div>
                     <div className="flex-1 min-h-[200px]">
                       <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={revenueData}>
                            <defs>
                              <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#EAB308" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#EAB308" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                            <XAxis dataKey="name" stroke="#52525b" fontSize={9} tickLine={false} axisLine={false} />
                            <YAxis stroke="#52525b" fontSize={9} tickLine={false} axisLine={false} tickFormatter={(v) => `${v/1000}K`} />
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#09090b', borderColor: '#EAB308', borderRadius: '8px' }}
                              itemStyle={{ fontSize: '12px', fontWeight: 'bold', color: '#EAB308' }}
                            />
                            <Area type="monotone" dataKey="revenue" stroke="#EAB308" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" />
                          </AreaChart>
                       </ResponsiveContainer>
                     </div>
                  </div>

                  {/* Match Statistics */}
                  <div className="lg:col-span-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
                     <h3 className="text-[11px] font-bold text-yellow-500 uppercase tracking-wider mb-6">MATCH STATISTICS</h3>
                     <div className="flex items-center">
                        <div className="w-1/2 relative h-48">
                          <ResponsiveContainer width="100%" height="100%">
                             <RechartsPieChart>
                               <Pie
                                 data={matchStats}
                                 innerRadius={50}
                                 outerRadius={75}
                                 paddingAngle={2}
                                 dataKey="value"
                                 stroke="none"
                               >
                                 {matchStats.map((entry, index) => (
                                   <Cell key={`cell-${index}`} fill={entry.color} />
                                 ))}
                               </Pie>
                               <Tooltip contentStyle={{ backgroundColor: '#09090b', borderRadius: '8px' }} />
                             </RechartsPieChart>
                          </ResponsiveContainer>
                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                             <span className="text-xl font-black text-white">{totalMatches.toLocaleString()}</span>
                             <span className="text-[8px] text-zinc-400">Total Matches</span>
                          </div>
                        </div>
                        <div className="w-1/2 space-y-3 pl-4">
                           {matchStats.map((stat, i) => (
                             <div key={i} className="flex justify-between items-center text-[10px]">
                                <div className="flex items-center space-x-2">
                                  <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: stat.color }} />
                                  <span className="text-zinc-300">{stat.name}</span>
                                </div>
                                <div className="flex items-center space-x-2 text-right">
                                  <span className="text-white font-bold">{stat.value}</span>
                                  <span className="text-zinc-500 w-8">({stat.percentage}%)</span>
                                </div>
                             </div>
                           ))}
                        </div>
                     </div>
                  </div>

                  {/* Recent Activity */}
                  <div className="lg:col-span-3 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 flex flex-col">
                     <div className="flex justify-between items-center mb-6">
                        <h3 className="text-[11px] font-bold text-yellow-500 uppercase tracking-wider">RECENT ACTIVITY</h3>
                        <span className="text-[10px] text-yellow-500 cursor-pointer hover:text-white">View All</span>
                     </div>
                     <div className="space-y-4 overflow-y-auto no-scrollbar flex-1 pr-2">
                        {transactions.slice(0, 6).map((t, i) => (
                          <ActivityItem 
                            key={i} 
                            icon={t.type === 'deposit' ? CreditCard : Wallet} 
                            text={`${t.type === 'deposit' ? 'Deposit' : 'Withdraw'} request from ${t.userId || 'User'}`} 
                            time={new Date(t.createdAt).toLocaleDateString()} 
                            color={t.type === 'deposit' ? "text-green-500" : "text-orange-500"} 
                          />
                        ))}
                        {transactions.length === 0 && (
                          <div className="text-[10px] text-zinc-500 flex items-center justify-center h-full">No recent activity</div>
                        )}
                     </div>
                  </div>
               </div>

               {/* Bottom Row */}
               <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Recent Matches */}
                  <div className="lg:col-span-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
                     <div className="flex justify-between items-center mb-4">
                        <h3 className="text-[11px] font-bold text-yellow-500 uppercase tracking-wider">RECENT MATCHES</h3>
                        <span className="text-[10px] text-yellow-500 cursor-pointer hover:text-white">View All</span>
                     </div>
                     <div className="overflow-x-auto">
                        <table className="w-full text-left text-[10px]">
                           <thead>
                             <tr className="text-zinc-500 border-b border-zinc-800">
                               <th className="pb-3 font-normal">ID</th>
                               <th className="pb-3 font-normal">NAME</th>
                               <th className="pb-3 font-normal">TYPE</th>
                               <th className="pb-3 font-normal">ENTRY FEE</th>
                               <th className="pb-3 font-normal">PRIZE POOL</th>
                               <th className="pb-3 font-normal">STATUS</th>
                               <th className="pb-3 font-normal text-right">START TIME</th>
                             </tr>
                           </thead>
                           <tbody className="text-zinc-300">
                             {recentMatches.map((m, i) => {
                               let statusColor = 'text-blue-500 border-blue-500/30 bg-blue-500/10';
                               if (m.status === 'IN-PROGRESS' || m.status === 'LIVE') statusColor = 'text-green-500 border-green-500/30 bg-green-500/10';
                               if (m.status === 'COMPLETED') statusColor = 'text-yellow-500 border-yellow-500/30 bg-yellow-500/10';
                               
                               return (
                               <tr key={m.id || i} className="border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/20">
                                  <td className="py-3 text-zinc-500">#{m.id?.substring(0,6).toUpperCase()}</td>
                                  <td className="py-3 font-bold text-white">{m.title}</td>
                                  <td className="py-3">{m.type}</td>
                                  <td className="py-3">{m.entryFee ? `PKR ${m.entryFee}` : 'Free'}</td>
                                  <td className="py-3">{m.prizePool ? `PKR ${m.prizePool}` : 'None'}</td>
                                  <td className="py-3">
                                    <span className={`px-2 py-0.5 rounded text-[8px] font-bold border uppercase ${statusColor}`}>{m.status}</span>
                                  </td>
                                  <td className="py-3 text-right text-zinc-500">{new Date(m.startTime).toLocaleString()}</td>
                               </tr>
                             )})}
                             {recentMatches.length === 0 && (
                               <tr>
                                 <td colSpan={7} className="py-8 text-center text-zinc-500 text-xs">No matches found</td>
                               </tr>
                             )}
                           </tbody>
                        </table>
                     </div>
                  </div>

                  {/* Top Players */}
                  <div className="lg:col-span-3 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 flex flex-col">
                     <div className="flex justify-between items-center mb-6">
                        <h3 className="text-[11px] font-bold text-yellow-500 uppercase tracking-wider">TOP PLAYERS (COINS)</h3>
                        <span className="text-[10px] text-yellow-500 cursor-pointer hover:text-white">View All</span>
                     </div>
                     <div className="space-y-4 flex-1">
                        {topPlayers.map((p, index) => {
                          const rank = index + 1;
                          return (
                          <div key={p.uid || index} className="flex items-center justify-between">
                             <div className="flex items-center space-x-3">
                                <div className="w-5 flex justify-center">
                                  {rank === 1 && <Trophy className="w-4 h-4 text-yellow-500" />}
                                  {rank === 2 && <Trophy className="w-4 h-4 text-zinc-300" />}
                                  {rank === 3 && <Trophy className="w-4 h-4 text-orange-400" />}
                                  {rank > 3 && <span className="text-[10px] font-bold text-zinc-500">{rank}</span>}
                                </div>
                                <img src={p.profilePic || DEFAULT_AVATAR} className="w-6 h-6 rounded-full border border-zinc-700 object-cover" alt="" />
                                <span className="text-[11px] font-medium text-zinc-200">{p.username}</span>
                             </div>
                             <div className="flex items-center space-x-1">
                                <span className="text-[9px] text-zinc-500">Coins</span>
                                <span className="text-[10px] text-white font-bold">{(p.walletBalance || 0).toLocaleString()}</span>
                             </div>
                          </div>
                        )})}
                        {topPlayers.length === 0 && (
                          <div className="text-[10px] text-zinc-500 flex items-center justify-center h-full">No players found</div>
                        )}
                     </div>
                  </div>

                  {/* Wallet Overview */}
                  <div className="lg:col-span-3 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 flex flex-col">
                     <div className="flex justify-between items-center mb-6">
                        <h3 className="text-[11px] font-bold text-yellow-500 uppercase tracking-wider">WALLET OVERVIEW</h3>
                        <span className="text-[10px] text-yellow-500 cursor-pointer hover:text-white">View All</span>
                     </div>
                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3 flex-1">
                        <div className="bg-zinc-950 border border-green-500/20 p-4 rounded-xl flex items-center justify-between">
                           <div>
                              <div className="flex items-center space-x-2 mb-1">
                                 <DollarSign className="w-3.5 h-3.5 text-green-500" />
                                 <span className="text-[8px] text-zinc-400 uppercase tracking-widest">Total Deposits</span>
                              </div>
                              <h4 className="text-sm font-black text-white">PKR {totalRevenue.toLocaleString()}</h4>
                           </div>
                        </div>
                        <div className="bg-zinc-950 border border-red-500/20 p-4 rounded-xl flex items-center justify-between">
                           <div>
                              <div className="flex items-center space-x-2 mb-1">
                                 <Wallet className="w-3.5 h-3.5 text-red-500" />
                                 <span className="text-[8px] text-zinc-400 uppercase tracking-widest">Total Withdrawals</span>
                              </div>
                              <h4 className="text-sm font-black text-white">PKR {totalWithdrawals.toLocaleString()}</h4>
                           </div>
                        </div>
                        <div className="flex space-x-3">
                          <div className="bg-zinc-950 border border-yellow-500/20 p-3 rounded-xl flex-1 text-center">
                             <Clock className="w-3.5 h-3.5 text-yellow-500 mx-auto mb-1" />
                             <span className="text-[7px] text-zinc-400 uppercase tracking-widest block mb-1">Pending Deposits (Count)</span>
                             <h4 className="text-[10px] font-black text-white">{pendingDeposits}</h4>
                          </div>
                          <div className="bg-zinc-950 border border-yellow-500/20 p-3 rounded-xl flex-1 text-center">
                             <Clock className="w-3.5 h-3.5 text-yellow-500 mx-auto mb-1" />
                             <span className="text-[7px] text-zinc-400 uppercase tracking-widest block mb-1">Pending Withdraw (Count)</span>
                             <h4 className="text-[10px] font-black text-white">{pendingWithdraw}</h4>
                          </div>
                        </div>
                     </div>
                  </div>
               </div>

               {/* Footer Stats Row */}
               <div className="mt-8 border border-yellow-500/20 bg-zinc-900/60 rounded-2xl p-4 md:p-6 flex flex-col gap-6 shadow-[0_0_20px_rgba(234,179,8,0.05)] mb-10">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
                    <div className="flex items-center space-x-4 p-3 bg-zinc-950/50 rounded-xl border border-zinc-800">
                       <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-yellow-500"><Wallet className="w-5 h-5" /></div>
                       <div>
                          <p className="text-[9px] text-zinc-400 uppercase tracking-widest mb-0.5">Total Revenue</p>
                          <p className="text-lg font-black text-white">PKR {totalRevenue.toLocaleString()}</p>
                       </div>
                    </div>
                    <div className="flex items-center space-x-4 p-3 bg-zinc-950/50 rounded-xl border border-zinc-800">
                       <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-yellow-500"><Trophy className="w-5 h-5" /></div>
                       <div>
                          <p className="text-[9px] text-zinc-400 uppercase tracking-widest mb-0.5">Player Earnings</p>
                          <p className="text-lg font-black text-white">PKR {totalEarnings.toLocaleString()}</p>
                       </div>
                    </div>
                    <div className="flex items-center space-x-4 p-3 bg-zinc-950/50 rounded-xl border border-zinc-800">
                       <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-yellow-500"><MonitorPlay className="w-5 h-5" /></div>
                       <div>
                          <p className="text-[9px] text-zinc-400 uppercase tracking-widest mb-0.5">Match Played</p>
                          <p className="text-lg font-black text-white">{totalMatchesPlayed.toLocaleString()}</p>
                       </div>
                    </div>
                    <div className="flex items-center space-x-4 p-3 bg-zinc-950/50 rounded-xl border border-zinc-800">
                       <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-yellow-500"><Award className="w-5 h-5" /></div>
                       <div>
                          <p className="text-[9px] text-zinc-400 uppercase tracking-widest mb-0.5">Total Kills</p>
                          <p className="text-lg font-black text-white">{totalKills.toLocaleString()}</p>
                       </div>
                    </div>
                  </div>
                  
                  <div className="text-center py-6 border-t border-zinc-800 flex flex-col items-center">
                     <h2 className="text-3xl md:text-5xl font-black text-yellow-500 tracking-[0.2em] uppercase mb-2 drop-shadow-[0_0_20px_rgba(234,179,8,0.4)]">PAK ARENA</h2>
                     <p className="text-[9px] md:text-[11px] text-yellow-500/60 uppercase tracking-[0.3em] font-black">Powerful Admin Panel • Full Control • Full Growth</p>
                  </div>
               </div>
             </>
            ) : activeTab === 'support' ? (
              <AdminSupportView onMenuClick={() => setIsMobileMenuOpen(true)} />
            ) : activeTab === 'users' ? (
              <div className="space-y-6">
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
                   <div className="flex justify-between items-center mb-6">
                      <div>
                        <h3 className="text-sm font-bold text-yellow-500 uppercase tracking-wider">Users Management</h3>
                        <p className="text-[10px] text-zinc-500 mt-1">Total registered players: {users.length}</p>
                      </div>
                      <div className="p-2 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                         <Users className="w-5 h-5 text-yellow-500" />
                      </div>
                   </div>
                   <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <input 
                        type="text" 
                        placeholder="Search by name, email, phone, IGN or UID..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-yellow-500/50 transition-all" 
                      />
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                   {filteredUsers.map((u, i) => (
                     <div key={u.uid || i} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 flex flex-col hover:border-yellow-500/30 transition-all group relative overflow-hidden">
                        {u.status === 'banned' && (
                          <div className="absolute top-0 right-0 bg-red-600 text-white text-[8px] font-black uppercase px-4 py-1 rotate-45 translate-x-3 translate-y-1 shadow-lg">Banned</div>
                        )}
                        <div className="flex items-center space-x-4 mb-4">
                           <div className="relative">
                              <img src={u.profilePic || u.avatarUrl || DEFAULT_AVATAR} className="w-14 h-14 rounded-2xl bg-zinc-800 object-cover border border-zinc-700" alt="" />
                              <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-zinc-900 ${u.status === 'online' ? 'bg-green-500' : 'bg-zinc-600'}`} />
                           </div>
                           <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-black text-white truncate">{u.username}</h4>
                              <p className="text-[10px] text-zinc-500 truncate">{u.email}</p>
                              <div className="flex items-center space-x-2 mt-1">
                                 <span className="text-[9px] font-bold text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded border border-yellow-500/20 flex items-center">
                                   <img src={PK_COIN_ICON} alt="Coin" className="w-2.5 h-2.5 object-contain mr-1" />
                                   {u.walletBalance || 0} Coins
                                 </span>
                                 <span className="text-[9px] font-bold text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded uppercase">{u.role || 'Player'}</span>
                              </div>
                           </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 mb-5 border-t border-zinc-800 pt-4">
                           <div className="flex justify-between items-center bg-zinc-950/50 p-2 rounded-lg border border-zinc-800/50">
                              <p className="text-[8px] text-zinc-500 uppercase font-black tracking-widest">Phone Number</p>
                              <p className="text-[10px] text-zinc-300 font-mono">{u.phone || 'N/A'}</p>
                           </div>
                           {u.password && (
                               <div className="flex justify-between items-center bg-zinc-950/50 p-2 rounded-lg border border-blue-500/20 bg-blue-500/5">
                                  <p className="text-[8px] text-zinc-500 uppercase font-black tracking-widest">Password</p>
                                  <p className="text-[10px] text-blue-400 font-mono">{u.password}</p>
                               </div>
                           )}
                           <div className="space-y-2">
                              <div className="bg-zinc-950/50 p-2 rounded-lg border border-zinc-800/50">
                                <p className="text-[8px] text-zinc-500 uppercase font-black tracking-widest mb-1">IGN :</p>
                                <p className="text-[11px] text-yellow-500 font-black uppercase tracking-tight">{u.inGameName || 'N/A'}</p>
                              </div>
                              <div className="bg-zinc-950/50 p-2 rounded-lg border border-zinc-800/50">
                                <p className="text-[8px] text-zinc-500 uppercase font-black tracking-widest mb-1">UID :</p>
                                <p className="text-[11px] text-white font-black tracking-tight">{u.gameUid || 'N/A'}</p>
                              </div>
                           </div>
                           <div className="grid grid-cols-2 gap-3">
                             <div className="bg-zinc-950/50 p-2 rounded-lg border border-zinc-800/50">
                                <p className="text-[8px] text-zinc-500 uppercase font-black tracking-widest mb-0.5">Matches</p>
                                <p className="text-[10px] text-zinc-300 font-black">{u.totalMatches || 0}</p>
                             </div>
                             <div className="bg-zinc-950/50 p-2 rounded-lg border border-zinc-800/50">
                                <p className="text-[8px] text-zinc-500 uppercase font-black tracking-widest mb-0.5">Earnings</p>
                                <p className="text-[10px] text-green-500 font-black">PKR {u.totalEarnings || 0}</p>
                             </div>
                           </div>
                        </div>

                        <div className="flex gap-2 mt-auto">
                           <button 
                             onClick={() => { setEditingUser(u); setIsEditUserModalOpen(true); }}
                             className="flex-1 h-9 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-yellow-500 hover:text-black transition-all flex items-center justify-center space-x-2"
                           >
                              <Edit2 className="w-3 h-3" />
                              <span>Edit</span>
                           </button>
                           {u.status === 'banned' ? (
                             <button 
                               onClick={async () => {
                                 const updates: any = {};
                                 updates[`users/${u.uid}/status`] = 'active';
                                 updates[`users/${u.uid}/isBanned`] = false;
                                 updates[`users/${u.uid}/banReason`] = null;
                                 await update(ref(db), updates);
                                 toast.success(`User ${u.username} unbanned`);
                               }}
                               className="flex-1 h-9 bg-green-500/10 text-green-500 border border-green-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-green-500 hover:text-black transition-all flex items-center justify-center space-x-2"
                             >
                                <UserCheck className="w-3 h-3" />
                                <span>Unban</span>
                             </button>
                           ) : (
                             <button 
                               onClick={() => { setEditingUser(u); setIsBanModalOpen(true); }}
                               className="flex-1 h-9 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-black transition-all flex items-center justify-center space-x-2"
                             >
                                <Ban className="w-3 h-3" />
                                <span>Ban</span>
                             </button>
                           )}
                        </div>
                     </div>
                   ))}
                </div>
              </div>
           ) : activeTab === 'tournaments' ? (
             <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
                <div className="flex justify-between items-center mb-6">
                   <h3 className="text-sm font-bold text-yellow-500 uppercase tracking-wider">Tournaments ({tournaments.length})</h3>
                   <button onClick={() => setIsCreateMatchModalOpen(true)} className="bg-yellow-500 text-black px-4 py-2 rounded-lg font-bold text-xs uppercase hover:bg-yellow-400 transition-colors">Create New</button>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {tournaments.filter(t => !t.isDeleted).map((t, i) => (
                     <div key={t.id || i} className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-lg relative group flex flex-col">
                        <div className="p-4 border-b border-zinc-800 bg-zinc-900/30 flex justify-between items-start">
                           <div>
                              <h4 className="font-bold text-white text-sm mb-1">{t.title}</h4>
                              <div className="flex items-center text-[10px] text-zinc-500 space-x-2">
                                 <span>#{t.id?.substring(0,8).toUpperCase()}</span>
                                 <span>•</span>
                                 <span>{t.date} {t.time}</span>
                              </div>
                           </div>
                           <span className="text-[10px] font-bold px-2 py-1 rounded bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">{t.status}</span>
                        </div>
                        <div className="p-4 grid grid-cols-2 gap-4 flex-1">
                           <div className="bg-zinc-900/30 p-2 rounded-lg border border-zinc-800/50">
                              <div className="text-[8px] text-zinc-500 uppercase tracking-widest mb-1">Entry Fee</div>
                              <div className="font-bold text-xs">{t.entryFee ? `PKR ${t.entryFee}` : 'FREE'}</div>
                           </div>
                           <div className="bg-zinc-900/30 p-2 rounded-lg border border-zinc-800/50">
                              <div className="text-[8px] text-zinc-500 uppercase tracking-widest mb-1">Prize Pool</div>
                              <div className="font-bold text-xs text-green-500">{t.prizePool ? `PKR ${t.prizePool}` : 'N/A'}</div>
                           </div>
                           <div className="bg-zinc-900/30 p-2 rounded-lg border border-zinc-800/50">
                              <div className="text-[8px] text-zinc-500 uppercase tracking-widest mb-1">Per Kill</div>
                              <div className="font-bold text-xs text-yellow-500">PKR {t.perKill || 0}</div>
                           </div>
                           <div className="bg-zinc-900/30 p-2 rounded-lg border border-zinc-800/50">
                              <div className="text-[8px] text-zinc-500 uppercase tracking-widest mb-1">Map</div>
                              <div className="font-bold text-xs">{t.map}</div>
                           </div>
                           <div className="bg-zinc-900/30 p-2 rounded-lg border border-zinc-800/50">
                              <div className="text-[8px] text-zinc-500 uppercase tracking-widest mb-1">Total Slots</div>
                              <div className="font-bold text-xs text-white">{t.spotsTotal}</div>
                           </div>
                           <div className="bg-zinc-900/30 p-2 rounded-lg border border-zinc-800/50">
                              <div className="text-[8px] text-zinc-500 uppercase tracking-widest mb-1">Slots Filled</div>
                              <div className="font-bold text-xs text-yellow-500">{t.spotsFilled || 0}</div>
                           </div>
                           <div className="bg-zinc-900/30 p-2 rounded-lg border border-zinc-800/50 col-span-2">
                              <div className="text-[8px] text-zinc-500 uppercase tracking-widest mb-1">Room ID / Password</div>
                              <div className="font-mono text-[10px] text-zinc-300">
                                 {t.roomId ? `${t.roomId} / ${t.password}` : 'Not Assigned'}
                              </div>
                           </div>
                           <div className="bg-zinc-900/30 p-2 rounded-lg border border-zinc-800/50 col-span-2">
                              <div className="text-[8px] text-zinc-500 uppercase tracking-widest mb-1">Room Status</div>
                              <div className={`text-[10px] font-black uppercase tracking-widest ${t.roomId ? 'text-green-500' : 'text-red-500'}`}>
                                 {t.roomId ? 'PASS GIVEN' : 'PENDING'}
                              </div>
                           </div>
                           <div className="col-span-2 pt-2 border-t border-zinc-800 mt-2">
                              <div className="text-[8px] text-zinc-500 uppercase font-black tracking-widest mb-1 flex items-center">
                                 <Clock className="w-2.5 h-2.5 mr-1 text-yellow-500" />
                                 Match Countdown
                              </div>
                              <div className="text-lg font-black text-white tabular-nums tracking-tighter">
                                 {(() => {
                                   const matchTime = new Date(`${t.date} ${t.time}`).getTime();
                                   const diff = matchTime - Date.now();
                                   
                                   if (diff <= 0) return <span className="text-red-500 text-xs font-black uppercase">MATCH STARTED</span>;
                                   
                                   const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                                   const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                                   const seconds = Math.floor((diff % (1000 * 60)) / 1000);
                                   
                                   return `${hours.toString().padStart(2, '0')}h : ${minutes.toString().padStart(2, '0')}m : ${seconds.toString().padStart(2, '0')}s`;
                                 })()}
                              </div>
                           </div>
                        </div>
                         <div className="p-3 border-t border-zinc-800 bg-zinc-900/30 flex flex-wrap gap-2 justify-end">
                            <button onClick={() => handleViewPlayers(t.id)} className="px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/30 text-[10px] font-bold hover:bg-blue-500/20 transition-colors">Players</button>
                            <button onClick={() => { setSelectedMatchId(t.id); setRoomData({ roomId: t.roomId || '', password: t.password || '' }); setIsRoomModalOpen(true); }} className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 border border-zinc-700 text-[10px] font-bold hover:bg-zinc-700 transition-colors">Room Info</button>
                           <button onClick={() => { setEditingRulesMatch(t); setMatchRulesText(t.rules || 'Emulators are strictly prohibited. Using them will result in a ban without refund.\nTeam up in solo matches is not allowed. All players involved will be disqualified.\nEnsure your in-game name matches exactly with your profile name.'); setIsRulesModalOpen(true); }} className="px-3 py-1.5 rounded-lg bg-yellow-500/10 text-yellow-500 border border-yellow-500/30 text-[10px] font-bold hover:bg-yellow-500/20 transition-colors">Rules</button>
                           <button onClick={() => { setEditingMatch(t); setIsEditMatchModalOpen(true); }} className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 border border-zinc-700 text-[10px] font-bold hover:bg-zinc-700 transition-colors">Edit</button>
                           <button onClick={() => handleDeleteMatch(t.id)} className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 text-[10px] font-bold hover:bg-red-500/20 transition-colors">Delete</button>
                        </div>
                     </div>
                  ))}
                </div>
             </div>
           ) : activeTab === 'transactions' ? (
               <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-800 pb-4 mb-6 gap-4">
                     <div>
                        <h3 className="text-sm font-bold text-yellow-500 uppercase tracking-wider">Deposits Management</h3>
                        <p className="text-[10px] text-zinc-500 mt-1">Approve or reject deposit requests from users</p>
                     </div>
                     
                     {/* Sub tabs */}
                     <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800 shrink-0">
                        <button
                           onClick={() => setDepositSubTab('pending')}
                           className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${depositSubTab === 'pending' ? 'bg-yellow-500 text-black' : 'text-zinc-400 hover:text-zinc-200'}`}
                        >
                           Pending Deposits ({pendingDepositsList.length})
                        </button>
                        <button
                           onClick={() => setDepositSubTab('history')}
                           className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${depositSubTab === 'history' ? 'bg-yellow-500 text-black' : 'text-zinc-400 hover:text-zinc-200'}`}
                        >
                           Deposit History ({historyDepositsList.length})
                        </button>
                     </div>
                  </div>

                  {/* List of deposit transactions based on sub-tab */}
                  <div className="space-y-4">
                     {depositSubTab === 'pending' ? (
                        pendingDepositsList.length === 0 ? (
                           <div className="text-center py-12 text-zinc-500 text-xs">No pending deposits found</div>
                        ) : (
                           pendingDepositsList.sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime()).map((t, i) => {
                              const txUser = users.find(u => u.uid === t.userId || u.id === t.userId || u.username === t.username);
                              const userPhone = txUser?.phone || t.phoneNumber || t.phone || 'N/A';
                              const userEmail = txUser?.email || 'N/A';
                              return (
                                 <div key={i} className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex-1">
                                       <div className="flex items-center space-x-3 mb-2">
                                          <span className="px-2 py-1 rounded text-[9px] font-bold uppercase bg-green-500/10 text-green-500 border border-green-500/20">
                                             {t.type}
                                          </span>
                                          <span className="px-2 py-1 rounded text-[9px] font-bold uppercase bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                                             {t.status}
                                          </span>
                                          <span className="text-[10px] text-zinc-500">{new Date(t.date || t.createdAt).toLocaleString()}</span>
                                       </div>
                                       
                                       <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                                          <div>
                                             <p className="text-[9px] text-zinc-500 uppercase font-bold mb-1">User Details</p>
                                             <p className="text-xs text-white font-bold">{t.username || 'Unknown'}</p>
                                             <p className="text-[10px] text-zinc-400 mt-0.5">{userPhone !== 'N/A' ? userPhone : 'No Phone'}</p>
                                             <p className="text-[10px] text-zinc-400 break-all">{userEmail !== 'N/A' ? userEmail : 'No Email'}</p>
                                          </div>
                                          <div>
                                             <p className="text-[9px] text-zinc-500 uppercase font-bold mb-1">Method / Details</p>
                                             <p className="text-xs text-white font-bold">{t.method || t.paymentMethod || 'N/A'}</p>
                                          </div>
                                          <div>
                                             <p className="text-[9px] text-zinc-500 uppercase font-bold mb-1">Amount</p>
                                             <p className="text-sm font-black text-yellow-500">PKR {t.amount}</p>
                                          </div>
                                          {t.screenshot && (
                                             <div>
                                                <p className="text-[9px] text-zinc-500 uppercase font-bold mb-1">Screenshot</p>
                                                <button 
                                                  onClick={() => {
                                                     setViewingProofUrl(t.screenshot);
                                                     setIsProofModalOpen(true);
                                                  }} 
                                                  className="flex items-center space-x-2 text-[10px] bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500 hover:text-black border border-yellow-500/30 px-4 py-2 rounded-lg font-black uppercase tracking-widest transition-all"
                                                >
                                                   <ImageIcon className="w-3.5 h-3.5" />
                                                   <span>View Proof</span>
                                                </button>
                                             </div>
                                          )}
                                       </div>
                                    </div>
                                    
                                    <div className="flex flex-row md:flex-col gap-2 shrink-0 border-t border-zinc-800 md:border-t-0 md:border-l pt-3 md:pt-0 md:pl-4">
                                       <button onClick={() => confirmApproveTransaction(t)} className="flex-1 bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-black border border-green-500/30 font-bold text-xs px-4 py-2 rounded-lg transition-colors uppercase">
                                          Approve
                                       </button>
                                       <button onClick={() => confirmRejectTransaction(t)} className="flex-1 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-black border border-red-500/30 font-bold text-xs px-4 py-2 rounded-lg transition-colors uppercase">
                                          Reject
                                       </button>
                                    </div>
                                 </div>
                              );
                           })
                        )
                     ) : (
                        historyDepositsList.length === 0 ? (
                           <div className="text-center py-12 text-zinc-500 text-xs">No deposit history found</div>
                        ) : (
                           historyDepositsList.sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime()).map((t, i) => {
                              const txUser = users.find(u => u.uid === t.userId || u.id === t.userId || u.username === t.username);
                              const userPhone = txUser?.phone || t.phoneNumber || t.phone || 'N/A';
                              const userEmail = txUser?.email || 'N/A';
                              return (
                                 <div key={i} className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex-1">
                                       <div className="flex items-center space-x-3 mb-2">
                                          <span className="px-2 py-1 rounded text-[9px] font-bold uppercase bg-green-500/10 text-green-500 border border-green-500/20">
                                             {t.type}
                                          </span>
                                          <span className={`px-2 py-1 rounded text-[9px] font-bold uppercase border ${t.status === 'completed' || t.status === 'approved' || t.status === 'APPROVED' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                                             {t.status === 'completed' || t.status === 'approved' || t.status === 'APPROVED' ? 'Approved' : 'Rejected'}
                                          </span>
                                          <span className="text-[10px] text-zinc-500">{new Date(t.date || t.createdAt).toLocaleString()}</span>
                                       </div>
                                       
                                       <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                                          <div>
                                             <p className="text-[9px] text-zinc-500 uppercase font-bold mb-1">User Details</p>
                                             <p className="text-xs text-white font-bold">{t.username || 'Unknown'}</p>
                                             <p className="text-[10px] text-zinc-400 mt-0.5">{userPhone !== 'N/A' ? userPhone : 'No Phone'}</p>
                                             <p className="text-[10px] text-zinc-400 break-all">{userEmail !== 'N/A' ? userEmail : 'No Email'}</p>
                                          </div>
                                          <div>
                                             <p className="text-[9px] text-zinc-500 uppercase font-bold mb-1">Method / Details</p>
                                             <p className="text-xs text-white font-bold">{t.method || t.paymentMethod || 'N/A'}</p>
                                          </div>
                                          <div>
                                             <p className="text-[9px] text-zinc-500 uppercase font-bold mb-1">Amount</p>
                                             <p className="text-sm font-black text-yellow-500">PKR {t.amount}</p>
                                          </div>
                                          {t.screenshot && (
                                             <div>
                                                <p className="text-[9px] text-zinc-500 uppercase font-bold mb-1">Screenshot</p>
                                                <button 
                                                  onClick={() => {
                                                     setViewingProofUrl(t.screenshot);
                                                     setIsProofModalOpen(true);
                                                  }} 
                                                  className="flex items-center space-x-2 text-[10px] bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500 hover:text-black border border-yellow-500/30 px-4 py-2 rounded-lg font-black uppercase tracking-widest transition-all"
                                                >
                                                   <ImageIcon className="w-3.5 h-3.5" />
                                                   <span>View Proof</span>
                                                </button>
                                             </div>
                                          )}
                                       </div>
                                    </div>
                                 </div>
                              );
                           })
                        )
                     )}
                  </div>
               </div>
            ) : activeTab === 'withdrawals' ? (
               <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-800 pb-4 mb-6 gap-4">
                     <div>
                        <h3 className="text-sm font-bold text-yellow-500 uppercase tracking-wider">Withdrawals Management</h3>
                        <p className="text-[10px] text-zinc-500 mt-1">Approve or reject withdrawal requests from users</p>
                     </div>
                     
                     {/* Sub tabs */}
                     <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800 shrink-0">
                        <button
                           onClick={() => setWithdrawalSubTab('pending')}
                           className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${withdrawalSubTab === 'pending' ? 'bg-yellow-500 text-black' : 'text-zinc-400 hover:text-zinc-200'}`}
                        >
                           Pending Withdrawals ({pendingWithdrawalsList.length})
                        </button>
                        <button
                           onClick={() => setWithdrawalSubTab('history')}
                           className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${withdrawalSubTab === 'history' ? 'bg-yellow-500 text-black' : 'text-zinc-400 hover:text-zinc-200'}`}
                        >
                           Withdrawal History ({historyWithdrawalsList.length})
                        </button>
                     </div>
                  </div>

                  {/* List of withdrawal transactions based on sub-tab */}
                  <div className="space-y-4">
                     {withdrawalSubTab === 'pending' ? (
                        pendingWithdrawalsList.length === 0 ? (
                           <div className="text-center py-12 text-zinc-500 text-xs">No pending withdrawals found</div>
                        ) : (
                           pendingWithdrawalsList.sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime()).map((t, i) => {
                              const txUser = users.find(u => u.uid === t.userId || u.id === t.userId || u.username === t.username);
                              const userPhone = txUser?.phone || t.phone || 'N/A';
                              const userEmail = txUser?.email || 'N/A';
                              const accTitle = t.accountTitle || (t.details && t.details.includes('Title: ') ? t.details.split('|')[0].replace('Title: ', '').trim() : 'N/A');
                              const accNumber = t.accountNumber || t.phoneNumber || (t.details && t.details.includes('Number: ') ? t.details.split('|')[1].replace('Number: ', '').trim() : 'N/A');
                              const payMethod = t.method || t.paymentMethod || t.m || 'N/A';
                              return (
                                 <div key={i} className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex-1">
                                       <div className="flex items-center space-x-3 mb-2">
                                          <span className="px-2 py-1 rounded text-[9px] font-bold uppercase bg-red-500/10 text-red-500 border border-red-500/20">
                                             {t.type}
                                          </span>
                                          <span className="px-2 py-1 rounded text-[9px] font-bold uppercase bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                                             {t.status}
                                          </span>
                                          <span className="text-[10px] text-zinc-500">{new Date(t.date || t.createdAt).toLocaleString()}</span>
                                       </div>
                                       
                                       <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mt-3 items-center">
                                          <div className="md:col-span-4">
                                             <p className="text-[9px] text-zinc-500 uppercase font-bold mb-1">User Details</p>
                                             <p className="text-xs text-white font-bold">{t.username || 'Unknown'}</p>
                                             <p className="text-[10px] text-zinc-400 mt-0.5">{userPhone !== 'N/A' ? userPhone : 'No Phone'}</p>
                                             <p className="text-[10px] text-zinc-400 break-all">{userEmail !== 'N/A' ? userEmail : 'No Email'}</p>
                                          </div>
                                          
                                          <div className="md:col-span-5 bg-zinc-900/40 border border-zinc-800/80 p-3.5 rounded-xl space-y-2">
                                             <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-1">
                                                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Account Details</span>
                                                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                                                   payMethod.toLowerCase() === 'easypaisa' ? 'bg-green-500/10 text-green-500 border border-green-500/20' :
                                                   payMethod.toLowerCase() === 'jazzcash' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                                                   payMethod.toLowerCase() === 'sadapay' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' :
                                                   payMethod.toLowerCase() === 'nayapay' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                                                   'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                                                }`}>
                                                   {payMethod}
                                                </span>
                                             </div>
                                             <div className="grid grid-cols-1 gap-1.5">
                                                <div className="flex items-center justify-between bg-zinc-950/80 px-2.5 py-1.5 rounded-lg border border-zinc-800/50">
                                                   <div>
                                                      <span className="text-[8px] text-zinc-500 uppercase font-black block">Account Title</span>
                                                      <span className="text-xs text-white font-bold">{accTitle}</span>
                                                   </div>
                                                   {accTitle !== 'N/A' && (
                                                      <button onClick={() => { navigator.clipboard.writeText(accTitle); toast.success('Account Title copied!'); }} className="p-1 hover:bg-zinc-800 text-zinc-500 hover:text-yellow-500 rounded transition-colors" title="Copy Account Title">
                                                         <Copy className="w-3 h-3" />
                                                      </button>
                                                   )}
                                                </div>
                                                <div className="flex items-center justify-between bg-zinc-950/80 px-2.5 py-1.5 rounded-lg border border-zinc-800/50">
                                                   <div>
                                                      <span className="text-[8px] text-zinc-500 uppercase font-black block">Account Number</span>
                                                      <span className="text-xs text-white font-bold">{accNumber}</span>
                                                   </div>
                                                   {accNumber !== 'N/A' && (
                                                      <button onClick={() => { navigator.clipboard.writeText(accNumber); toast.success('Account Number copied!'); }} className="p-1 hover:bg-zinc-800 text-zinc-500 hover:text-yellow-500 rounded transition-colors" title="Copy Account Number">
                                                         <Copy className="w-3 h-3" />
                                                      </button>
                                                   )}
                                                </div>
                                                <div className="flex items-center justify-between bg-zinc-950/80 px-2.5 py-1.5 rounded-lg border border-zinc-800/50">
                                                   <div>
                                                      <span className="text-[8px] text-zinc-500 uppercase font-black block">Payment Method</span>
                                                      <span className={`text-xs font-black uppercase ${
                                                         payMethod.toLowerCase() === 'easypaisa' ? 'text-green-500' :
                                                         payMethod.toLowerCase() === 'jazzcash' ? 'text-red-500' :
                                                         payMethod.toLowerCase() === 'sadapay' ? 'text-sky-400' :
                                                         payMethod.toLowerCase() === 'nayapay' ? 'text-orange-400' :
                                                         'text-yellow-500'
                                                      }`}>
                                                         {payMethod}
                                                      </span>
                                                   </div>
                                                   {payMethod !== 'N/A' && (
                                                      <button onClick={() => { navigator.clipboard.writeText(payMethod); toast.success('Payment Method copied!'); }} className="p-1 hover:bg-zinc-800 text-zinc-500 hover:text-yellow-500 rounded transition-colors" title="Copy Payment Method">
                                                         <Copy className="w-3 h-3" />
                                                      </button>
                                                   )}
                                                </div>
                                             </div>
                                          </div>
                                          
                                          <div className="md:col-span-3">
                                             <p className="text-[9px] text-zinc-500 uppercase font-bold mb-1">Amount to Withdraw</p>
                                             <p className="text-sm font-black text-red-500">PKR {t.amount}</p>
                                          </div>
                                       </div>
                                    </div>
                                    
                                    <div className="flex flex-row md:flex-col gap-2 shrink-0 border-t border-zinc-800 md:border-t-0 md:border-l pt-3 md:pt-0 md:pl-4">
                                       <button onClick={() => confirmApproveTransaction(t)} className="flex-1 bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-black border border-green-500/30 font-bold text-xs px-4 py-2 rounded-lg transition-colors uppercase">
                                          Approve
                                       </button>
                                       <button onClick={() => confirmRejectTransaction(t)} className="flex-1 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-black border border-red-500/30 font-bold text-xs px-4 py-2 rounded-lg transition-colors uppercase">
                                          Reject
                                       </button>
                                    </div>
                                 </div>
                              );
                           })
                        )
                     ) : (
                        historyWithdrawalsList.length === 0 ? (
                           <div className="text-center py-12 text-zinc-500 text-xs">No withdrawal history found</div>
                        ) : (
                           historyWithdrawalsList.sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime()).map((t, i) => {
                              const txUser = users.find(u => u.uid === t.userId || u.id === t.userId || u.username === t.username);
                              const userPhone = txUser?.phone || t.phone || 'N/A';
                              const userEmail = txUser?.email || 'N/A';
                              const accTitle = t.accountTitle || (t.details && t.details.includes('Title: ') ? t.details.split('|')[0].replace('Title: ', '').trim() : 'N/A');
                              const accNumber = t.accountNumber || t.phoneNumber || (t.details && t.details.includes('Number: ') ? t.details.split('|')[1].replace('Number: ', '').trim() : 'N/A');
                              const payMethod = t.method || t.paymentMethod || t.m || 'N/A';
                              return (
                                 <div key={i} className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex-1">
                                       <div className="flex items-center space-x-3 mb-2">
                                          <span className="px-2 py-1 rounded text-[9px] font-bold uppercase bg-red-500/10 text-red-500 border border-red-500/20">
                                             {t.type}
                                          </span>
                                          <span className={`px-2 py-1 rounded text-[9px] font-bold uppercase border ${t.status === 'completed' || t.status === 'approved' || t.status === 'APPROVED' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                                             {t.status === 'completed' || t.status === 'approved' || t.status === 'APPROVED' ? 'Approved' : 'Rejected'}
                                          </span>
                                          <span className="text-[10px] text-zinc-500">{new Date(t.date || t.createdAt).toLocaleString()}</span>
                                       </div>
                                       
                                       <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mt-3 items-center">
                                          <div className="md:col-span-4">
                                             <p className="text-[9px] text-zinc-500 uppercase font-bold mb-1">User Details</p>
                                             <p className="text-xs text-white font-bold">{t.username || 'Unknown'}</p>
                                             <p className="text-[10px] text-zinc-400 mt-0.5">{userPhone !== 'N/A' ? userPhone : 'No Phone'}</p>
                                             <p className="text-[10px] text-zinc-400 break-all">{userEmail !== 'N/A' ? userEmail : 'No Email'}</p>
                                          </div>
                                          
                                          <div className="md:col-span-5 bg-zinc-900/40 border border-zinc-800/80 p-3.5 rounded-xl space-y-2">
                                             <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-1">
                                                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Account Details</span>
                                                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                                                   payMethod.toLowerCase() === 'easypaisa' ? 'bg-green-500/10 text-green-500 border border-green-500/20' :
                                                   payMethod.toLowerCase() === 'jazzcash' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                                                   payMethod.toLowerCase() === 'sadapay' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' :
                                                   payMethod.toLowerCase() === 'nayapay' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                                                   'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                                                }`}>
                                                   {payMethod}
                                                </span>
                                             </div>
                                             <div className="grid grid-cols-1 gap-1.5">
                                                <div className="flex items-center justify-between bg-zinc-950/80 px-2.5 py-1.5 rounded-lg border border-zinc-800/50">
                                                   <div>
                                                      <span className="text-[8px] text-zinc-500 uppercase font-black block">Account Title</span>
                                                      <span className="text-xs text-white font-bold">{accTitle}</span>
                                                   </div>
                                                   {accTitle !== 'N/A' && (
                                                      <button onClick={() => { navigator.clipboard.writeText(accTitle); toast.success('Account Title copied!'); }} className="p-1 hover:bg-zinc-800 text-zinc-500 hover:text-yellow-500 rounded transition-colors" title="Copy Account Title">
                                                         <Copy className="w-3 h-3" />
                                                      </button>
                                                   )}
                                                </div>
                                                <div className="flex items-center justify-between bg-zinc-950/80 px-2.5 py-1.5 rounded-lg border border-zinc-800/50">
                                                   <div>
                                                      <span className="text-[8px] text-zinc-500 uppercase font-black block">Account Number</span>
                                                      <span className="text-xs text-white font-bold">{accNumber}</span>
                                                   </div>
                                                   {accNumber !== 'N/A' && (
                                                      <button onClick={() => { navigator.clipboard.writeText(accNumber); toast.success('Account Number copied!'); }} className="p-1 hover:bg-zinc-800 text-zinc-500 hover:text-yellow-500 rounded transition-colors" title="Copy Account Number">
                                                         <Copy className="w-3 h-3" />
                                                      </button>
                                                   )}
                                                </div>
                                                <div className="flex items-center justify-between bg-zinc-950/80 px-2.5 py-1.5 rounded-lg border border-zinc-800/50">
                                                   <div>
                                                      <span className="text-[8px] text-zinc-500 uppercase font-black block">Payment Method</span>
                                                      <span className={`text-xs font-black uppercase ${
                                                         payMethod.toLowerCase() === 'easypaisa' ? 'text-green-500' :
                                                         payMethod.toLowerCase() === 'jazzcash' ? 'text-red-500' :
                                                         payMethod.toLowerCase() === 'sadapay' ? 'text-sky-400' :
                                                         payMethod.toLowerCase() === 'nayapay' ? 'text-orange-400' :
                                                         'text-yellow-500'
                                                      }`}>
                                                         {payMethod}
                                                      </span>
                                                   </div>
                                                   {payMethod !== 'N/A' && (
                                                      <button onClick={() => { navigator.clipboard.writeText(payMethod); toast.success('Payment Method copied!'); }} className="p-1 hover:bg-zinc-800 text-zinc-500 hover:text-yellow-500 rounded transition-colors" title="Copy Payment Method">
                                                         <Copy className="w-3 h-3" />
                                                      </button>
                                                   )}
                                                </div>
                                             </div>
                                          </div>
                                          
                                          <div className="md:col-span-3">
                                             <p className="text-[9px] text-zinc-500 uppercase font-bold mb-1">Amount</p>
                                             <p className="text-sm font-black text-red-500">PKR {t.amount}</p>
                                          </div>
                                       </div>
                                    </div>
                                 </div>
                              );
                           })
                        )
                     )}
                  </div>
               </div>
            ) : activeTab === 'promo_codes' ? (
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
                   <div className="flex items-center space-x-3 mb-6">
                       <div className="bg-yellow-500/10 p-2 rounded-xl">
                         <Tag className="w-5 h-5 text-yellow-500" />
                       </div>
                       <div>
                         <h3 className="text-sm font-bold text-white uppercase tracking-wider">Promo Codes Management</h3>
                         <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black mt-1">Generate promo codes, specify rewards, set used limits, and view redemption details</p>
                       </div>
                   </div>

                   {/* Generate Form */}
                   <div className="bg-zinc-950 p-6 rounded-2xl border border-zinc-800/80 mb-8 max-w-4xl">
                      <h4 className="text-xs font-black text-yellow-500 uppercase tracking-widest mb-4">Generate Promo Code</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                         <div>
                            <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-wider mb-2">Promo Code Text</label>
                            <input 
                               type="text" 
                               value={promoCodeInput}
                               onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                               placeholder="e.g. PAK50"
                               className="w-full bg-zinc-900 border border-zinc-800/80 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-yellow-500 placeholder-zinc-600 font-bold uppercase tracking-wider font-sans"
                            />
                         </div>
                         <div>
                            <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-wider mb-2">Reward Amount (Coins)</label>
                            <input 
                               type="number" 
                               value={promoAmountInput}
                               onChange={(e) => setPromoAmountInput(e.target.value)}
                               placeholder="e.g. 100"
                               className="w-full bg-zinc-900 border border-zinc-800/80 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-yellow-500 placeholder-zinc-600 font-bold font-sans"
                            />
                         </div>
                         <div>
                            <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-wider mb-2">Expiry Date (Optional)</label>
                            <input 
                               type="date" 
                               value={promoExpireDate}
                               onChange={(e) => setPromoExpireDate(e.target.value)}
                               className="w-full bg-zinc-900 border border-zinc-800/80 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-yellow-500 font-bold uppercase font-sans"
                            />
                         </div>
                         <div>
                            <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-wider mb-2">Usage Limit (Default 1)</label>
                            <input 
                               type="number" 
                               value={promoUsedLimit}
                               onChange={(e) => setPromoUsedLimit(Number(e.target.value))}
                               placeholder="e.g. 1"
                               min="1"
                               className="w-full bg-zinc-900 border border-zinc-800/80 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-yellow-500 font-bold font-sans"
                            />
                         </div>
                      </div>
                      <div className="flex justify-end mt-4 font-sans">
                         <button
                            onClick={handleGeneratePromoCode}
                            className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-xs uppercase px-6 py-2.5 rounded-xl flex items-center space-x-2 transition-all active:scale-95 font-sans"
                         >
                            <Plus className="w-4 h-4" />
                            <span>Generate Promo Code</span>
                         </button>
                      </div>
                   </div>

                   {/* Sub Tabs */}
                   <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-6">
                      <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                         <button
                            onClick={() => setPromoSubTab('active')}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${promoSubTab === 'active' ? 'bg-yellow-500 text-black' : 'text-zinc-400 hover:text-zinc-200'}`}
                         >
                            Active Promos ({activePromos.length})
                         </button>
                         <button
                            onClick={() => setPromoSubTab('used')}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${promoSubTab === 'used' ? 'bg-yellow-500 text-black' : 'text-zinc-400 hover:text-zinc-200'}`}
                         >
                            Used / Expired Promos ({usedPromos.length})
                         </button>
                      </div>
                   </div>

                   {/* Promo Codes List */}
                   <div className="space-y-4">
                      {(promoSubTab === 'active' ? activePromos : usedPromos).length === 0 ? (
                         <div className="text-center py-12 bg-zinc-950/40 rounded-2xl border border-zinc-850 flex flex-col items-center justify-center text-zinc-500">
                            <Tag className="w-12 h-12 text-zinc-800 mb-3" />
                            <p className="text-xs font-bold uppercase tracking-widest">No promo codes found in this tab.</p>
                         </div>
                      ) : (
                         <div className="grid grid-cols-1 gap-4">
                            {(promoSubTab === 'active' ? activePromos : usedPromos).map((promo) => {
                               const redeemersObj = promo.redeemers || {};
                               const redeemCount = Object.keys(redeemersObj).length;
                               const limitVal = promo.usedLimit !== undefined ? Number(promo.usedLimit) : 1;
                               const isExpired = promo.isExpired;

                               return (
                                  <div key={promo.code} className="bg-zinc-950/80 border border-zinc-800/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-zinc-700/80 transition-all font-sans">
                                     <div className="space-y-2">
                                        <div className="flex items-center space-x-2.5">
                                           <span className="text-sm font-black text-yellow-500 bg-yellow-500/10 border border-yellow-500/20 px-3 py-1 rounded-xl uppercase tracking-widest font-sans">
                                              {promo.code}
                                           </span>
                                           <span className="text-xs font-bold text-white flex items-center space-x-1 bg-zinc-900 px-2.5 py-1 rounded-xl">
                                              <span>{promo.coins} Coins</span>
                                           </span>
                                           {isExpired && (
                                              <span className="text-[9px] font-black uppercase bg-red-500/10 border border-red-500/30 text-red-500 px-2 py-0.5 rounded-lg">
                                                 Expired
                                              </span>
                                           )}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-zinc-500 font-medium">
                                           <span className="flex items-center space-x-1">
                                              <Clock className="w-3.5 h-3.5 text-zinc-600" />
                                              <span>Usage: <strong className="text-zinc-300 font-bold">{redeemCount} / {limitVal}</strong></span>
                                           </span>
                                           {promo.expireDate && (
                                              <span className="flex items-center space-x-1">
                                                 <Calendar className="w-3.5 h-3.5 text-zinc-600" />
                                                 <span>Expires: <strong className={isExpired ? 'text-red-500 font-bold' : 'text-zinc-300 font-bold'}>{format(new Date(promo.expireDate), 'MMM dd, yyyy')}</strong></span>
                                              </span>
                                           )}
                                        </div>
                                     </div>

                                     <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center font-sans">
                                        <button
                                           onClick={() => {
                                              setSelectedPromoCode(promo.code);
                                              setSelectedPromoRedeemers(promo.redeemers || {});
                                              setIsRedeemersModalOpen(true);
                                           }}
                                           className="p-2.5 bg-yellow-500/10 hover:bg-yellow-500 hover:text-black text-yellow-500 rounded-xl transition-all border border-yellow-500/20 flex items-center justify-center space-x-1.5 active:scale-95 text-[10px] font-bold uppercase tracking-wider"
                                           title="View Redeemers"
                                        >
                                           <UserIcon className="w-4 h-4" />
                                           <span>Redeemers ({redeemCount})</span>
                                        </button>
                                        <button
                                           onClick={() => handleDeletePromoCode(promo.code)}
                                           className="p-2.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 rounded-xl transition-all flex items-center justify-center active:scale-95"
                                           title="Delete Promo Code"
                                        >
                                           <Trash2 className="w-4 h-4" />
                                        </button>
                                     </div>
                                  </div>
                               );
                            })}
                         </div>
                      )}
                   </div>
                </div>
             ) : activeTab === 'leaderboard' ? (
             <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/5 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="flex items-center justify-between mb-8 relative z-10">
                   <div>
                      <h3 className="text-sm font-black text-yellow-500 uppercase tracking-widest">Hall of Fame</h3>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-tight mt-1">Top players by total earnings</p>
                   </div>
                   <div className="p-2 bg-yellow-500/10 rounded-xl border border-yellow-500/20">
                      <Medal className="w-5 h-5 text-yellow-500" />
                   </div>
                </div>

                <div className="grid grid-cols-1 gap-3 relative z-10">
                  {topPlayers.map((p, index) => (
                    <motion.div 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      key={p.uid || index} 
                      className={`flex items-center justify-between p-3 sm:p-4 rounded-2xl border transition-all ${
                        index === 0 ? 'bg-yellow-500/5 border-yellow-500/30 shadow-[0_0_20px_rgba(234,179,8,0.05)]' : 
                        index === 1 ? 'bg-zinc-400/5 border-zinc-400/20' :
                        index === 2 ? 'bg-orange-400/5 border-orange-400/20' :
                        'bg-zinc-950/50 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                       <div className="flex items-center space-x-3 sm:space-x-5 min-w-0">
                          <div className={`w-8 h-8 sm:w-10 sm:h-10 shrink-0 flex items-center justify-center rounded-xl font-black text-base sm:text-lg ${
                            index === 0 ? 'bg-yellow-500 text-black shadow-[0_0_15px_rgba(234,179,8,0.3)]' : 
                            index === 1 ? 'bg-zinc-400 text-black' :
                            index === 2 ? 'bg-orange-400 text-black' :
                            'bg-zinc-900 text-zinc-500 border border-zinc-800'
                          }`}>
                            {index + 1}
                          </div>
                          <div className="relative shrink-0">
                            <img src={p.profilePic || p.avatarUrl || DEFAULT_AVATAR} className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl border-2 border-zinc-800 object-cover shadow-xl" alt="" />
                            {index === 0 && <Trophy className="absolute -top-1.5 -right-1.5 w-4 h-4 sm:w-5 sm:h-5 text-yellow-500 drop-shadow-lg" />}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center space-x-2">
                               <span className="text-xs sm:text-sm font-black text-white uppercase tracking-tight truncate">{p.username}</span>
                               {p.isVerified && <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-blue-500 rounded-full flex items-center justify-center shrink-0"><Check className="w-1.5 h-1.5 sm:w-2 sm:h-2 text-white" /></div>}
                            </div>
                            <div className="flex items-center space-x-2 sm:space-x-3 mt-1">
                               <div className="text-[8px] sm:text-[9px] text-zinc-500 font-bold flex items-center uppercase tracking-wider whitespace-nowrap"><Medal className="w-2 h-2 sm:w-2.5 sm:h-2.5 mr-1 text-zinc-600" /> {p.totalKills || 0} K</div>
                               <div className="text-[8px] sm:text-[9px] text-zinc-500 font-bold flex items-center uppercase tracking-wider whitespace-nowrap"><Trophy className="w-2 h-2 sm:w-2.5 sm:h-2.5 mr-1 text-zinc-600" /> {p.totalMatches || 0} P</div>
                            </div>
                          </div>
                       </div>
                       <div className="text-right shrink-0">
                          <div className="text-[8px] sm:text-[9px] text-zinc-500 font-black uppercase tracking-[0.1em] sm:tracking-[0.2em] mb-0.5 sm:mb-1">Earnings</div>
                          <div className={`text-sm sm:text-lg font-black tracking-tighter ${index === 0 ? 'text-yellow-500' : 'text-white'}`}>PKR {p.totalEarnings || 0}</div>
                       </div>
                    </motion.div>
                  ))}
                  {topPlayers.length === 0 && <div className="text-center text-zinc-500 py-12 flex flex-col items-center">
                    <Award className="w-12 h-12 opacity-10 mb-3" />
                    <span className="text-xs font-bold uppercase tracking-widest">No players found</span>
                  </div>}
                </div>
             </div>
           ) : activeTab === 'matches' ? (
             <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
                <div className="flex justify-between items-center mb-6">
                   <h3 className="text-sm font-bold text-yellow-500 uppercase tracking-wider">All Matches ({tournaments.filter(t => !t.isDeleted).length})</h3>
                   <button onClick={() => setIsCreateMatchModalOpen(true)} className="bg-yellow-500 text-black px-4 py-2 rounded-lg font-bold text-xs uppercase hover:bg-yellow-400 transition-colors">Schedule Match</button>
                </div>
                <div className="overflow-x-auto">
                   <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-zinc-500 border-b border-zinc-800">
                          <th className="pb-3 font-normal">ID</th>
                          <th className="pb-3 font-normal">TITLE</th>
                          <th className="pb-3 font-normal">TYPE</th>
                          <th className="pb-3 font-normal">START TIME</th>
                          <th className="pb-3 font-normal">STATUS</th>
                          <th className="pb-3 font-normal">ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody className="text-zinc-300">
                         {tournaments.filter(t => !t.isDeleted).map((t, i) => (
                           <tr key={i} className="border-b border-zinc-800/50 hover:bg-zinc-800/20">
                             <td className="py-3 text-zinc-500">#{t.id?.substring(0,6).toUpperCase()}</td>
                             <td className="py-3 font-bold">{t.title}</td>
                             <td className="py-3">{t.type}</td>
                             <td className="py-3">{new Date(t.startTime).toLocaleString()}</td>
                             <td className="py-3"><span className="text-yellow-500 uppercase text-[10px] border border-yellow-500/30 px-2 py-0.5 rounded">{t.status}</span></td>
                             <td className="py-3">
                               <button className="text-[10px] text-blue-400 hover:text-blue-300 mr-2">Edit</button>
                               <button onClick={() => handleDeleteMatch(t.id)} className="text-[10px] text-red-400 hover:text-red-300">Delete</button>
                             </td>
                           </tr>
                         ))}
                      </tbody>
                   </table>
                </div>
             </div>
           ) : activeTab === 'results' ? (
             <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-sm font-bold text-yellow-500 uppercase tracking-wider">Result History</h3>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                   {tournaments
                     .filter(t => t.status === 'COMPLETED' || t.winnerId || t.hasResults)
                     .map((t, i) => (
                       <div key={t.id || i} className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl flex flex-col group hover:border-yellow-500/30 transition-all">
                          <div className="relative h-28 bg-zinc-900 overflow-hidden">
                             <img src={t.image || "/match-card.png"} alt={t.title} className="w-full h-full object-cover opacity-40 group-hover:scale-110 transition-transform duration-700" />
                             <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 to-transparent" />
                             <div className="absolute top-3 left-3 flex items-center space-x-2">
                                <span className="text-[8px] font-black text-yellow-500 bg-black/60  px-2 py-1 rounded border border-yellow-500/20 uppercase tracking-[0.2em]">#{t.id?.substring(0,6).toUpperCase()}</span>
                                <span className={`text-[8px] font-black px-2 py-1 rounded border uppercase tracking-wider ${t.status === 'COMPLETED' ? 'text-green-400 border-green-400/20 bg-green-400/5' : 'text-blue-400 border-blue-400/20 bg-blue-400/5'}`}>{t.status}</span>
                             </div>
                             <div className="absolute bottom-3 left-4 text-left">
                                <h4 className="font-black text-white text-sm uppercase tracking-tight mb-1">{t.title}</h4>
                                <div className="flex items-center space-x-3 text-[9px] text-zinc-400 font-bold">
                                   <span className="flex items-center space-x-1"><Trophy className="w-2.5 h-2.5 text-yellow-500" /> <span>{t.type} {t.mode}</span></span>
                                   <span className="flex items-center space-x-1"><MapPin className="w-2.5 h-2.5 text-blue-500" /> <span>{t.map}</span></span>
                                </div>
                             </div>
                          </div>
                          
                          <div className="p-4 flex-1 space-y-4">
                             <div className="grid grid-cols-2 gap-3">
                                <div className="bg-zinc-900/50 rounded-xl p-2.5 border border-zinc-800/50">
                                   <div className="text-[8px] text-zinc-500 font-black uppercase tracking-widest mb-1">Prize Pool</div>
                                   <div className="text-[10px] font-black text-white uppercase tracking-tighter">PKR {t.prizePool}</div>
                                </div>
                                <div className="bg-zinc-900/50 rounded-xl p-2.5 border border-zinc-800/50">
                                   <div className="text-[8px] text-zinc-500 font-black uppercase tracking-widest mb-1">Per Kill</div>
                                   <div className="text-[10px] font-black text-blue-400 uppercase tracking-tighter">PKR {t.perKill || 0}</div>
                                </div>
                             </div>

                             {t.winnerId ? (
                                <div className="bg-zinc-900/50 rounded-xl p-3 border border-yellow-500/20 bg-yellow-500/5">
                                   <div className="text-[8px] text-zinc-500 font-black uppercase tracking-widest mb-1.5 flex justify-between">
                                      <span>Champion</span>
                                      <span className="text-yellow-500">WINNER</span>
                                   </div>
                                   <div className="flex items-center justify-between">
                                      <div className="flex items-center space-x-2">
                                         <div className="w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center">
                                            <Award className="w-3.5 h-3.5 text-black" />
                                         </div>
                                         <span className="text-[11px] font-black text-white uppercase line-clamp-1">{users.find(u => u.uid === t.winnerId)?.username || 'User'}</span>
                                      </div>
                                      <span className="text-[10px] font-bold text-yellow-500">+{t.winnerKills || 0} Kills</span>
                                   </div>
                                </div>
                             ) : t.hasResults ? (
                                <div className="bg-zinc-900/50 rounded-xl p-3 border border-blue-500/20 bg-blue-500/5 text-center">
                                   <p className="text-[9px] text-blue-400 font-black uppercase tracking-[0.2em]">Individual Results Added</p>
                                </div>
                             ) : (
                                <div className="bg-zinc-900/50 rounded-xl p-3 border border-dashed border-zinc-800 text-center">
                                   <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest italic">Pending Assignment</p>
                                </div>
                             )}
                          </div>
                          
                          <div className="p-3 border-t border-zinc-800 bg-zinc-900/30">
                             <button 
                               onClick={() => handleViewPlayers(t.id)} 
                               className="w-full bg-blue-500/10 text-blue-400 border border-blue-500/30 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] hover:bg-blue-500/20 transition-all flex items-center justify-center space-x-2"
                             >
                                <FileSearch className="w-3 h-3" />
                                <span>View Results</span>
                             </button>
                          </div>
                       </div>
                   ))}
                   {tournaments.filter(t => t.status === 'COMPLETED' || t.winnerId).length === 0 && (
                     <div className="col-span-full py-20 text-center flex flex-col items-center">
                       <Award className="w-16 h-16 text-zinc-800 mb-4 opacity-20" />
                       <p className="text-zinc-600 font-black uppercase tracking-[0.3em] text-xs">No result history found</p>
                     </div>
                   )}
                </div>
             </div>
           ) : activeTab === 'announcements' ? (
             <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                   <div>
                     <h3 className="text-sm font-bold text-yellow-500 uppercase tracking-wider">Announcements & News</h3>
                     <p className="text-[11px] text-zinc-400 mt-0.5">Publish winner announcements, match cancellations, alerts, and news for all players</p>
                   </div>
                   <button 
                     onClick={() => {
                       setNewAnnouncement({ title: '', description: '', imageUrl: '', tag: 'NEWS' });
                       setIsAnnouncementModalOpen(true);
                     }}
                     className="flex items-center space-x-2 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-black px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-yellow-500/10 active:scale-95"
                   >
                     <Plus className="w-4 h-4" />
                     <span>Add Announcement</span>
                   </button>
                </div>

                {/* Announcements Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                   {announcements.map((item) => (
                     <div key={item.id || Math.random()} className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl flex flex-col justify-between group hover:border-yellow-500/30 transition-all">
                       <div>
                         {item.imageUrl && (
                           <div className="relative h-44 bg-zinc-900 overflow-hidden border-b border-zinc-800/60">
                             <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                           </div>
                         )}
                         <div className="p-5 space-y-3">
                           <div className="flex items-center justify-between gap-2">
                             <span className="text-[8px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                               {item.tag || 'NEWS'}
                             </span>
                             <span className="text-[10px] text-zinc-500 font-medium">
                               {item.createdAt ? new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent'}
                             </span>
                           </div>
                           <h4 className="font-black text-white text-base leading-snug">{item.title}</h4>
                           <p className="text-xs text-zinc-400 leading-relaxed whitespace-pre-line line-clamp-4">{item.description}</p>
                         </div>
                       </div>

                       <div className="p-5 pt-3 border-t border-zinc-800/80 flex items-center justify-between bg-zinc-950/50">
                         <span className="text-[9px] text-zinc-600 font-mono">ID: {item.id?.substring(0, 8)}</span>
                         <button 
                           onClick={() => handleDeleteAnnouncement(item.id)}
                           className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-[10px] font-black uppercase tracking-wider transition-all"
                         >
                           <Trash2 className="w-3 h-3" />
                           <span>Delete</span>
                         </button>
                       </div>
                     </div>
                   ))}

                   {announcements.length === 0 && (
                     <div className="col-span-full py-20 text-center flex flex-col items-center">
                       <Megaphone className="w-16 h-16 text-zinc-800 mb-4 opacity-30" />
                       <p className="text-zinc-500 font-black uppercase tracking-[0.2em] text-xs mb-2">No announcements published yet</p>
                       <p className="text-zinc-600 text-[11px] max-w-sm">Click "Add Announcement" above to publish winner announcements, match alerts, or news.</p>
                     </div>
                   )}
                </div>
             </div>
           ) : activeTab === 'popups' ? (
             <div className="space-y-6">
               {/* Header */}
               <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-900/50 p-6 rounded-3xl border border-zinc-800">
                 <div>
                   <div className="flex items-center space-x-2">
                     <h2 className="text-xl font-black text-white uppercase tracking-wider">APP OPEN POPUPS</h2>
                     <span className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-[10px] font-black px-2 py-0.5 rounded-full">
                       {popups.length} TOTAL
                     </span>
                   </div>
                   <p className="text-[11px] text-zinc-400 mt-0.5">
                     Create popups shown with title, optional image, description, and OK button when users open the app
                   </p>
                 </div>
                 <button
                   onClick={handleOpenAddPopup}
                   className="flex items-center space-x-2 bg-yellow-500 hover:bg-yellow-400 text-black px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(234,179,8,0.2)] active:scale-95 shrink-0"
                 >
                   <Plus className="w-4 h-4 stroke-[3]" />
                   <span>ADD POPUP</span>
                 </button>
               </div>

               {/* Added Popups Grid */}
               <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                 {popups.map((item) => (
                   <div
                     key={item.id || Math.random()}
                     className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl flex flex-col justify-between group hover:border-yellow-500/30 transition-all"
                   >
                     <div>
                       {/* Optional Image */}
                       {item.imageUrl ? (
                         <div className="relative h-48 bg-zinc-900 overflow-hidden border-b border-zinc-800/60">
                           <img
                             src={item.imageUrl}
                             alt={item.title}
                             className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                             onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                           />
                           <div className="absolute top-3 right-3">
                             <span className={`text-[8px] font-black uppercase tracking-[0.2em] px-2 py-1 rounded-md shadow-md border ${
                               item.isActive !== false
                                 ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                                 : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                             }`}>
                               {item.isActive !== false ? 'ACTIVE' : 'INACTIVE'}
                             </span>
                           </div>
                         </div>
                       ) : (
                         <div className="p-4 bg-zinc-900/40 border-b border-zinc-800/60 flex items-center justify-between">
                           <div className="flex items-center space-x-2 text-yellow-500">
                             <BellRing className="w-4 h-4" />
                             <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">No Image (Text Only)</span>
                           </div>
                           <span className={`text-[8px] font-black uppercase tracking-[0.2em] px-2 py-1 rounded-md border ${
                             item.isActive !== false
                               ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                               : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                           }`}>
                             {item.isActive !== false ? 'ACTIVE' : 'INACTIVE'}
                           </span>
                         </div>
                       )}

                       <div className="p-5 space-y-3">
                         <div className="flex items-center justify-between gap-2">
                           <span className="text-[10px] text-zinc-500 font-medium">
                             {item.createdAt ? new Date(item.createdAt).toLocaleDateString(undefined, {
                               month: 'short',
                               day: 'numeric',
                               year: 'numeric'
                             }) : 'Recent'}
                           </span>
                         </div>
                         <h4 className="font-black text-white text-base leading-snug">{item.title}</h4>
                         <p className="text-xs text-zinc-400 leading-relaxed whitespace-pre-line line-clamp-4">
                           {item.description}
                         </p>
                       </div>
                     </div>

                     {/* Action Buttons: Edit and Delete */}
                     <div className="p-4 border-t border-zinc-800/80 flex items-center justify-between bg-zinc-950/50 gap-2">
                       <span className="text-[9px] text-zinc-600 font-mono">ID: {item.id?.substring(0, 8)}</span>
                       <div className="flex items-center space-x-2">
                         <button
                           onClick={() => handleOpenEditPopup(item)}
                           className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 border border-yellow-500/20 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                           title="Edit Popup"
                         >
                           <Edit2 className="w-3 h-3" />
                           <span>Edit</span>
                         </button>
                         <button
                           onClick={() => handleDeletePopup(item.id)}
                           className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                           title="Delete Popup"
                         >
                           <Trash2 className="w-3 h-3" />
                           <span>Delete</span>
                         </button>
                       </div>
                     </div>
                   </div>
                 ))}

                 {popups.length === 0 && (
                   <div className="col-span-full py-20 text-center flex flex-col items-center">
                     <div className="w-16 h-16 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-500 mb-4">
                       <BellRing className="w-8 h-8" />
                     </div>
                     <p className="text-zinc-500 font-black uppercase tracking-[0.2em] text-xs mb-2">No popups added yet</p>
                     <p className="text-zinc-600 text-[11px] max-w-sm mb-4">
                       Click "Add Popup" above to create an alert with title, optional image, and description that pops up when users open the app.
                     </p>
                     <button
                       onClick={handleOpenAddPopup}
                       className="px-5 py-2.5 bg-yellow-500 text-black font-black text-xs uppercase tracking-wider rounded-xl hover:bg-yellow-400 transition-all cursor-pointer"
                     >
                       + Add First Popup
                     </button>
                   </div>
                 )}
               </div>
             </div>
           ) : activeTab === 'wallet' ? (
             <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-yellow-500 uppercase tracking-wider mb-6">Wallet & Payments Management</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                  <div className="bg-zinc-950 p-6 rounded-xl border border-zinc-800">
                    <h4 className="text-white font-bold mb-4">Pending Deposits ({pendingDeposits})</h4>
                    <div className="space-y-3">
                      {transactions.filter(t => t.type === 'deposit' && t.status === 'pending').map((t, i) => (
                        <div key={i} className="flex justify-between items-center border-b border-zinc-800 pb-3">
                          <div>
                            <div className="text-sm text-white font-bold">{t.userId?.substring(0,8)}...</div>
                            <div className="text-[10px] text-zinc-500">{t.paymentMethod} - {new Date(t.createdAt).toLocaleString()}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-green-500 font-bold text-sm">+ PKR {t.amount}</div>
                            <div className="space-x-2 mt-1 flex justify-end">
                              <button onClick={() => handleApproveTransaction(t)} className="text-[10px] text-green-400 bg-green-500/10 px-2 py-0.5 rounded border border-green-500/30 hover:bg-green-500/20">Approve</button>
                              <button onClick={() => handleRejectTransaction(t)} className="text-[10px] text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/30 hover:bg-red-500/20">Reject</button>
                            </div>
                          </div>
                        </div>
                      ))}
                      {pendingDeposits === 0 && <div className="text-sm text-zinc-500 text-center py-4">No pending deposits</div>}
                    </div>
                  </div>
                  <div className="bg-zinc-950 p-6 rounded-xl border border-zinc-800">
                    <h4 className="text-white font-bold mb-4">Pending Withdrawals ({pendingWithdraw})</h4>
                    <div className="space-y-3">
                      {transactions.filter(t => t.type === 'withdraw' && t.status === 'pending').map((t, i) => (
                        <div key={i} className="flex justify-between items-center border-b border-zinc-800 pb-3">
                          <div>
                            <div className="text-sm text-white font-bold">{t.userId?.substring(0,8)}...</div>
                            <div className="text-[10px] text-zinc-500">{t.paymentMethod} - {new Date(t.createdAt).toLocaleString()}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-red-500 font-bold text-sm">- PKR {t.amount}</div>
                            <div className="space-x-2 mt-1 flex justify-end">
                              <button onClick={() => handleApproveTransaction(t)} className="text-[10px] text-green-400 bg-green-500/10 px-2 py-0.5 rounded border border-green-500/30 hover:bg-green-500/20">Approve</button>
                              <button onClick={() => handleRejectTransaction(t)} className="text-[10px] text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/30 hover:bg-red-500/20">Reject</button>
                            </div>
                          </div>
                        </div>
                      ))}
                      {pendingWithdraw === 0 && <div className="text-sm text-zinc-500 text-center py-4">No pending withdrawals</div>}
                    </div>
                  </div>
                </div>
             </div>
            ) : activeTab === 'referrals' ? (
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 md:p-6">
                <h3 className="text-sm font-bold text-yellow-500 uppercase tracking-wider mb-6">Referral System</h3>
                <div className="bg-zinc-950 p-4 md:p-6 rounded-xl border border-zinc-800 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div>
                    <h4 className="text-white font-bold text-lg mb-1">Global Referral Settings</h4>
                    <p className="text-xs text-zinc-500">Configure how many coins users get for referring friends.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                    <div className="flex-1 md:flex-none">
                      <label className="text-[10px] text-zinc-400 uppercase mb-1 block">Referrer Bonus</label>
                      <input type="number" value={settings?.referrerBonus || 50} onChange={(e) => setSettings({...settings, referrerBonus: parseInt(e.target.value)})} className="bg-zinc-900 border border-zinc-800 text-white px-3 py-1.5 rounded w-full md:w-24 text-sm" />
                    </div>
                    <div className="flex-1 md:flex-none">
                      <label className="text-[10px] text-zinc-400 uppercase mb-1 block">Referee Bonus</label>
                      <input type="number" value={settings?.refereeBonus || 25} onChange={(e) => setSettings({...settings, refereeBonus: parseInt(e.target.value)})} className="bg-zinc-900 border border-zinc-800 text-white px-3 py-1.5 rounded w-full md:w-24 text-sm" />
                    </div>
                    <div className="pt-0 md:pt-5 w-full md:w-auto">
                      <button onClick={async () => { await update(ref(db, 'appSettings'), { referrerBonus: settings?.referrerBonus || 50, refereeBonus: settings?.refereeBonus || 25 }); toast.success('Referral settings saved'); }} className="bg-yellow-500 text-black px-6 py-2 rounded-xl font-bold text-xs uppercase tracking-widest w-full">Save Settings</button>
                    </div>
                  </div>
                </div>
                <div className="text-center text-zinc-500 py-12 md:py-20 border border-dashed border-zinc-800 rounded-xl">
                   <Users className="w-12 h-12 mx-auto mb-4 opacity-10" />
                   <p className="text-xs font-bold uppercase tracking-widest">Referral logs will appear here</p>
                </div>
             </div>
           ) : activeTab === 'payment_settings' ? (
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
                 <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6 border-b border-zinc-800 pb-4">
                    <div>
                      <h3 className="text-sm font-bold text-yellow-500 uppercase tracking-wider font-sans">Payment Settings</h3>
                      <p className="text-[10px] text-zinc-500 mt-1 font-mono">Configure deposit and withdrawal system details and status</p>
                    </div>
                    {/* Sub-tabs */}
                    <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800/80 self-start md:self-center">
                      <button
                        onClick={() => setPaymentSubTab('deposit')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          paymentSubTab === 'deposit'
                            ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/10'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        Deposit Settings
                      </button>
                      <button
                        onClick={() => setPaymentSubTab('withdrawal')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          paymentSubTab === 'withdrawal'
                            ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/10'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        Withdrawal Settings
                      </button>
                    </div>
                 </div>

                 <AnimatePresence mode="wait">
                   {paymentSubTab === 'deposit' ? (
                     <motion.div
                       key="deposit-settings"
                       initial={{ opacity: 0, y: 10 }}
                       animate={{ opacity: 1, y: 0 }}
                       exit={{ opacity: 0, y: -10 }}
                       className="space-y-6"
                     >
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         {/* EasyPaisa Deposit Settings */}
                         <div className="bg-zinc-950 p-5 rounded-xl border border-zinc-800/50 space-y-4">
                           <div className="flex items-center justify-between border-b border-zinc-800/50 pb-3">
                             <div className="flex items-center space-x-3">
                               <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center p-1 overflow-hidden">
                                 <img src={paymentSettings.easypaisaLogo} alt="EasyPaisa" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                               </div>
                               <div>
                                 <h4 className="text-white font-bold text-sm">EasyPaisa Deposit</h4>
                                 <span className="text-[10px] text-zinc-500 font-mono">Enable/disable and edit details</span>
                               </div>
                             </div>
                             <label className="relative inline-flex items-center cursor-pointer">
                               <input
                                 type="checkbox"
                                 checked={paymentSettings.easypaisaEnabled}
                                 onChange={async (e) => {
                                   const newVal = e.target.checked;
                                   setPaymentSettings(p => ({ ...p, easypaisaEnabled: newVal }));
                                   await update(ref(db, 'paymentSettings'), { easypaisaEnabled: newVal });
                                   toast.success(`EasyPaisa Deposit ${newVal ? 'Enabled' : 'Disabled'}`);
                                 }}
                                 className="sr-only peer"
                               />
                               <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-yellow-500"></div>
                             </label>
                           </div>

                           <div className="space-y-3">
                             <div>
                               <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1 font-sans">Account Title</label>
                               <input
                                 type="text"
                                 value={paymentSettings.easypaisaTitle}
                                 onChange={(e) => setPaymentSettings(p => ({ ...p, easypaisaTitle: e.target.value }))}
                                 placeholder="ADMIN_E_ACCOUNT"
                                 className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-yellow-500/50 font-mono"
                               />
                             </div>
                             <div>
                               <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1 font-sans">Account Number</label>
                               <input
                                 type="text"
                                 value={paymentSettings.easypaisaNumber}
                                 onChange={(e) => setPaymentSettings(p => ({ ...p, easypaisaNumber: e.target.value }))}
                                 placeholder="03123456789"
                                 className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-yellow-500/50 font-mono"
                               />
                             </div>
                             <div>
                               <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1 font-sans">Method Image (Logo URL)</label>
                               <div className="flex gap-2">
                                 <input
                                   type="text"
                                   value={paymentSettings.easypaisaLogo}
                                   onChange={(e) => setPaymentSettings(p => ({ ...p, easypaisaLogo: e.target.value }))}
                                   placeholder="Logo Image URL or upload"
                                   className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-yellow-500/50 font-mono"
                                 />
                                 <input 
                                   type="file" 
                                   accept="image/*"
                                   className="hidden" 
                                   id="easypaisa-logo-upload"
                                   onChange={async (e) => {
                                     if (e.target.files && e.target.files[0]) {
                                       const url = await handleImageUpload(e.target.files[0]);
                                       if (url) setPaymentSettings(p => ({ ...p, easypaisaLogo: url }));
                                     }
                                   }} 
                                 />
                                 <label 
                                   htmlFor="easypaisa-logo-upload" 
                                   className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-yellow-500/30 bg-yellow-500/10 text-yellow-500 font-bold text-xs uppercase cursor-pointer hover:bg-yellow-500 hover:text-black transition-all whitespace-nowrap ${isUploadingImg ? 'opacity-50 pointer-events-none' : ''}`}
                                 >
                                   {isUploadingImg ? <div className="w-3.5 h-3.5 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" /> : <><ImageIcon className="w-3.5 h-3.5" /><span>Upload</span></>}
                                 </label>
                               </div>
                             </div>
                           </div>
                         </div>

                         {/* JazzCash Deposit Settings */}
                         <div className="bg-zinc-950 p-5 rounded-xl border border-zinc-800/50 space-y-4">
                           <div className="flex items-center justify-between border-b border-zinc-800/50 pb-3">
                             <div className="flex items-center space-x-3">
                               <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center p-1 overflow-hidden">
                                 <img src={paymentSettings.jazzcashLogo} alt="JazzCash" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                               </div>
                               <div>
                                 <h4 className="text-white font-bold text-sm">JazzCash Deposit</h4>
                                 <span className="text-[10px] text-zinc-500 font-mono">Enable/disable and edit details</span>
                               </div>
                             </div>
                             <label className="relative inline-flex items-center cursor-pointer">
                               <input
                                 type="checkbox"
                                 checked={paymentSettings.jazzcashEnabled}
                                 onChange={async (e) => {
                                   const newVal = e.target.checked;
                                   setPaymentSettings(p => ({ ...p, jazzcashEnabled: newVal }));
                                   await update(ref(db, 'paymentSettings'), { jazzcashEnabled: newVal });
                                   toast.success(`JazzCash Deposit ${newVal ? 'Enabled' : 'Disabled'}`);
                                 }}
                                 className="sr-only peer"
                               />
                               <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-yellow-500"></div>
                             </label>
                           </div>

                           <div className="space-y-3">
                             <div>
                               <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1 font-sans">Account Title</label>
                               <input
                                 type="text"
                                 value={paymentSettings.jazzcashTitle}
                                 onChange={(e) => setPaymentSettings(p => ({ ...p, jazzcashTitle: e.target.value }))}
                                 placeholder="ADMIN_J_ACCOUNT"
                                 className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-yellow-500/50 font-mono"
                               />
                             </div>
                             <div>
                               <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1 font-sans">Account Number</label>
                               <input
                                 type="text"
                                 value={paymentSettings.jazzcashNumber}
                                 onChange={(e) => setPaymentSettings(p => ({ ...p, jazzcashNumber: e.target.value }))}
                                 placeholder="03213456789"
                                 className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-yellow-500/50 font-mono"
                               />
                             </div>
                             <div>
                               <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1 font-sans">Method Image (Logo URL)</label>
                               <div className="flex gap-2">
                                 <input
                                   type="text"
                                   value={paymentSettings.jazzcashLogo}
                                   onChange={(e) => setPaymentSettings(p => ({ ...p, jazzcashLogo: e.target.value }))}
                                   placeholder="Logo Image URL or upload"
                                   className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-yellow-500/50 font-mono"
                                 />
                                 <input 
                                   type="file" 
                                   accept="image/*"
                                   className="hidden" 
                                   id="jazzcash-logo-upload"
                                   onChange={async (e) => {
                                     if (e.target.files && e.target.files[0]) {
                                       const url = await handleImageUpload(e.target.files[0]);
                                       if (url) setPaymentSettings(p => ({ ...p, jazzcashLogo: url }));
                                     }
                                   }} 
                                 />
                                 <label 
                                   htmlFor="jazzcash-logo-upload" 
                                   className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-yellow-500/30 bg-yellow-500/10 text-yellow-500 font-bold text-xs uppercase cursor-pointer hover:bg-yellow-500 hover:text-black transition-all whitespace-nowrap ${isUploadingImg ? 'opacity-50 pointer-events-none' : ''}`}
                                 >
                                   {isUploadingImg ? <div className="w-3.5 h-3.5 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" /> : <><ImageIcon className="w-3.5 h-3.5" /><span>Upload</span></>}
                                 </label>
                               </div>
                             </div>
                           </div>
                         </div>
                       </div>

                       <div className="flex justify-end pt-4 border-t border-zinc-800">
                         <button
                           onClick={async () => {
                             try {
                               await update(ref(db, 'paymentSettings'), {
                                 easypaisaTitle: paymentSettings.easypaisaTitle,
                                 easypaisaNumber: paymentSettings.easypaisaNumber,
                                 easypaisaLogo: paymentSettings.easypaisaLogo,
                                 jazzcashTitle: paymentSettings.jazzcashTitle,
                                 jazzcashNumber: paymentSettings.jazzcashNumber,
                                 jazzcashLogo: paymentSettings.jazzcashLogo,
                               });
                               toast.success("Deposit settings updated successfully!");
                             } catch (err) {
                               toast.error("Failed to save deposit settings");
                             }
                           }}
                           className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-xs uppercase px-6 py-2.5 rounded-lg flex items-center space-x-2 transition-colors font-sans"
                         >
                           <Save className="w-4 h-4" />
                           <span>Save Deposit Settings</span>
                         </button>
                       </div>
                     </motion.div>
                   ) : (
                     <motion.div
                       key="withdrawal-settings"
                       initial={{ opacity: 0, y: 10 }}
                       animate={{ opacity: 1, y: 0 }}
                       exit={{ opacity: 0, y: -10 }}
                       className="space-y-6"
                     >
                       {/* Withdrawal Section Master Toggle */}
                       <div className="bg-zinc-950 p-5 rounded-xl border border-zinc-800/50 space-y-4">
                         <div className="flex items-center justify-between">
                           <div>
                             <h4 className="text-white font-bold text-sm">Withdrawal Section (Master Toggle)</h4>
                             <p className="text-[10px] text-zinc-500 mt-1 font-mono">Enable or completely disable the entire Withdrawal requesting feature for users</p>
                           </div>
                           <label className="relative inline-flex items-center cursor-pointer">
                             <input
                               type="checkbox"
                               checked={paymentSettings.withdrawalEnabled}
                               onChange={async (e) => {
                                 const newVal = e.target.checked;
                                 setPaymentSettings(p => ({ ...p, withdrawalEnabled: newVal }));
                                 await update(ref(db, 'paymentSettings'), { withdrawalEnabled: newVal });
                                 toast.success(`Withdrawal feature completely ${newVal ? 'Enabled' : 'Disabled'}`);
                               }}
                               className="sr-only peer"
                             />
                             <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-yellow-500"></div>
                           </label>
                         </div>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         {/* EasyPaisa Withdrawal */}
                         <div className="bg-zinc-950 p-5 rounded-xl border border-zinc-800/50 flex items-center justify-between">
                           <div className="flex items-center space-x-3">
                             <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center p-1 overflow-hidden">
                               <img src={paymentSettings.easypaisaLogo} alt="EasyPaisa" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                             </div>
                             <div>
                               <h4 className="text-white font-bold text-sm">EasyPaisa Withdrawal</h4>
                               <span className="text-[10px] text-zinc-500 font-mono">Allow users to withdraw to EasyPaisa</span>
                             </div>
                           </div>
                           <label className="relative inline-flex items-center cursor-pointer">
                             <input
                               type="checkbox"
                               checked={paymentSettings.withdrawEasypaisaEnabled}
                               onChange={async (e) => {
                                 const newVal = e.target.checked;
                                 setPaymentSettings(p => ({ ...p, withdrawEasypaisaEnabled: newVal }));
                                 await update(ref(db, 'paymentSettings'), { withdrawEasypaisaEnabled: newVal });
                                 toast.success(`EasyPaisa Withdrawals ${newVal ? 'Enabled' : 'Disabled'}`);
                               }}
                               className="sr-only peer"
                             />
                             <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-yellow-500"></div>
                           </label>
                         </div>

                         {/* JazzCash Withdrawal */}
                         <div className="bg-zinc-950 p-5 rounded-xl border border-zinc-800/50 flex items-center justify-between">
                           <div className="flex items-center space-x-3">
                             <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center p-1 overflow-hidden">
                               <img src={paymentSettings.jazzcashLogo} alt="JazzCash" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                             </div>
                             <div>
                               <h4 className="text-white font-bold text-sm">JazzCash Withdrawal</h4>
                               <span className="text-[10px] text-zinc-500 font-mono">Allow users to withdraw to JazzCash</span>
                             </div>
                           </div>
                           <label className="relative inline-flex items-center cursor-pointer">
                             <input
                               type="checkbox"
                               checked={paymentSettings.withdrawJazzcashEnabled}
                               onChange={async (e) => {
                                 const newVal = e.target.checked;
                                 setPaymentSettings(p => ({ ...p, withdrawJazzcashEnabled: newVal }));
                                 await update(ref(db, 'paymentSettings'), { withdrawJazzcashEnabled: newVal });
                                 toast.success(`JazzCash Withdrawals ${newVal ? 'Enabled' : 'Disabled'}`);
                               }}
                               className="sr-only peer"
                             />
                             <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-yellow-500"></div>
                           </label>
                         </div>

                         {/* SadaPay Withdrawal */}
                         <div className="bg-zinc-950 p-5 rounded-xl border border-zinc-800/50 space-y-4">
                           <div className="flex items-center justify-between border-b border-zinc-800/50 pb-3">
                             <div className="flex items-center space-x-3">
                               <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center p-1 overflow-hidden">
                                 <img 
                                   src={paymentSettings.sadapayLogo || SADAPAY_LOGO} 
                                   alt="SadaPay" 
                                   className="w-full h-full object-contain" 
                                   referrerPolicy="no-referrer" 
                                 />
                               </div>
                               <div>
                                 <h4 className="text-white font-bold text-sm flex items-center gap-1.5">
                                   SadaPay Withdrawal
                                   <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-400 border border-sky-500/30">NEW</span>
                                 </h4>
                                 <span className="text-[10px] text-zinc-500 font-mono">Allow users to withdraw to SadaPay</span>
                                </div>
                             </div>
                             <label className="relative inline-flex items-center cursor-pointer">
                               <input
                                 type="checkbox"
                                 checked={Boolean(paymentSettings.withdrawSadapayEnabled)}
                                 onChange={async (e) => {
                                   const newVal = e.target.checked;
                                   setPaymentSettings(p => ({ ...p, withdrawSadapayEnabled: newVal }));
                                   await update(ref(db, 'paymentSettings'), { withdrawSadapayEnabled: newVal });
                                   toast.success(`SadaPay Withdrawals ${newVal ? 'Enabled' : 'Disabled'}`);
                                 }}
                                 className="sr-only peer"
                               />
                               <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-yellow-500"></div>
                             </label>
                           </div>

                           <div className="space-y-2">
                             <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1 font-sans">Method Image (Logo URL)</label>
                             <div className="flex gap-2">
                               <input
                                 type="text"
                                 value={paymentSettings.sadapayLogo || ''}
                                 onChange={(e) => setPaymentSettings(p => ({ ...p, sadapayLogo: e.target.value }))}
                                 placeholder="Custom logo URL or leave blank for default"
                                 className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-yellow-500/50 font-mono"
                               />
                               <input 
                                 type="file" 
                                 accept="image/*"
                                 className="hidden" 
                                 id="sadapay-logo-upload"
                                 onChange={async (e) => {
                                   if (e.target.files && e.target.files[0]) {
                                     const url = await handleImageUpload(e.target.files[0]);
                                     if (url) {
                                       setPaymentSettings(p => ({ ...p, sadapayLogo: url }));
                                       await update(ref(db, 'paymentSettings'), { sadapayLogo: url });
                                     }
                                   }
                                 }} 
                               />
                               <label 
                                 htmlFor="sadapay-logo-upload" 
                                 className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-yellow-500/30 bg-yellow-500/10 text-yellow-500 font-bold text-xs uppercase cursor-pointer hover:bg-yellow-500 hover:text-black transition-all whitespace-nowrap ${isUploadingImg ? 'opacity-50 pointer-events-none' : ''}`}
                               >
                                 {isUploadingImg ? <div className="w-3.5 h-3.5 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" /> : <><ImageIcon className="w-3.5 h-3.5" /><span>Upload</span></>}
                               </label>
                             </div>
                           </div>
                         </div>

                         {/* NayaPay Withdrawal */}
                         <div className="bg-zinc-950 p-5 rounded-xl border border-zinc-800/50 space-y-4">
                           <div className="flex items-center justify-between border-b border-zinc-800/50 pb-3">
                             <div className="flex items-center space-x-3">
                               <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center p-1 overflow-hidden">
                                 <img 
                                   src={paymentSettings.nayapayLogo || NAYAPAY_LOGO} 
                                   alt="NayaPay" 
                                   className="w-full h-full object-contain" 
                                   referrerPolicy="no-referrer" 
                                 />
                               </div>
                               <div>
                                 <h4 className="text-white font-bold text-sm flex items-center gap-1.5">
                                   NayaPay Withdrawal
                                   <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-400 border border-orange-500/30">NEW</span>
                                 </h4>
                                 <span className="text-[10px] text-zinc-500 font-mono">Allow users to withdraw to NayaPay</span>
                               </div>
                             </div>
                             <label className="relative inline-flex items-center cursor-pointer">
                               <input
                                 type="checkbox"
                                 checked={Boolean(paymentSettings.withdrawNayapayEnabled)}
                                 onChange={async (e) => {
                                   const newVal = e.target.checked;
                                   setPaymentSettings(p => ({ ...p, withdrawNayapayEnabled: newVal }));
                                   await update(ref(db, 'paymentSettings'), { withdrawNayapayEnabled: newVal });
                                   toast.success(`NayaPay Withdrawals ${newVal ? 'Enabled' : 'Disabled'}`);
                                 }}
                                 className="sr-only peer"
                               />
                               <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-yellow-500"></div>
                             </label>
                           </div>

                           <div className="space-y-2">
                             <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1 font-sans">Method Image (Logo URL)</label>
                             <div className="flex gap-2">
                               <input
                                 type="text"
                                 value={paymentSettings.nayapayLogo || ''}
                                 onChange={(e) => setPaymentSettings(p => ({ ...p, nayapayLogo: e.target.value }))}
                                 placeholder="Custom logo URL or leave blank for default"
                                 className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-yellow-500/50 font-mono"
                               />
                               <input 
                                 type="file" 
                                 accept="image/*"
                                 className="hidden" 
                                 id="nayapay-logo-upload"
                                 onChange={async (e) => {
                                   if (e.target.files && e.target.files[0]) {
                                     const url = await handleImageUpload(e.target.files[0]);
                                     if (url) {
                                       setPaymentSettings(p => ({ ...p, nayapayLogo: url }));
                                       await update(ref(db, 'paymentSettings'), { nayapayLogo: url });
                                     }
                                   }
                                 }} 
                               />
                               <label 
                                 htmlFor="nayapay-logo-upload" 
                                 className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-yellow-500/30 bg-yellow-500/10 text-yellow-500 font-bold text-xs uppercase cursor-pointer hover:bg-yellow-500 hover:text-black transition-all whitespace-nowrap ${isUploadingImg ? 'opacity-50 pointer-events-none' : ''}`}
                               >
                                 {isUploadingImg ? <div className="w-3.5 h-3.5 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" /> : <><ImageIcon className="w-3.5 h-3.5" /><span>Upload</span></>}
                               </label>
                             </div>
                           </div>
                         </div>
                       </div>

                       <div className="flex justify-end pt-4 border-t border-zinc-800">
                         <button
                           onClick={async () => {
                             try {
                               await update(ref(db, 'paymentSettings'), {
                                 withdrawalEnabled: paymentSettings.withdrawalEnabled,
                                 withdrawEasypaisaEnabled: paymentSettings.withdrawEasypaisaEnabled,
                                 withdrawJazzcashEnabled: paymentSettings.withdrawJazzcashEnabled,
                                 withdrawSadapayEnabled: Boolean(paymentSettings.withdrawSadapayEnabled),
                                 sadapayLogo: paymentSettings.sadapayLogo || SADAPAY_LOGO,
                                 withdrawNayapayEnabled: Boolean(paymentSettings.withdrawNayapayEnabled),
                                 nayapayLogo: paymentSettings.nayapayLogo || NAYAPAY_LOGO
                               });
                               toast.success("Withdrawal settings updated successfully!");
                             } catch (err) {
                               toast.error("Failed to save withdrawal settings");
                             }
                           }}
                           className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-xs uppercase px-6 py-2.5 rounded-lg flex items-center space-x-2 transition-colors font-sans"
                         >
                           <Save className="w-4 h-4" />
                           <span>Save Withdrawal Settings</span>
                         </button>
                       </div>
                     </motion.div>
                   )}
                 </AnimatePresence>
              </div>

            ) : activeTab === 'notifications' ? (
             <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
                <div className="flex items-center space-x-3 mb-6">
                    <div className="bg-yellow-500/10 p-2 rounded-xl">
                      <Bell className="w-5 h-5 text-yellow-500" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider">Push Notifications</h3>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black mt-1">Broadcast messages to all users</p>
                    </div>
                  </div>
                <div className="max-w-2xl bg-zinc-950 p-6 rounded-xl border border-zinc-800">
            <form onSubmit={handleSendPushNotification} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Notification Title</label>
                <input 
                  type="text" 
                  value={notificationTitle}
                  onChange={(e) => setNotificationTitle(e.target.value)}
                  placeholder="e.g. New Match Scheduled!" 
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-white focus:outline-none focus:border-yellow-500" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Message Body</label>
                <textarea 
                  value={notificationMessage}
                  onChange={(e) => setNotificationMessage(e.target.value)}
                  placeholder="Write your notification message here..." 
                  rows={4} 
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-white focus:outline-none focus:border-yellow-500"
                ></textarea>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Target Link (Optional)</label>
                <input 
                  type="text" 
                  value={notificationUrl}
                  onChange={(e) => setNotificationUrl(e.target.value)}
                  placeholder="e.g. /home or https://..." 
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-white focus:outline-none focus:border-yellow-500" 
                />
              </div>
              <button 
                type="submit" 
                disabled={isSendingNotification}
                className={`w-full bg-yellow-500 text-black font-black uppercase tracking-widest py-3 rounded-lg transition-colors ${isSendingNotification ? 'opacity-50 cursor-not-allowed' : 'hover:bg-yellow-400'}`}
              >
                {isSendingNotification ? 'Sending...' : 'Send Notification Now'}
              </button>
            </form>
                </div>
              </div>
            ) : activeTab === 'teams' ? (
              <AdminTeamsView />
            ) : activeTab === 'banners' ? (
             <div className="space-y-6">
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
                   <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
                      <div>
                         <h3 className="text-sm font-bold text-yellow-500 uppercase tracking-wider">App Banners</h3>
                         <p className="text-[10px] text-zinc-500 mt-1">Manage home screen slider and event banners</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                         <div className="flex items-center space-x-2 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 flex-1 md:flex-none">
                            <Clock className="w-4 h-4 text-yellow-500" />
                            <div className="flex flex-col">
                               <span className="text-[8px] text-zinc-500 uppercase font-black">Slide Speed</span>
                               <div className="flex items-center space-x-1">
                                  <input 
                                    type="number" 
                                    value={settings?.bannerSpeed || 3000}
                                    onChange={(e) => setSettings(prev => prev ? {...prev, bannerSpeed: parseInt(e.target.value)} : null)}
                                    className="bg-transparent border-none p-0 text-xs font-bold text-white w-12 focus:ring-0"
                                  />
                                  <span className="text-[9px] text-zinc-600 font-bold">MS</span>
                               </div>
                            </div>
                         </div>
                         <button 
                           onClick={() => {
                             setEditingBanner(null);
                             setNewBanner({ imageUrl: '', link: '', type: 'home', isActive: true });
                             setIsBannerModalOpen(true);
                           }}
                           className="bg-yellow-500 text-black px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-yellow-400 transition-all shadow-[0_0_20px_rgba(234,179,8,0.2)] flex items-center space-x-2 whitespace-nowrap flex-1 md:flex-none justify-center"
                         >
                            <Plus className="w-4 h-4" />
                            <span>Add Banner</span>
                         </button>
                         <button 
                           onClick={handleSaveSettings}
                           className="bg-zinc-800 text-white px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-zinc-700 transition-all border border-zinc-700 flex-1 md:flex-none"
                         >
                            Save Speed
                         </button>
                      </div>
                   </div>

                   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                     {banners.length > 0 ? (
                       banners.map((banner) => (
                         <div key={banner.id} className="bg-zinc-950 rounded-2xl overflow-hidden border border-zinc-800 group relative flex flex-col shadow-lg">
                           <div className="aspect-[21/9] bg-zinc-900 relative">
                             <img 
                               src={banner.imageUrl} 
                               className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                               alt={banner.type} 
                             />
                             <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                             <div className="absolute top-3 left-3 flex items-center space-x-2">
                               <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-md border ${
                                 banner.isActive ? 'bg-green-500/10 text-green-500 border-green-500/30' : 'bg-red-500/10 text-red-500 border-red-500/30'
                               }`}>
                                 {banner.isActive ? 'Active' : 'Inactive'}
                               </span>
                               <label className="relative inline-flex items-center cursor-pointer">
                                  <input 
                                    type="checkbox" 
                                    className="sr-only peer" 
                                    checked={banner.isActive}
                                    onChange={async (e) => {
                                      const newVal = e.target.checked;
                                      try {
                                        await update(ref(db, `banners/${banner.id}`), { isActive: newVal });
                                        toast.success(`Banner ${newVal ? 'Activated' : 'Deactivated'}`);
                                      } catch (err) {
                                        toast.error('Failed to update banner status');
                                      }
                                    }}
                                  />
                                  <div className="w-7 h-4 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-yellow-500"></div>
                               </label>
                             </div>
                             <div className="absolute bottom-3 left-3">
                               <span className="text-[10px] text-yellow-500 font-black uppercase tracking-widest bg-black/60  px-2 py-1 rounded-lg border border-yellow-500/20">
                                 {banner.type}
                               </span>
                             </div>
                           </div>
                           <div className="p-4 flex justify-between items-center bg-zinc-950">
                             <div className="text-[9px] text-zinc-500 font-bold uppercase truncate max-w-[120px]">
                               {banner.link || 'No Action Link'}
                             </div>
                             <div className="flex items-center space-x-1">
                               <button 
                                 onClick={() => {
                                   setEditingBanner(banner);
                                   setNewBanner(banner);
                                   setIsBannerModalOpen(true);
                                 }}
                                 className="p-2 text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                               >
                                 <Edit2 className="w-3.5 h-3.5" />
                               </button>
                               <button 
                                 onClick={() => {
                                    setConfirmModal({
                                      isOpen: true,
                                      title: 'Delete Banner',
                                      message: 'Are you sure you want to delete this banner? This action cannot be undone.',
                                      type: 'danger',
                                      confirmText: 'Delete',
                                      onConfirm: async () => {
                                         try {
                                             await remove(ref(db, `banners/${banner.id}`));
                                             toast.success("Banner deleted successfully");
                                         } catch (error) {
                                             toast.error("Failed to delete banner");
                                         }
                                         setConfirmModal({ isOpen: false });
                                      }
                                    });
                                 }}
                                 className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                               >
                                 <Trash2 className="w-3.5 h-3.5" />
                               </button>
                             </div>
                           </div>
                         </div>
                       ))
                     ) : (
                       <div className="col-span-full py-12 flex flex-col items-center justify-center border-2 border-dashed border-zinc-800 rounded-3xl opacity-50">
                          <ImageIcon className="w-12 h-12 text-zinc-700 mb-3" />
                          <p className="text-zinc-500 font-bold text-xs uppercase tracking-widest">No banners uploaded yet</p>
                       </div>
                     )}
                   </div>
                </div>
             </div>
           ) : activeTab === 'settings' ? (
             <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 md:p-6">
                <h3 className="text-sm font-bold text-yellow-500 uppercase tracking-wider mb-6">App Settings</h3>
                <div className="max-w-3xl space-y-6">
                  <div className="bg-zinc-950 p-6 rounded-xl border border-zinc-800">
                     <div className="flex items-center space-x-3 mb-6">
                        <div className="p-2 bg-red-500/10 rounded-lg border border-red-500/20">
                           <AlertTriangle className="w-5 h-5 text-red-500" />
                        </div>
                        <h4 className="text-white font-black uppercase tracking-widest text-sm">Maintenance Mode</h4>
                     </div>
                     <div className="flex items-center justify-between mb-6 p-4 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
                       <div>
                         <div className="text-xs font-bold text-white uppercase tracking-wider">Enable System Maintenance</div>
                         <div className="text-[10px] text-zinc-500 mt-1">Users won't be able to log in or play matches while this is active.</div>
                       </div>
                       <label className="relative inline-flex items-center cursor-pointer">
                         <input 
                           type="checkbox" 
                           checked={settings?.maintenanceMode || false} 
                           onChange={e => setSettings(prev => prev ? {...prev, maintenanceMode: e.target.checked} : null)}
                           className="sr-only peer" 
                         />
                         <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600 shadow-[0_0_10px_rgba(0,0,0,0.5)]"></div>
                       </label>
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em] ml-1">Maintenance Message</label>
                        <textarea 
                          value={settings?.maintenanceMessage || ''}
                          onChange={e => setSettings(prev => prev ? {...prev, maintenanceMessage: e.target.value} : null)}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-xs font-bold text-white focus:outline-none focus:border-red-500/50 transition-all min-h-[100px]" 
                          placeholder="Maintenance message for users..."
                        ></textarea>
                     </div>
                   </div>

                   <div className="bg-zinc-950 p-6 rounded-2xl border border-zinc-800 shadow-xl">
                     <div className="flex items-center space-x-3 mb-6">
                        <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
                           <Bell className="w-5 h-5 text-blue-500" />
                        </div>
                        <h4 className="text-white font-black uppercase tracking-widest text-sm">Notification Config (OneSignal)</h4>
                     </div>
                     <div className="grid grid-cols-1 gap-6">
                        <div className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
                           <div>
                              <div className="text-xs font-bold text-white uppercase tracking-wider">Push Notifications</div>
                              <div className="text-[10px] text-zinc-500 mt-1">Enable or disable app-wide push notifications</div>
                           </div>
                           <label className="relative inline-flex items-center cursor-pointer">
                              <input 
                                 type="checkbox" 
                                 checked={settings?.notificationEnabled || false} 
                                 onChange={e => setSettings(prev => prev ? {...prev, notificationEnabled: e.target.checked} : null)}
                                 className="sr-only peer" 
                              />
                              <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                           </label>
                        </div>
                        <div className="space-y-4">
                           <div className="space-y-2">
                              <label className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em] ml-1">App ID</label>
                              <input 
                                 type="text"
                                 value={settings?.onesignalAppId || ''}
                                 onChange={e => setSettings(prev => prev ? {...prev, onesignalAppId: e.target.value} : null)}
                                 className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs font-bold text-white focus:outline-none focus:border-blue-500/50 transition-all" 
                                 placeholder="OneSignal App ID"
                              />
                           </div>
                           <div className="space-y-2">
                              <label className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em] ml-1">REST API Key</label>
                              <input 
                                 type="password"
                                 value={settings?.onesignalRestApiKey || ''}
                                 onChange={e => setSettings(prev => prev ? {...prev, onesignalRestApiKey: e.target.value} : null)}
                                 className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs font-bold text-white focus:outline-none focus:border-blue-500/50 transition-all" 
                                 placeholder="OneSignal REST API Key"
                              />
                           </div>
                        </div>
                     </div>
                   </div>

                   <div className="bg-zinc-950 p-6 rounded-2xl border border-zinc-800 shadow-xl">
                     <div className="flex items-center space-x-3 mb-6">
                        <div className="p-2 bg-green-500/10 rounded-lg border border-green-500/20">
                           <Info className="w-5 h-5 text-green-500" />
                        </div>
                        <h4 className="text-white font-black uppercase tracking-widest text-sm">Support Config</h4>
                     </div>
                     <div className="grid grid-cols-1 gap-6">
                        <div className="space-y-2">
                           <label className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em] ml-1">Support WhatsApp Number</label>
                           <input 
                              type="text"
                              value={settings?.supportNumber || ''}
                              onChange={e => setSettings(prev => prev ? {...prev, supportNumber: e.target.value} : null)}
                              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs font-bold text-white focus:outline-none focus:border-green-500/50 transition-all" 
                              placeholder="e.g. +923001234567"
                           />
                        </div>
                     </div>
                   </div>

                   <div className="bg-zinc-950 p-6 rounded-2xl border border-zinc-800 shadow-xl mt-6">
                      <div className="flex items-center space-x-3 mb-6">
                         <div className="p-2 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                            <Link2 className="w-5 h-5 text-yellow-500" />
                         </div>
                         <h4 className="text-white font-black uppercase tracking-widest text-sm">App Download Link</h4>
                      </div>
                      <div className="grid grid-cols-1 gap-6">
                         <div className="space-y-2">
                            <label className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em] ml-1">Official App Download URL</label>
                            <input 
                               type="text"
                               value={settings?.appLink || ''}
                               onChange={e => setSettings(prev => prev ? {...prev, appLink: e.target.value} : null)}
                               className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs font-bold text-white focus:outline-none focus:border-yellow-500/50 transition-all" 
                               placeholder="e.g. https://your-site.com/app.apk"
                            />
                            <p className="text-[10px] text-zinc-500 ml-1">
                              This link will be included when users share the app with friends.
                            </p>
                         </div>
                      </div>
                   </div>

                   <div className="bg-zinc-950 p-6 rounded-2xl border border-zinc-800 shadow-xl mt-6">
                     <div className="flex items-center space-x-3 mb-6">
                        <div className="p-2 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                           <ImageIcon className="w-5 h-5 text-yellow-500" />
                        </div>
                        <div>
                           <h4 className="text-white font-black uppercase tracking-widest text-sm">ImgBB API Configuration</h4>
                           <p className="text-[10px] text-zinc-500 mt-0.5">API key used for all image uploads across the Admin Dashboard</p>
                        </div>
                     </div>
                     <div className="grid grid-cols-1 gap-6">
                        <div className="space-y-2">
                           <label className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em] ml-1">ImgBB API Key</label>
                           <input 
                              type="text"
                              value={settings?.imgbbApiKey || ''}
                              onChange={e => setSettings(prev => prev ? {...prev, imgbbApiKey: e.target.value} : null)}
                              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs font-mono text-white focus:outline-none focus:border-yellow-500/50 transition-all" 
                              placeholder="Default: 67f626f212906e57b545d94edfa694c9"
                           />
                           <p className="text-[10px] text-zinc-500 ml-1">
                             All Admin Panel image uploads will be uploaded to ImgBB using this API key. If left blank, the default key is used.
                           </p>
                        </div>
                     </div>
                   </div>

                   <div className="bg-zinc-950 p-6 rounded-2xl border border-zinc-800 shadow-xl mt-6">
                     <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-3">
                           <div className="p-2 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                              <Shield className="w-5 h-5 text-yellow-500" />
                           </div>
                           <h4 className="text-white font-black uppercase tracking-widest text-sm">Owner Access Key</h4>
                        </div>
                     </div>
                     <div className="grid grid-cols-1 gap-6">
                        <div className="space-y-2">
                           <label className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em] ml-1">Current Owner Key</label>
                           <div className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs font-mono text-zinc-400 break-all">
                              {ownerKey || 'Not set'}
                           </div>
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em] ml-1">New Owner Key</label>
                           <input 
                              type="text"
                              value={newOwnerKey}
                              onChange={e => setNewOwnerKey(e.target.value)}
                              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs font-bold text-white focus:outline-none focus:border-yellow-500/50 transition-all" 
                              placeholder="Enter new owner key"
                           />
                        </div>
                        <button 
                          onClick={handleChangeOwnerKey}
                          disabled={!newOwnerKey.trim() || isUpdatingKey}
                          className="w-full bg-yellow-500/10 text-yellow-500 border border-yellow-500/30 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-yellow-500 hover:text-black transition-all disabled:opacity-50"
                        >
                          {isUpdatingKey ? 'Updating...' : 'Update Owner Key'}
                        </button>
                     </div>
                   </div>
                   
                   <button 
                     onClick={handleSaveSettings}
                     className="w-full md:w-auto mt-6 bg-yellow-500 text-black px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-yellow-400 transition-all shadow-[0_10px_30px_rgba(234,179,8,0.3)] active:scale-95"
                   >
                     Save App Configuration
                   </button>
                 </div>
              </div>
            ) : activeTab === 'roles' ? (
              <div className="space-y-6">
                <div className="flex justify-between items-center bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
                   <div>
                     <h3 className="text-sm font-bold text-yellow-500 uppercase tracking-wider">Admin Roles & Permissions</h3>
                     <p className="text-[10px] text-zinc-500 mt-1">Manage moderators and their access levels</p>
                   </div>
                   <button 
                     onClick={() => setIsCreateRoleModalOpen(true)}
                     className="bg-yellow-500 text-black px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-yellow-400 transition-all shadow-[0_0_20px_rgba(234,179,8,0.2)] flex items-center space-x-2"
                   >
                      <UserPlus className="w-4 h-4" />
                      <span>Create New Admin</span>
                   </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {adminRoles.map((role, i) => (
                    <div key={role.id || i} className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 flex flex-col relative overflow-hidden group">
                       <div className="absolute top-0 right-0 p-4 flex gap-2">
                          <button 
                            onClick={() => {
                                setEditingRole(role);
                                setNewAdminRole(role);
                                setIsCreateRoleModalOpen(true);
                            }}
                            className="p-2 bg-blue-500/10 text-blue-500 rounded-lg border border-blue-500/20 hover:bg-blue-500 hover:text-white transition-all"
                          >
                             <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={async () => {
                              setConfirmModal({
                                isOpen: true,
                                title: 'Delete Admin Role',
                                message: 'Are you sure you want to delete this admin role? This action cannot be undone.',
                                type: 'danger',
                                onConfirm: async () => {
                                  await remove(ref(db, `adminRoles/${role.id}`));
                                  toast.success('Role deleted');
                                  setConfirmModal({ isOpen: false });
                                }
                              });
                            }}
                            className="p-2 bg-red-500/10 text-red-500 rounded-lg border border-red-500/20 hover:bg-red-500 hover:text-white transition-all"
                          >
                             <Trash2 className="w-4 h-4" />
                          </button>
                       </div>
                       
                       <div className="flex items-center space-x-4 mb-6">
                          <div className="w-12 h-12 bg-yellow-500/10 rounded-2xl flex items-center justify-center border border-yellow-500/20">
                             <Shield className="w-6 h-6 text-yellow-500" />
                          </div>
                          <div>
                             <h4 className="text-sm font-black text-white uppercase tracking-wider">{role.adminName}</h4>
                             <p className="text-[10px] text-zinc-500 font-mono">Key: {role.adminKey}</p>
                          </div>
                       </div>

                       <div className="flex-1">
                          <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest mb-3">Allowed Modules</p>
                          <div className="flex flex-wrap gap-1.5">
                             {Object.entries(role.permissions).filter(([_, allowed]) => allowed).map(([key]) => (
                               <span key={key} className="text-[8px] font-bold bg-zinc-900 text-zinc-400 px-2 py-1 rounded-md border border-zinc-800 uppercase">
                                 {key.replace('_', ' ')}
                               </span>
                             ))}
                          </div>
                       </div>

                       <div className="mt-6 pt-4 border-t border-zinc-900 flex justify-between items-center">
                          <span className="text-[9px] text-zinc-600">Created: {new Date(role.createdAt || '').toLocaleDateString()}</span>
                          <span className="text-[9px] font-black text-yellow-500 uppercase tracking-widest">Active Status</span>
                       </div>
                    </div>
                  ))}
                  {adminRoles.length === 0 && (
                    <div className="col-span-full py-20 flex flex-col items-center justify-center text-zinc-600">
                       <Shield className="w-16 h-16 opacity-10 mb-4" />
                       <p className="text-xs uppercase tracking-widest font-bold">No custom admin roles found</p>
                    </div>
                  )}
                </div>
              </div>
           ) : activeTab === 'system' ? (
             <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-yellow-500 uppercase tracking-wider mb-6">System & Server Status</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                    <div className="text-[10px] text-zinc-500 uppercase mb-1">Server Status</div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-sm font-bold text-white">Online & Healthy</span>
                    </div>
                  </div>
                  <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                    <div className="text-[10px] text-zinc-500 uppercase mb-1">Database</div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      <span className="text-sm font-bold text-white">Connected</span>
                    </div>
                  </div>
                  <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                    <div className="text-[10px] text-zinc-500 uppercase mb-1">API Version</div>
                    <div className="text-sm font-bold text-white">v2.4.1</div>
                  </div>
                  <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                    <div className="text-[10px] text-zinc-500 uppercase mb-1">App Version</div>
                    <div className="text-sm font-bold text-white">1.0.0 (Build 42)</div>
                  </div>
                </div>

                <div className="max-w-3xl space-y-6 mt-8">
                  <div className="bg-zinc-950 p-6 rounded-2xl border border-zinc-800 shadow-xl">
                    <div className="flex items-center space-x-3 mb-6">
                      <div className="p-2 bg-yellow-500/10 rounded-lg text-yellow-500">
                        <Bell className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-widest text-white">OneSignal Configuration</h4>
                        <p className="text-[9px] text-zinc-500 font-bold uppercase mt-0.5 tracking-tight">Push Notification API Credentials</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-2">OneSignal App ID</label>
                        <input 
                          type="text"
                          value={settings?.onesignalAppId || ''}
                          onChange={(e) => setSettings(prev => prev ? {...prev, onesignalAppId: e.target.value} : null)}
                          placeholder="Enter App ID"
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-yellow-500/50"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-2">REST API Key</label>
                        <input 
                          type="password"
                          value={settings?.onesignalRestApiKey || ''}
                          onChange={(e) => setSettings(prev => prev ? {...prev, onesignalRestApiKey: e.target.value} : null)}
                          placeholder="Enter API Key"
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-yellow-500/50"
                        />
                      </div>
                    </div>

                    <div className="mt-6 flex justify-end">
                      <button 
                        onClick={handleSaveSettings}
                        className="bg-yellow-500 text-black px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-yellow-400 transition-all shadow-[0_0_20px_rgba(234,179,8,0.2)] active:scale-95"
                      >
                        Save Configuration
                      </button>
                    </div>
                  </div>

                  <div className="bg-zinc-950 p-6 rounded-2xl border border-zinc-800 shadow-xl">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-red-500/10 rounded-lg text-red-500">
                          <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-black uppercase tracking-widest text-white">Maintenance Mode</h4>
                          <p className="text-[9px] text-zinc-500 font-bold uppercase mt-0.5 tracking-tight">Restrict user access for maintenance</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer"
                          checked={settings?.isMaintenanceMode || false}
                          onChange={(e) => setSettings(prev => prev ? {...prev, isMaintenanceMode: e.target.checked} : null)}
                        />
                        <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                      </label>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-2">Maintenance Message</label>
                        <textarea 
                          value={settings?.maintenanceMessage || ''}
                          onChange={(e) => setSettings(prev => prev ? {...prev, maintenanceMessage: e.target.value} : null)}
                          placeholder="Enter maintenance message for users..."
                          rows={3}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-yellow-500/50"
                        />
                      </div>
                      <div className="flex justify-end">
                        <button 
                          onClick={handleSaveSettings}
                          className="bg-zinc-800 text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-zinc-700 transition-all border border-zinc-700"
                        >
                          Save Maintenance Settings
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
             </div>
           ) : activeTab === 'themes' ? (
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
                 <h3 className="text-sm font-bold text-yellow-500 uppercase tracking-wider mb-2">Background Animations & Themes</h3>
                 <p className="text-xs text-zinc-400 mb-6">Select the global particle background animation that will be displayed across the entire platform for all users.</p>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                   {[
                     {
                       id: 'gold_floating',
                       name: 'Floating Gold Embers',
                       desc: 'Elegant golden embers floating upwards slowly with a soft dynamic glow.',
                       preview: 'gold-floating'
                     },
                     {
                       id: 'snow_fall',
                       name: 'Golden Snowfall',
                       desc: 'Soft golden snow particles gently falling from the top, swaying left and right.',
                       preview: 'snow-fall'
                     },
                     {
                       id: 'shooting_stars',
                       name: 'Golden Comet Trails',
                       desc: 'Beautiful diagonal golden trails shooting across the screen like dynamic comets.',
                       preview: 'shooting-stars'
                     },
                     {
                       id: 'breathing_stars',
                       name: 'Pulsing Night Sky',
                       desc: 'Glow stars breathing in and out gracefully in a fixed, calm night atmosphere.',
                       preview: 'breathing-stars'
                     },
                     {
                       id: 'swirling_chaos',
                       name: 'Swirling Aura Waves',
                       desc: 'Swirling vortex-like waves of golden aura floating upwards in curves.',
                       preview: 'swirling-chaos'
                     }
                   ].map((t) => (
                     <div 
                       key={t.id}
                       onClick={async () => {
                         setSettings(prev => prev ? { ...prev, backgroundTheme: t.id } : { backgroundTheme: t.id });
                         try {
                           await update(ref(db, 'appSettings'), { backgroundTheme: t.id });
                           toast.success(`${t.name} selected successfully! Theme updated globally in real-time.`);
                         } catch (err) {
                           toast.error('Failed to update theme');
                         }
                       }}
                       className={`p-6 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between h-48 relative overflow-hidden group ${
                         (settings?.backgroundTheme || 'gold_floating') === t.id
                           ? 'bg-yellow-500/10 border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.15)]'
                           : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/40'
                       }`}
                     >
                       {/* Background highlight representation */}
                       <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-yellow-500/5 blur-2xl rounded-full opacity-50 group-hover:bg-yellow-500/10 transition-all" />
                       
                       <div>
                         <div className="flex items-center justify-between mb-3">
                           <h4 className="text-sm font-black text-white group-hover:text-yellow-500 transition-colors">{t.name}</h4>
                           {(settings?.backgroundTheme || 'gold_floating') === t.id && (
                             <div className="w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(234,179,8,0.3)]">
                               <Check className="w-3 h-3 text-black stroke-[3]" />
                             </div>
                           )}
                         </div>
                         <p className="text-xs text-zinc-400 font-medium leading-relaxed">{t.desc}</p>
                       </div>
                       
                       <div className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 flex items-center space-x-1.5 pt-4 border-t border-zinc-900">
                         <div className={`w-1.5 h-1.5 rounded-full ${
                           (settings?.backgroundTheme || 'gold_floating') === t.id ? 'bg-yellow-500 shadow-[0_0_5px_#eab308]' : 'bg-zinc-700'
                         }`} />
                         <span>{(settings?.backgroundTheme || 'gold_floating') === t.id ? 'Active Theme' : 'Click to Activate'}</span>
                       </div>
                     </div>
                   ))}
                 </div>

                 {/* Particle Background Control */}
                 <div className="mt-8 pt-8 border-t border-zinc-800">
                   <h3 className="text-sm font-bold text-yellow-500 uppercase tracking-wider mb-2">Particle Background Control</h3>
                   <p className="text-xs text-zinc-400 mb-6">Configure the background particle animations shown to players.</p>
                   
                   <div className="bg-zinc-950 p-6 rounded-2xl border border-zinc-800 space-y-6">
                       {/* Toggle Particles */}
                       <div className="flex items-center justify-between">
                           <span className="text-xs font-bold text-white uppercase">Enable Background Particles</span>
                           <button
                               type="button"
                               onClick={async () => {
                                   const next = !settings?.backgroundParticlesEnabled;
                                   setSettings(prev => prev ? { ...prev, backgroundParticlesEnabled: next } : { backgroundParticlesEnabled: next });
                                   try {
                                       await update(ref(db, 'appSettings'), { backgroundParticlesEnabled: next });
                                       toast.success(next ? 'Particles enabled!' : 'Particles disabled!');
                                   } catch (err) {
                                       toast.error('Failed to update setting');
                                   }
                               }}
                               className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase ${settings?.backgroundParticlesEnabled ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}
                           >
                               {settings?.backgroundParticlesEnabled ? 'Enabled' : 'Disabled'}
                           </button>
                       </div>
                       {/* Shape Control */}
                       <div className="pt-6 border-t border-zinc-800">
                          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block mb-3">Particle Shape</span>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                             {[
                               { id: 'circle', label: 'Circle' },
                               { id: 'star', label: 'Star ⭐' },
                               { id: 'snow', label: 'Snow ❄️' },
                               { id: 'sparkle', label: 'Sparkles ✨' }
                             ].map((shape) => (
                               <button
                                 key={shape.id}
                                 type="button"
                                 onClick={async () => {
                                   setSettings(prev => prev ? { ...prev, backgroundParticleType: shape.id as any } : { backgroundParticleType: shape.id as any });
                                   try {
                                     await update(ref(db, 'appSettings'), { backgroundParticleType: shape.id });
                                     toast.success('Particle shape updated!');
                                   } catch (err) {
                                     toast.error('Failed to update shape');
                                   }
                                 }}
                                 className={`px-3 py-2 rounded-xl border text-[11px] font-bold transition-all flex items-center justify-center ${
                                   (settings?.backgroundParticleType || 'circle') === shape.id
                                     ? 'bg-yellow-500/10 border-yellow-500/50 text-yellow-500'
                                     : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                                 }`}
                               >
                                 {shape.label}
                               </button>
                             ))}
                          </div>
                       </div>

                     {/* Color Presets */}
                     <div className="pt-6 border-t border-zinc-800">
                       <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block mb-3">Popular Colors</span>
                       <div className="flex flex-wrap gap-3">
                         {[
                           { name: 'Gamer Gold', hex: '#eab308' },
                           { name: 'Cyber Neon Blue', hex: '#06b6d4' },
                           { name: 'Venom Green', hex: '#10b981' },
                           { name: 'Crimson Red', hex: '#ef4444' },
                           { name: 'Neon Purple', hex: '#a855f7' },
                           { name: 'Diamond White', hex: '#ffffff' },
                         ].map((c) => (
                           <button
                             key={c.hex}
                             type="button"
                             onClick={async () => {
                               setSettings(prev => prev ? { ...prev, backgroundParticleColor: c.hex } : { backgroundParticleColor: c.hex });
                               try {
                                 await update(ref(db, 'appSettings'), { backgroundParticleColor: c.hex });
                                 toast.success(`Background color updated to ${c.name}!`);
                               } catch (err) {
                                 toast.error('Failed to update color');
                               }
                             }}
                             className={`flex items-center space-x-2 px-3 py-2 rounded-xl border text-[11px] font-bold transition-all ${
                               (settings?.backgroundParticleColor || '#eab308') === c.hex
                                 ? 'bg-zinc-900 border-yellow-500/50 text-white shadow-[0_0_15px_rgba(234,179,8,0.1)]'
                                 : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                             }`}
                           >
                             <div className="w-3.5 h-3.5 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.1)] border border-white/10" style={{ backgroundColor: c.hex }} />
                             <span>{c.name}</span>
                           </button>
                         ))}
                       </div>
                     </div>

                     {/* Custom Picker */}
                     <div className="flex items-center space-x-3 bg-zinc-900 p-4 rounded-xl border border-zinc-800 w-full">
                       <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-zinc-700 cursor-pointer">
                         <input
                           type="color"
                           value={settings?.backgroundParticleColor || '#eab308'}
                           onChange={async (e) => {
                             const val = e.target.value;
                             setSettings(prev => prev ? { ...prev, backgroundParticleColor: val } : { backgroundParticleColor: val });
                           }}
                           onBlur={async () => {
                             try {
                               await update(ref(db, 'appSettings'), { backgroundParticleColor: settings?.backgroundParticleColor || '#eab308' });
                               toast.success(`Custom color saved successfully!`);
                             } catch (err) {
                               toast.error('Failed to save color');
                             }
                           }}
                           className="absolute inset-0 w-full h-full scale-150 cursor-pointer"
                         />
                       </div>
                       <div className="flex-1">
                         <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block">Custom Color Hex</span>
                         <input
                           type="text"
                           value={settings?.backgroundParticleColor || '#eab308'}
                           onChange={async (e) => {
                             const val = e.target.value;
                             setSettings(prev => prev ? { ...prev, backgroundParticleColor: val } : { backgroundParticleColor: val });
                           }}
                           onBlur={async () => {
                             try {
                               await update(ref(db, 'appSettings'), { backgroundParticleColor: settings?.backgroundParticleColor || '#eab308' });
                               toast.success(`Custom hex color saved!`);
                             } catch (err) {
                               toast.error('Failed to save color');
                             }
                           }}
                           className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-white text-xs font-mono focus:outline-none focus:border-yellow-500"
                         />
                       </div>
                     </div>
                   </div>
                 </div>

              </div>
           ) : activeTab === 'pin_resets' ? (
              <PinResetRequestsManager pinResetRequests={pinResetRequests} />
           ) : (
             <div className="flex flex-col items-center justify-center h-full text-zinc-500 space-y-4">
               <Settings className="w-16 h-16 opacity-20" />
               <p className="text-sm font-bold uppercase tracking-widest">{activeTab} Module</p>
               <p className="text-[10px] text-zinc-600">The {activeTab} panel is currently under development or maintenance.</p>
             </div>
           )}
        </div>
      </div>

      {/* --- Modals --- */}
      
      {/* Redeemers Modal */}
      {isRedeemersModalOpen && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh] shadow-[0_0_50px_rgba(0,0,0,0.8)]">
            <div className="flex justify-between items-center p-6 border-b border-zinc-800 bg-zinc-900/50">
              <div>
                <h2 className="text-sm font-black text-yellow-500 uppercase tracking-widest">Redeemed Users List</h2>
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mt-1">Code: <span className="text-white">{selectedPromoCode}</span></p>
              </div>
              <button 
                onClick={() => {
                  setIsRedeemersModalOpen(false);
                  setSelectedPromoRedeemers(null);
                  setSelectedPromoCode('');
                }} 
                className="text-zinc-500 hover:text-white transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-4">
              {!selectedPromoRedeemers || Object.keys(selectedPromoRedeemers).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
                  <Users className="w-12 h-12 text-zinc-700 mb-3" />
                  <p className="text-xs font-bold uppercase tracking-wider">No users have redeemed this code yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {Object.values(selectedPromoRedeemers).map((redeemer: any, idx: number) => (
                    <div key={redeemer.userId || idx} className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 flex items-start space-x-3 hover:border-yellow-500/20 transition-all">
                      <div className="bg-yellow-500/10 p-2 rounded-lg mt-0.5 shrink-0">
                        <UserIcon className="w-4 h-4 text-yellow-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-white uppercase tracking-wider truncate">
                          {redeemer.username || 'Unknown'}
                        </p>
                        <div className="mt-2 space-y-1">
                          <div className="flex items-center space-x-1.5 text-[10px] text-zinc-400 font-medium">
                            <Mail className="w-3 h-3 text-zinc-500 shrink-0" />
                            <span className="truncate">{redeemer.email || 'N/A'}</span>
                          </div>
                          <div className="flex items-center space-x-1.5 text-[10px] text-zinc-400 font-medium">
                            <Phone className="w-3 h-3 text-zinc-500 shrink-0" />
                            <span>{redeemer.phone || 'N/A'}</span>
                          </div>
                          <div className="flex items-center space-x-1.5 text-[9px] text-zinc-500 font-bold uppercase tracking-wider mt-1.5">
                            <Clock className="w-3 h-3 text-zinc-600 shrink-0" />
                            <span>Redeemed: {redeemer.redeemedAt ? format(new Date(redeemer.redeemedAt), 'MMM dd, yyyy - hh:mm a') : 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-4 bg-zinc-900/30 border-t border-zinc-800 flex justify-end shrink-0">
              <button
                onClick={() => {
                  setIsRedeemersModalOpen(false);
                  setSelectedPromoRedeemers(null);
                  setSelectedPromoCode('');
                }}
                className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs uppercase px-4 py-2 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Create Match Modal */}
      {isCreateMatchModalOpen && (
        <div className="fixed inset-0 bg-black/90  z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-2xl overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-zinc-800 bg-zinc-900/50">
              <h2 className="text-lg font-black text-yellow-500 uppercase tracking-widest">Schedule New Match</h2>
              <button onClick={() => setIsCreateMatchModalOpen(false)} className="text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
             <form onSubmit={handleCreateMatch} className="p-6 overflow-y-auto max-h-[70vh] space-y-8">
                {/* Section 1: Basic Information */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 border-b border-zinc-800 pb-2 mb-4">
                    <div className="bg-yellow-500/10 p-1.5 rounded-lg">
                      <Trophy className="w-4 h-4 text-yellow-500" />
                    </div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-widest">General Information</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Match Title</label>
                      <input required type="text" value={newMatch.title} onChange={e => setNewMatch({...newMatch, title: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-yellow-500 transition-colors" placeholder="e.g. Daily Scrims #42" />
                    </div>
                    
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Category Event</label>
                      <select value={newMatch.type} onChange={e => setNewMatch({...newMatch, type: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-yellow-500 appearance-none">
                         <option value="TDM">TDM</option>
                         <option value="Erangel">Erangel</option>
                         <option value="Miramar">Miramar</option>
                         <option value="Livik">Livik</option>
                         <option value="Sanhok">Sanhok</option>
                         <option value="Random">Random</option>
                         <option value="Event">Event</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Team Mode</label>
                      <select value={newMatch.mode} onChange={e => setNewMatch({...newMatch, mode: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-yellow-500 appearance-none">
                         <option value="SOLO">Solo</option>
                         <option value="DUO">Duo</option>
                         <option value="TRIO">Trio</option>
                         <option value="SQUAD">Squad</option>
                      </select>
                    </div>

                    <div className="col-span-2">
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Map Name</label>
                      <input required type="text" value={newMatch.map} onChange={e => setNewMatch({...newMatch, map: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-yellow-500 transition-colors" placeholder="e.g. Bermuda, Purgatory" />
                    </div>
                    <PrizeDistributionEditor match={newMatch} setMatch={setNewMatch} />
                    
                    <div className="col-span-2 bg-zinc-900/30 p-4 rounded-xl border border-zinc-800/50 mt-2">
                      <label className="block text-[10px] font-bold text-yellow-500 uppercase tracking-widest mb-3">Match Cover Image (Optional)</label>
                      <div className="flex flex-col space-y-4">
                        <div className="flex gap-2">
                          <input 
                            type="text"
                            value={newMatch.image || ''}
                            onChange={(e) => setNewMatch({...newMatch, image: e.target.value})}
                            placeholder="Paste Image URL or upload file"
                            className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-yellow-500/50 font-mono"
                          />
                          <input 
                            type="file" 
                            accept="image/*"
                            className="hidden" 
                            id="match-image-upload"
                            onChange={async (e) => {
                              if (e.target.files && e.target.files[0]) {
                                const url = await handleImageUpload(e.target.files[0]);
                                if (url) setNewMatch({...newMatch, image: url});
                              }
                            }}
                          />
                          <button 
                            type="button"
                            onClick={() => document.getElementById('match-image-upload')?.click()}
                            className="bg-yellow-500 hover:bg-yellow-400 text-black p-2.5 rounded-xl transition-colors shrink-0"
                            title="Upload Image"
                          >
                            {isUploadingImg ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                          </button>
                        </div>
                        
                        {newMatch.image && (
                          <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 group">
                             <img src={newMatch.image} alt="Preview" className="w-full h-full object-cover" />
                             <button 
                               type="button"
                               onClick={() => setNewMatch({...newMatch, image: ''})}
                               className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                             >
                               <Trash2 className="w-3.5 h-3.5" />
                             </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 2: Date & Time */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 border-b border-zinc-800 pb-2 mb-4">
                    <div className="bg-blue-500/10 p-1.5 rounded-lg">
                      <Clock className="w-4 h-4 text-blue-500" />
                    </div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-widest">Schedule</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Match Date</label>
                      <input required type="date" value={newMatch.date} onChange={e => setNewMatch({...newMatch, date: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-yellow-500" />
                    </div>
                    
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Start Time</label>
                      <input required type="time" value={newMatch.time} onChange={e => setNewMatch({...newMatch, time: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-yellow-500" />
                    </div>
                  </div>
                </div>

                {/* Section 3: Prize & Entry */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 border-b border-zinc-800 pb-2 mb-4">
                    <div className="bg-yellow-500/10 p-1.5 rounded-lg">
                      <img src={PK_COIN_ICON} alt="Coin" className="w-4 h-4 object-contain" />
                    </div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-widest">Entry & Rewards</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Entry Fee (PKR)</label>
                      <input required type="number" min="0" value={newMatch.entryFee} onChange={e => setNewMatch({...newMatch, entryFee: Number(e.target.value)})} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-yellow-500" />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Total Prize (PKR)</label>
                      <input required type="number" min="0" value={newMatch.prizePool} onChange={e => setNewMatch({...newMatch, prizePool: Number(e.target.value)})} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-yellow-500" />
                    </div>
                    
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Per Kill Prize</label>
                      <input type="number" min="0" value={newMatch.perKill} onChange={e => setNewMatch({...newMatch, perKill: Number(e.target.value)})} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-yellow-500" placeholder="Optional" />
                    </div>

                    <div className="col-span-2 lg:col-span-1">
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Total Slots</label>
                      <input required type="number" min="2" value={newMatch.spotsTotal} onChange={e => setNewMatch({...newMatch, spotsTotal: Number(e.target.value)})} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-yellow-500" />
                    </div>
                  </div>
                </div>
                
                <button type="submit" className="w-full bg-yellow-500 text-black font-black uppercase tracking-widest py-5 rounded-2xl hover:bg-yellow-400 transition-all mt-6 shadow-[0_10px_20px_rgba(234,179,8,0.2)] active:scale-[0.98] flex items-center justify-center space-x-2">
                  <Play className="w-5 h-5 fill-current" />
                  <span>Publish Tournament Match</span>
                </button>
             </form>
          </div>
        </div>
      )}

      {/* Rules Modal */}
      {isRulesModalOpen && editingRulesMatch && (
        <div className="fixed inset-0 bg-black/90  z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-zinc-800 bg-zinc-900/50 shrink-0">
              <h2 className="text-lg font-black text-yellow-500 uppercase tracking-widest">Edit Rules</h2>
              <button onClick={() => setIsRulesModalOpen(false)} className="text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                   <div className="flex-1 relative">
                     <input 
                       type="text"
                       value={newRuleInput}
                       onChange={e => setNewRuleInput(e.target.value)}
                       placeholder="Enter new rule..."
                       className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-yellow-500 text-xs pr-10"
                       onKeyDown={(e) => {
                         if (e.key === 'Enter') {
                           e.preventDefault();
                           if (newRuleInput.trim()) {
                             setMatchRulesText(prev => prev ? `${prev}\n${newRuleInput.trim()}` : newRuleInput.trim());
                             setNewRuleInput('');
                           }
                         }
                       }}
                     />
                   </div>
                   <button 
                     onClick={() => {
                       if (newRuleInput.trim()) {
                         setMatchRulesText(prev => prev ? `${prev}\n${newRuleInput.trim()}` : newRuleInput.trim());
                         setNewRuleInput('');
                       }
                     }}
                     className="bg-zinc-900 border border-zinc-800 p-3 rounded-xl text-yellow-500 hover:bg-zinc-800 transition-colors"
                   >
                     <Plus className="w-4 h-4" />
                   </button>
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Current Rules</label>
                  <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                    {matchRulesText.split('\n').filter(r => r.trim()).length > 0 ? (
                      matchRulesText.split('\n').filter(r => r.trim()).map((rule, idx) => (
                        <div key={idx} className="group flex items-start bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 hover:border-yellow-500/30 transition-all">
                          <div className="w-5 h-5 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center text-[10px] text-yellow-500 font-bold shrink-0 mt-0.5 mr-3">
                            {idx + 1}
                          </div>
                          <p className="text-[11px] text-zinc-300 flex-1 leading-relaxed">{rule}</p>
                          <button 
                            onClick={() => {
                              const rules = matchRulesText.split('\n').filter(r => r.trim());
                              rules.splice(idx, 1);
                              setMatchRulesText(rules.join('\n'));
                            }}
                            className="text-zinc-600 hover:text-red-500 transition-colors p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-10 bg-zinc-900/30 border border-dashed border-zinc-800 rounded-2xl">
                        <FileText className="w-8 h-8 text-zinc-800 mx-auto mb-2" />
                        <p className="text-[10px] text-zinc-600 uppercase font-bold tracking-widest">No rules added yet</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-zinc-800 bg-zinc-900/50 shrink-0">
              <button 
                onClick={handleUpdateRules}
                className="w-full bg-yellow-500 text-black font-black py-4 rounded-xl uppercase tracking-[0.2em] hover:bg-yellow-400 transition-all shadow-[0_0_20px_rgba(234,179,8,0.3)] active:scale-[0.98]"
              >
                Save Rules
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Result Modal */}
      {isResultModalOpen && (
        <div className="fixed inset-0 bg-black/90  z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-zinc-800 bg-zinc-900/50">
              <h2 className="text-lg font-black text-yellow-500 uppercase tracking-widest">Assign Winner</h2>
              <button onClick={() => setIsResultModalOpen(false)} className="text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAssignResult} className="p-6 space-y-6">
               <div>
                 <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Select Match</label>
                 <select required value={selectedMatchId} onChange={e => setSelectedMatchId(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-yellow-500">
                    <option value="">-- Choose Match --</option>
                    {tournaments.filter(t => t.status !== 'COMPLETED' && t.status !== 'CANCELLED').map(t => (
                      <option key={t.id} value={t.id}>{t.title} - #{t.id.substring(0,6).toUpperCase()}</option>
                    ))}
                 </select>
               </div>
               <div>
                 <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Select Winner (User)</label>
                 <select required value={winnerId} onChange={e => setWinnerId(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-yellow-500">
                    <option value="">-- Choose User --</option>
                    {users.map(u => (
                      <option key={u.uid} value={u.uid}>{u.username} ({u.email})</option>
                    ))}
                 </select>
               </div>
               <div>
                 <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Winner Kills</label>
                 <input required type="number" min="0" value={winnerKills} onChange={e => setWinnerKills(Number(e.target.value))} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-yellow-500" />
               </div>
               <button type="submit" className="w-full bg-yellow-500 text-black font-black uppercase tracking-widest py-4 rounded-xl hover:bg-yellow-400 transition-colors mt-6 shadow-[0_0_20px_rgba(234,179,8,0.2)]">
                 Confirm & Distribute Prize
               </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Coins Modal */}
      {isCoinsModalOpen && (
        <div className="fixed inset-0 bg-black/90  z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-zinc-800 bg-zinc-900/50">
              <h2 className="text-lg font-black text-yellow-500 uppercase tracking-widest">Add Coins to Wallet</h2>
              <button onClick={() => setIsCoinsModalOpen(false)} className="text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAddCoins} className="p-6 space-y-6">
               <div>
                 <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Select User</label>
                 <select required value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-yellow-500">
                    <option value="">-- Choose User --</option>
                    {users.map(u => (
                      <option key={u.uid} value={u.uid}>{u.username} ({u.email})</option>
                    ))}
                 </select>
               </div>
               <div>
                 <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Amount (Coins/PKR)</label>
                 <input required type="number" min="1" value={coinsAmount} onChange={e => setCoinsAmount(Number(e.target.value))} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-yellow-500" />
               </div>
               <button type="submit" className="w-full bg-green-500 text-black font-black uppercase tracking-widest py-4 rounded-xl hover:bg-green-400 transition-colors mt-6 shadow-[0_0_20px_rgba(34,197,94,0.2)]">
                 Deposit to Wallet
               </button>
            </form>
          </div>
        </div>
      )}



      {/* Edit Match Modal */}
      {isEditMatchModalOpen && editingMatch && (
        <div className="fixed inset-0 bg-black/90  z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-2xl overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-zinc-800 bg-zinc-900/50">
              <h2 className="text-lg font-black text-yellow-500 uppercase tracking-widest">Edit Match</h2>
              <button onClick={() => setIsEditMatchModalOpen(false)} className="text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleUpdateMatch} className="p-6 overflow-y-auto max-h-[70vh] space-y-6">
               <div className="grid grid-cols-2 gap-4">
                 <div className="col-span-2">
                   <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Match Title</label>
                   <input required type="text" value={editingMatch.title} onChange={e => setEditingMatch({...editingMatch, title: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-yellow-500" />
                 </div>
                 
                 <div>
                   <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Category Event</label>
                   <select value={editingMatch.type} onChange={e => setEditingMatch({...editingMatch, type: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-yellow-500">
                      <option value="TDM">TDM</option>
                      <option value="Erangel">Erangel</option>
                      <option value="Miramar">Miramar</option>
                      <option value="Livik">Livik</option>
                      <option value="Sanhok">Sanhok</option>
                      <option value="Random">Random</option>
                      <option value="Event">Event</option>
                   </select>
                 </div>
                 
                 <div>
                   <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Team Mode</label>
                   <select value={editingMatch.mode} onChange={e => setEditingMatch({...editingMatch, mode: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-yellow-500">
                      <option value="SOLO">Solo</option>
                      <option value="DUO">Duo</option>
                      <option value="TRIO">Trio</option>
                      <option value="SQUAD">Squad</option>
                   </select>
                 </div>

                 <div>
                   <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Date</label>
                   <input required type="date" value={editingMatch.date} onChange={e => setEditingMatch({...editingMatch, date: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-yellow-500" />
                 </div>
                 
                 <div>
                   <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Time</label>
                   <input required type="time" value={editingMatch.time} onChange={e => setEditingMatch({...editingMatch, time: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-yellow-500" />
                 </div>

                 <div>
                   <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Status</label>
                   <select value={editingMatch.status} onChange={e => setEditingMatch({...editingMatch, status: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-yellow-500">
                      <option value="UPCOMING">UPCOMING</option>
                      <option value="LIVE">LIVE</option>
                      <option value="IN-PROGRESS">IN-PROGRESS</option>
                      <option value="COMPLETED">COMPLETED</option>
                      <option value="CANCELLED">CANCELLED</option>
                   </select>
                 </div>
                 
                 <div>
                   <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Entry Fee (PKR)</label>
                   <input required type="number" min="0" value={editingMatch.entryFee} onChange={e => setEditingMatch({...editingMatch, entryFee: Number(e.target.value)})} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-yellow-500" />
                 </div>

                 <div>
                   <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Prize Pool (PKR)</label>
                   <input required type="number" min="0" value={editingMatch.prizePool} onChange={e => setEditingMatch({...editingMatch, prizePool: Number(e.target.value)})} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-yellow-500" />
                 </div>
                 
                 <div>
                   <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Per Kill Prize</label>
                   <input type="number" min="0" value={editingMatch.perKill} onChange={e => setEditingMatch({...editingMatch, perKill: Number(e.target.value)})} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-yellow-500" />
                 </div>

                 <div>
                   <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Total Slots</label>
                   <input required type="number" min="2" value={editingMatch.spotsTotal} onChange={e => setEditingMatch({...editingMatch, spotsTotal: Number(e.target.value)})} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-yellow-500" />
                 </div>
                 <div>
                   <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Map</label>
                   <input required type="text" value={editingMatch.map} onChange={e => setEditingMatch({...editingMatch, map: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-yellow-500" />
                 </div>
                 <PrizeDistributionEditor match={editingMatch} setMatch={setEditingMatch} />
                 
                 <div className="col-span-2">
                   <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Match Image (Optional)</label>
                   <div className="space-y-3">
                     <div className="flex gap-2">
                       <input 
                         type="text"
                         value={editingMatch.image || ''}
                         onChange={(e) => setEditingMatch({...editingMatch, image: e.target.value})}
                         placeholder="Paste Image URL or upload file"
                         className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-yellow-500/50 font-mono"
                       />
                       <input 
                         type="file" 
                         accept="image/*"
                         className="hidden" 
                         id="edit-match-image-upload"
                         onChange={async (e) => {
                           if (e.target.files && e.target.files[0]) {
                             const url = await handleImageUpload(e.target.files[0]);
                             if (url) setEditingMatch({...editingMatch, image: url});
                           }
                         }} 
                       />
                       <label 
                         htmlFor="edit-match-image-upload" 
                         className={`flex items-center space-x-1.5 px-4 py-2.5 rounded-xl border border-yellow-500/30 bg-yellow-500/10 text-yellow-500 font-bold text-xs uppercase cursor-pointer hover:bg-yellow-500 hover:text-black transition-all whitespace-nowrap ${isUploadingImg ? 'opacity-50 pointer-events-none' : ''}`}
                       >
                         {isUploadingImg ? <div className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" /> : <><ImageIcon className="w-4 h-4" /><span>Upload</span></>}
                       </label>
                     </div>
                     {editingMatch.image && (
                       <div className="relative group w-fit">
                         <img src={editingMatch.image} alt="Match" className="w-28 h-16 rounded-xl object-cover border border-zinc-800" />
                         <button 
                           type="button"
                           onClick={() => setEditingMatch({...editingMatch, image: ''})}
                           className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                         >
                           <X className="w-3 h-3" />
                         </button>
                       </div>
                     )}
                   </div>
                 </div>
               </div>
               
               <button type="submit" className="w-full bg-yellow-500 text-black font-black uppercase tracking-widest py-4 rounded-xl hover:bg-yellow-400 transition-colors mt-6 shadow-[0_0_20px_rgba(234,179,8,0.2)]">
                 Save Changes
               </button>
            </form>
          </div>
        </div>
      )}

      {/* Room ID & Pass Modal */}
      {isRoomModalOpen && (
        <div className="fixed inset-0 bg-black/90  z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-zinc-800 bg-zinc-900/50">
              <h2 className="text-lg font-black text-yellow-500 uppercase tracking-widest">Update Room Details</h2>
              <button onClick={() => setIsRoomModalOpen(false)} className="text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleUpdateRoom} className="p-6 space-y-6">
               <div>
                 <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Room ID</label>
                 <input type="text" value={roomData.roomId} onChange={e => setRoomData({...roomData, roomId: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-yellow-500" placeholder="e.g. 12345678" />
               </div>
               <div>
                 <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Room Password</label>
                 <input type="text" value={roomData.password} onChange={e => setRoomData({...roomData, password: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-yellow-500" placeholder="e.g. pk123" />
               </div>
               <button type="submit" className="w-full bg-yellow-500 text-black font-black uppercase tracking-widest py-4 rounded-xl hover:bg-yellow-400 transition-colors mt-6 shadow-[0_0_20px_rgba(234,179,8,0.2)]">
                 Save Room Details
               </button>
            </form>
          </div>
        </div>
      )}

      {/* Players Modal */}
      {isPlayersModalOpen && (
        <div className="fixed inset-0 bg-black/90  z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-zinc-800 bg-zinc-900/50 shrink-0">
              <div>
                <h2 className="text-lg font-black text-yellow-500 uppercase tracking-widest">
                  {tournaments.find(t => t.id === selectedMatchId)?.status === 'COMPLETED' ? 'Match Results' : 'Joined Players'}
                </h2>
                <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-tighter mt-1">
                  {tournaments.find(t => t.id === selectedMatchId)?.title} • {matchPlayers.length} Participants
                </p>
              </div>
              <button onClick={() => setIsPlayersModalOpen(false)} className="text-zinc-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div className="px-6 py-3 bg-zinc-900/80 border-b border-zinc-800 flex items-center space-x-3 shrink-0">
              <Search className="w-4 h-4 text-zinc-400 shrink-0" />
              <input 
                type="text" 
                value={playerSearchTerm} 
                onChange={e => setPlayerSearchTerm(e.target.value)} 
                placeholder="Search by username, IGN, phone, UID or slot..."
                className="w-full bg-transparent text-xs text-white placeholder-zinc-500 focus:outline-none"
              />
              {playerSearchTerm && (
                <button onClick={() => setPlayerSearchTerm('')} className="text-zinc-500 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              {matchPlayers.length === 0 ? (
                <div className="text-center py-12 flex flex-col items-center">
                  <UserX className="w-12 h-12 text-zinc-800 mb-4" />
                  <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">No participants found for this match</p>
                </div>
              ) : matchPlayers.filter(p => {
                  if (!playerSearchTerm.trim()) return true;
                  const term = playerSearchTerm.toLowerCase();
                  const matchUsername = p.username?.toLowerCase().includes(term);
                  const matchIgn = p.inGameName?.toLowerCase().includes(term);
                  const matchUid = p.gameUid?.toLowerCase().includes(term);
                  const matchPhone = p.phone?.toLowerCase().includes(term);
                  const matchSlot = String(p.slot).includes(term);
                  const matchTeam = p.teamDetails?.some((m: any) => 
                    m.inGameName?.toLowerCase().includes(term) || m.gameUid?.toLowerCase().includes(term)
                  );
                  return matchUsername || matchIgn || matchUid || matchPhone || matchSlot || matchTeam;
                }).length === 0 ? (
                <div className="text-center py-12 flex flex-col items-center">
                  <UserX className="w-12 h-12 text-zinc-800 mb-4" />
                  <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">No matching participants found</p>
                </div>
              ) : (
                matchPlayers
                  .filter(p => {
                    if (!playerSearchTerm.trim()) return true;
                    const term = playerSearchTerm.toLowerCase();
                    const matchUsername = p.username?.toLowerCase().includes(term);
                    const matchIgn = p.inGameName?.toLowerCase().includes(term);
                    const matchUid = p.gameUid?.toLowerCase().includes(term);
                    const matchPhone = p.phone?.toLowerCase().includes(term);
                    const matchSlot = String(p.slot).includes(term);
                    const matchTeam = p.teamDetails?.some((m: any) => 
                      m.inGameName?.toLowerCase().includes(term) || m.gameUid?.toLowerCase().includes(term)
                    );
                    return matchUsername || matchIgn || matchUid || matchPhone || matchSlot || matchTeam;
                  })
                  .sort((a, b) => {
                    if (a.status === 'COMPLETED' && b.status === 'COMPLETED') return (a.rank || 99) - (b.rank || 99);
                    if (a.status === 'COMPLETED') return -1;
                    if (b.status === 'COMPLETED') return 1;
                    return a.slot - b.slot;
                  })
                  .map((player, idx) => (
                  <div key={idx} className={`flex flex-col md:flex-row justify-between items-start md:items-center p-4 rounded-xl gap-4 border transition-all ${
                    player.status === 'COMPLETED' ? 'bg-zinc-900/80 border-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.05)]' : 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-700'
                  }`}>
                     <div className="flex flex-col w-full">
                        <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-zinc-800">
                           <span className="text-xs font-black text-yellow-500 bg-yellow-500/10 border border-yellow-500/30 px-3 py-1 rounded-lg uppercase tracking-widest shadow-[0_0_10px_rgba(234,179,8,0.1)]">
                              Slot #{player.slot}
                           </span>
                        </div>
                        <div>
                          <div className="flex flex-col">
                             <div className="text-base font-black text-white uppercase tracking-tight flex items-center">
                               {player.username}
                               {player.status === 'COMPLETED' && <Medal className="w-3 h-3 ml-2 text-yellow-500" />}
                             </div>
                             <div className="flex items-center space-x-1 text-[10px] text-zinc-400 font-bold mt-0.5">
                               <span>{player.phone}</span>
                               <button onClick={() => { navigator.clipboard.writeText(player.phone); toast.success('Phone copied!'); }} className="text-zinc-500 hover:text-white transition-colors ml-1">
                                 <Copy className="w-3 h-3" />
                               </button>
                             </div>
                          </div>
                          <div className="grid grid-cols-1 gap-1 mt-3 border-t border-zinc-800 pt-3">
                             <div className="flex items-center space-x-2">
                                <span className="text-[9px] text-zinc-500 font-black uppercase tracking-widest min-w-[45px]">IGN :</span>
                                <span className="text-[11px] text-yellow-500 font-black uppercase tracking-tight">{player.inGameName}</span>
                             </div>
                             <div className="flex items-center space-x-2">
                                <span className="text-[9px] text-zinc-500 font-black uppercase tracking-widest min-w-[45px]">UID :</span>
                                <span className="text-[11px] text-white font-black tracking-tight">{player.gameUid}</span>
                             </div>
                             <div className="flex items-center space-x-2 mt-1"></div>
                              {player.teamDetails && player.teamDetails.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-zinc-800/80">
                                  <div className="text-[10px] text-yellow-500 font-black uppercase tracking-widest mb-1.5 flex items-center">
                                    <Users className="w-3 h-3 mr-1" /> Teammates ({player.teamDetails.length})
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {player.teamDetails.map((mate: any, mIdx: number) => (
                                      <div key={mIdx} className="bg-zinc-950/60 p-2 rounded-lg border border-zinc-800/60 text-[10px]">
                                        <div className="flex items-center justify-between text-white font-bold">
                                          <span className="text-yellow-400">#{mIdx + 1} {mate.inGameName || 'N/A'}</span>
                                          <span className="text-zinc-400 font-mono text-[9px]">{mate.gameUid || 'N/A'}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                          </div>
                        </div>
                     </div>
                     <div className="flex flex-col items-end space-y-2 w-full md:w-auto">
                        {resultPlayerId === player.uid ? (
                           <div className="flex flex-col bg-zinc-950 p-3 rounded-lg border border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.1)] w-full sm:w-auto">
                             <div className="text-[10px] text-yellow-500 font-bold uppercase tracking-widest mb-2 flex items-center"><Trophy className="w-3 h-3 mr-1" /> Enter Match Results</div>
                             <div className="flex items-center space-x-2 mb-3">
                               <div className="flex flex-col flex-1">
                                 <label className="text-[9px] text-zinc-500 uppercase font-bold mb-1">Rank</label>
                                 <div className="relative">
                                   <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                                     <span className="text-zinc-500 text-xs font-bold">#</span>
                                   </div>
                                   <input type="number" min="1" value={resultData.rank} onChange={e => setResultData({...resultData, rank: Number(e.target.value)})} className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 pl-6 text-xs font-bold text-white focus:outline-none focus:border-yellow-500/50" />
                                 </div>
                               </div>
                               <div className="flex flex-col flex-1">
                                 <label className="text-[9px] text-zinc-500 uppercase font-bold mb-1">Kills</label>
                                 <input type="number" min="0" value={resultData.kills} onChange={e => setResultData({...resultData, kills: Number(e.target.value)})} className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-xs font-bold text-white focus:outline-none focus:border-yellow-500/50" />
                               </div>
                               <div className="flex flex-col flex-1">
                                 <label className="text-[9px] text-zinc-500 uppercase font-bold mb-1">Winning (₹)</label>
                                 <input type="number" min="0" value={resultData.winnings || 0} onChange={e => setResultData({...resultData, winnings: Number(e.target.value)})} className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-xs font-bold text-white focus:outline-none focus:border-yellow-500/50" />
                               </div>
                             </div>
                             <div className="flex items-center space-x-2">
                                <button onClick={() => confirmAddPlayerResult(player)} className="flex-1 bg-yellow-500 text-black px-3 py-2 rounded text-xs font-bold uppercase hover:bg-yellow-400 transition-colors shadow-[0_0_10px_rgba(234,179,8,0.3)]">Save Result</button>
                                <button onClick={() => setResultPlayerId('')} className="bg-zinc-800 text-zinc-400 hover:text-white px-3 py-2 rounded text-xs uppercase font-bold transition-colors">Cancel</button>
                             </div>
                           </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            {player.status === 'COMPLETED' ? (
                               <div className="px-3 py-1.5 bg-green-500/10 text-green-500 border border-green-500/20 rounded-lg text-xs font-bold flex items-center">
                                 <Trophy className="w-3 h-3 mr-1" /> Rank {player.rank} • {player.kills} Kills • PKR {player.winnings || 0}
                               </div>
                            ) : (
                               <button onClick={() => { setResultPlayerId(player.uid); setResultData({ rank: 1, kills: 0, winnings: 0 }); }} className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/30 px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase hover:bg-yellow-500 hover:text-black transition-colors text-center flex items-center"><Trophy className="w-3 h-3 mr-1" /> Add Result</button>
                            )}
                            <button onClick={() => confirmKickPlayer(player)} className="bg-red-500/10 text-red-500 border border-red-500/30 px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase hover:bg-red-500 hover:text-black transition-colors text-center">Kick & Refund</button>
                          </div>
                        )}
                     </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    
      {/* Create Admin Role Modal */}
      {isCreateRoleModalOpen && (
        <div className="fixed inset-0 bg-black/95  z-[60] flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-md overflow-hidden shadow-[0_0_50px_rgba(234,179,8,0.1)]">
            <div className="flex justify-between items-center p-6 border-b border-zinc-900 bg-zinc-900/30">
              <h2 className="text-sm font-black text-yellow-500 uppercase tracking-[0.2em]">New Admin Identity</h2>
              <button onClick={() => setIsCreateRoleModalOpen(false)} className="text-zinc-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreateOrUpdateAdminRole} className="p-8 space-y-6">
               <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 ml-1">Admin Display Name</label>
                    <input required type="text" value={newAdminRole.adminName} onChange={e => setNewAdminRole({...newAdminRole, adminName: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-white focus:outline-none focus:border-yellow-500/50 transition-all" placeholder="e.g. Moderator Alex" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 ml-1">Secret Access Key</label>
                    <input required type="text" value={newAdminRole.adminKey} onChange={e => setNewAdminRole({...newAdminRole, adminKey: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-white font-mono focus:outline-none focus:border-yellow-500/50 transition-all" placeholder="Enter custom key..." />
                  </div>
               </div>

               <div className="space-y-4">
                  <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 ml-1 border-b border-zinc-900 pb-2">Module Access Permissions</label>
                  <div className="grid grid-cols-2 gap-3">
                     {Object.keys(newAdminRole.permissions).map((perm) => (
                       <label key={perm} className="flex items-center justify-between p-3 bg-zinc-900 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer group">
                          <span className="text-[10px] font-bold text-zinc-400 group-hover:text-zinc-200 uppercase tracking-wider">{perm.replace('_', ' ')}</span>
                          <input 
                            type="checkbox" 
                            checked={(newAdminRole.permissions as any)[perm]} 
                            onChange={e => setNewAdminRole({
                              ...newAdminRole, 
                              permissions: { ...newAdminRole.permissions, [perm]: e.target.checked }
                            })}
                            className="w-4 h-4 rounded border-zinc-800 bg-zinc-950 text-yellow-500 focus:ring-yellow-500/20 transition-all"
                          />
                       </label>
                     ))}
                  </div>
               </div>

               <button type="submit" className="w-full bg-yellow-500 text-black font-black uppercase tracking-widest py-4 rounded-2xl hover:bg-yellow-400 transition-all shadow-[0_15px_30px_rgba(234,179,8,0.1)] mt-4">
                 Initialize Admin Access
               </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {isEditUserModalOpen && editingUser && (
        <div className="fixed inset-0 bg-black/95  z-[60] flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-[0_0_50px_rgba(234,179,8,0.1)]">
            <div className="flex justify-between items-center p-6 border-b border-zinc-900 bg-zinc-900/30">
              <h2 className="text-sm font-black text-yellow-500 uppercase tracking-[0.2em]">Edit User Profile</h2>
              <button onClick={() => setIsEditUserModalOpen(false)} className="text-zinc-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleUpdateUser} className="p-8 space-y-6 overflow-y-auto max-h-[80vh]">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest border-b border-zinc-900 pb-2">Basic Information</h3>
                    <div>
                      <label className="block text-[9px] font-bold text-zinc-500 uppercase mb-1.5 ml-1">Username</label>
                      <input type="text" value={editingUser.username || ''} onChange={e => setEditingUser({...editingUser, username: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-yellow-500/50" />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-zinc-500 uppercase mb-1.5 ml-1">Email</label>
                      <input type="email" value={editingUser.email || ''} onChange={e => setEditingUser({...editingUser, email: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-yellow-500/50" />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-zinc-500 uppercase mb-1.5 ml-1">Phone Number</label>
                      <input type="text" value={editingUser.phone || ''} onChange={e => setEditingUser({...editingUser, phone: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-yellow-500/50" />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-zinc-500 uppercase mb-1.5 ml-1">Password</label>
                      <input type="text" value={editingUser.password || ''} onChange={e => setEditingUser({...editingUser, password: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-yellow-500/50" />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest border-b border-zinc-900 pb-2">Game Details</h3>
                    <div>
                      <label className="block text-[9px] font-bold text-zinc-500 uppercase mb-1.5 ml-1">In-Game Name (IGN)</label>
                      <input type="text" value={editingUser.inGameName || ''} onChange={e => setEditingUser({...editingUser, inGameName: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-yellow-500/50" />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-zinc-500 uppercase mb-1.5 ml-1">Game UID</label>
                      <input type="text" value={editingUser.gameUid || ''} onChange={e => setEditingUser({...editingUser, gameUid: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-yellow-500/50" />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-zinc-500 uppercase mb-1.5 ml-1">Bio</label>
                      <textarea value={editingUser.bio || ''} onChange={e => setEditingUser({...editingUser, bio: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-yellow-500/50 h-24 resize-none" />
                    </div>
                  </div>

                  <div className="col-span-full space-y-4 pt-4">
                    <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest border-b border-zinc-900 pb-2">Financial Status</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                       <div>
                         <label className="block text-[9px] font-bold text-zinc-500 uppercase mb-1.5 ml-1">Wallet Balance</label>
                         <input type="number" value={editingUser.walletBalance || 0} onChange={e => setEditingUser({...editingUser, walletBalance: Number(e.target.value)})} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm font-black text-yellow-500 focus:outline-none focus:border-yellow-500/50" />
                       </div>
                       <div>
                         <label className="block text-[9px] font-bold text-zinc-500 uppercase mb-1.5 ml-1">Deposit Balance</label>
                         <input type="number" value={editingUser.depositBalance || 0} onChange={e => setEditingUser({...editingUser, depositBalance: Number(e.target.value)})} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm font-black text-zinc-400 focus:outline-none focus:border-yellow-500/50" />
                       </div>
                       <div>
                         <label className="block text-[9px] font-bold text-zinc-500 uppercase mb-1.5 ml-1">Total Earnings</label>
                         <input type="number" value={editingUser.totalEarnings || 0} onChange={e => setEditingUser({...editingUser, totalEarnings: Number(e.target.value)})} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm font-black text-green-500 focus:outline-none focus:border-yellow-500/50" />
                       </div>
                    </div>
                  </div>
               </div>

               <button type="submit" className="w-full bg-yellow-500 text-black font-black uppercase tracking-widest py-4 rounded-2xl hover:bg-yellow-400 transition-all shadow-[0_15px_30px_rgba(234,179,8,0.1)]">
                 Commit Changes
               </button>
            </form>
          </div>
        </div>
      )}

      {/* Ban User Modal */}
      {isBanModalOpen && editingUser && (
        <div className="fixed inset-0 bg-black/95  z-[60] flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-md overflow-hidden shadow-[0_20px_60px_rgba(239,68,68,0.1)]">
            <div className="flex justify-between items-center p-6 border-b border-red-900/20 bg-red-900/5">
              <h2 className="text-sm font-black text-red-500 uppercase tracking-[0.2em]">Restrict Access</h2>
              <button onClick={() => setIsBanModalOpen(false)} className="text-zinc-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleBanUser} className="p-8 space-y-6">
               <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mb-4 border border-red-500/20">
                    <ShieldAlert className="w-8 h-8 text-red-500" />
                  </div>
                  <h3 className="text-lg font-black text-white">Ban User: {editingUser.username}</h3>
                  <p className="text-[10px] text-zinc-500 uppercase font-bold mt-1 tracking-widest">This user will be blocked from all activities</p>
               </div>

               <div className="space-y-2">
                  <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Reason for Ban</label>
                  <textarea 
                    required
                    value={banReason}
                    onChange={e => setBanReason(e.target.value)}
                    className="w-full h-32 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-white focus:outline-none focus:border-red-500/50 transition-all resize-none text-sm"
                    placeholder="Violation of terms, cheating, toxic behavior..."
                  />
               </div>

               <button type="submit" className="w-full bg-red-600 text-white font-black uppercase tracking-widest py-4 rounded-2xl hover:bg-red-500 transition-all shadow-[0_15px_30px_rgba(220,38,38,0.2)]">
                 Confirm Ban Restraint
               </button>
            </form>
          </div>
        </div>
      )}

      {/* Announcement Modal */}
      {isAnnouncementModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 text-left">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-zinc-950 border border-yellow-500/20 w-full max-w-lg rounded-3xl overflow-hidden shadow-[0_25px_50px_-12px_rgba(234,179,8,0.2)] max-h-[90vh] flex flex-col"
          >
            <div className="bg-yellow-500 p-6 flex justify-between items-center shrink-0">
               <div>
                 <h3 className="text-black font-black uppercase tracking-widest text-base">Add Announcement</h3>
                 <p className="text-black/80 text-xs font-semibold">Post news, winner announcements, or match alerts</p>
               </div>
               <button onClick={() => setIsAnnouncementModalOpen(false)} className="text-black/50 hover:text-black">
                 <X className="w-6 h-6" />
               </button>
            </div>

            <form onSubmit={handlePublishAnnouncement} className="p-6 space-y-5 overflow-y-auto flex-1 scrollbar-hide">
               <div>
                  <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest block mb-2">Announcement Title *</label>
                  <input 
                    type="text" 
                    required
                    value={newAnnouncement.title}
                    onChange={(e) => setNewAnnouncement({...newAnnouncement, title: e.target.value})}
                    placeholder="e.g. Winner Announcement - Erangel Match #45"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-yellow-500/50"
                  />
               </div>

               <div>
                  <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest block mb-2">Announcement Category / Tag</label>
                  <select 
                    value={newAnnouncement.tag}
                    onChange={(e) => setNewAnnouncement({...newAnnouncement, tag: e.target.value})}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-yellow-500/50 uppercase font-bold"
                  >
                     <option value="NEWS">News</option>
                     <option value="WINNER">Winner Announcement</option>
                     <option value="MATCH">Match Alert / Update</option>
                     <option value="ALERT">Important Notice</option>
                  </select>
               </div>

               <div>
                  <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest block mb-2">Image (Optional - Upload or Paste URL)</label>
                  <div className="flex flex-col space-y-3">
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        value={newAnnouncement.imageUrl || ''}
                        onChange={(e) => setNewAnnouncement({...newAnnouncement, imageUrl: e.target.value})}
                        placeholder="Paste Image URL or upload file"
                        className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-yellow-500/50 font-mono"
                      />
                      <input 
                        type="file" 
                        accept="image/*"
                        className="hidden" 
                        id="announcement-image-upload"
                        onChange={async (e) => {
                          if (e.target.files && e.target.files[0]) {
                            setIsUploadingAnnouncementImg(true);
                            const url = await handleImageUpload(e.target.files[0]);
                            setIsUploadingAnnouncementImg(false);
                            if (url) setNewAnnouncement(prev => ({ ...prev, imageUrl: url }));
                          }
                        }} 
                      />
                      <label 
                        htmlFor="announcement-image-upload" 
                        className={`flex items-center space-x-1.5 px-4 py-2.5 rounded-xl border border-yellow-500/30 bg-yellow-500/10 text-yellow-500 font-bold text-xs uppercase cursor-pointer hover:bg-yellow-500 hover:text-black transition-all whitespace-nowrap ${isUploadingAnnouncementImg ? 'opacity-50 pointer-events-none' : ''}`}
                      >
                        {isUploadingAnnouncementImg ? <div className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" /> : <><ImageIcon className="w-4 h-4" /><span>Upload</span></>}
                      </label>
                    </div>
                    {newAnnouncement.imageUrl && (
                      <div className="relative rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900 aspect-[16/9] max-h-48">
                        <img src={newAnnouncement.imageUrl} alt="Announcement Preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setNewAnnouncement(prev => ({ ...prev, imageUrl: '' }))}
                          className="absolute top-2 right-2 bg-black/80 hover:bg-black text-white p-1 rounded-full text-xs"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
               </div>

               <div>
                  <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest block mb-2">Description Text *</label>
                  <textarea 
                    required
                    rows={6}
                    value={newAnnouncement.description}
                    onChange={(e) => setNewAnnouncement({...newAnnouncement, description: e.target.value})}
                    placeholder="Enter announcement details, winners, match updates, or guidelines here..."
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-yellow-500/50 leading-relaxed resize-none"
                  />
               </div>

               <div className="pt-3 border-t border-zinc-800 flex justify-end items-center space-x-3">
                  <button 
                    type="button" 
                    onClick={() => setIsAnnouncementModalOpen(false)} 
                    className="px-5 py-2.5 rounded-xl border border-zinc-800 text-zinc-400 text-xs font-bold uppercase hover:bg-zinc-900 hover:text-white transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={isPublishingAnnouncement || isUploadingAnnouncementImg}
                    className="px-8 py-2.5 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-black text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-yellow-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPublishingAnnouncement ? 'PUBLISHING...' : 'PUBLISH'}
                  </button>
               </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Add / Edit Popup Modal */}
      {isPopupModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 text-left">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-zinc-950 border border-yellow-500/20 w-full max-w-lg rounded-3xl overflow-hidden shadow-[0_25px_50px_-12px_rgba(234,179,8,0.2)] max-h-[90vh] flex flex-col"
          >
            <div className="bg-yellow-500 p-6 flex justify-between items-center shrink-0">
               <div>
                 <h3 className="text-black font-black uppercase tracking-widest text-base">
                   {editingPopup ? 'Edit Popup' : 'Add App Open Popup'}
                 </h3>
                 <p className="text-black/80 text-xs font-semibold">
                   Show alert to players immediately upon opening the app
                 </p>
               </div>
               <button onClick={() => setIsPopupModalOpen(false)} className="text-black/50 hover:text-black">
                 <X className="w-6 h-6" />
               </button>
            </div>

            <form onSubmit={handleSavePopup} className="p-6 space-y-5 overflow-y-auto flex-1 scrollbar-hide">
               <div>
                  <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest block mb-2">
                    Popup Title *
                  </label>
                  <input 
                    type="text" 
                    required
                    value={newPopup.title}
                    onChange={(e) => setNewPopup({...newPopup, title: e.target.value})}
                    placeholder="e.g. WELCOME TO SEASON 5 / IMPORTANT ANNOUNCEMENT"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-yellow-500/50"
                  />
               </div>

               <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">
                      Image (Optional)
                    </label>
                    <span className="text-[10px] text-yellow-500/80 font-semibold">
                      Pehle Image phir Title & Description dikhega
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 mb-2">
                    Agar image provide karenge to popup me sabse pehle image aayegi. Agar nahi denge to sirf Title aur Description aayega.
                  </p>
                  <div className="flex flex-col space-y-3">
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={newPopup.imageUrl || ''}
                        onChange={(e) => setNewPopup({...newPopup, imageUrl: e.target.value})}
                        placeholder="Paste Image URL or upload file"
                        className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-yellow-500/50 font-mono"
                      />
                      <input 
                        type="file" 
                        accept="image/*"
                        className="hidden" 
                        id="popup-image-upload-modal"
                        onChange={async (e) => {
                          if (e.target.files && e.target.files[0]) {
                            setIsUploadingPopupImg(true);
                            const url = await handleImageUpload(e.target.files[0]);
                            setIsUploadingPopupImg(false);
                            if (url) setNewPopup(prev => ({ ...prev, imageUrl: url }));
                          }
                        }} 
                      />
                      <label 
                        htmlFor="popup-image-upload-modal" 
                        className={`flex items-center space-x-1.5 px-4 py-2.5 rounded-xl border border-yellow-500/30 bg-yellow-500/10 text-yellow-500 font-bold text-xs uppercase cursor-pointer hover:bg-yellow-500 hover:text-black transition-all whitespace-nowrap ${isUploadingPopupImg ? 'opacity-50 pointer-events-none' : ''}`}
                      >
                        {isUploadingPopupImg ? <div className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" /> : <><ImageIcon className="w-4 h-4" /><span>Upload</span></>}
                      </label>
                    </div>
                    {newPopup.imageUrl && (
                      <div className="relative rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900 aspect-[16/9] max-h-48">
                        <img src={newPopup.imageUrl} alt="Popup Preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setNewPopup(prev => ({ ...prev, imageUrl: '' }))}
                          className="absolute top-2 right-2 bg-black/80 hover:bg-black text-white p-1 rounded-full text-xs cursor-pointer"
                          title="Remove Image"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
               </div>

               <div>
                  <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest block mb-2">
                    Description Text *
                  </label>
                  <textarea 
                    required
                    rows={6}
                    value={newPopup.description}
                    onChange={(e) => setNewPopup({...newPopup, description: e.target.value})}
                    placeholder="Enter popup description, details, tournament notice, or prize update..."
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-yellow-500/50 leading-relaxed resize-none"
                  />
               </div>

               <div className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-900 border border-zinc-800">
                 <div>
                   <span className="text-xs font-bold text-white block">Status: {newPopup.isActive ? 'Active' : 'Inactive'}</span>
                   <span className="text-[10px] text-zinc-500">App open hone par popup show karein</span>
                 </div>
                 <button
                   type="button"
                   onClick={() => setNewPopup(prev => ({ ...prev, isActive: !prev.isActive }))}
                   className={`w-12 h-6 rounded-full transition-colors relative ${newPopup.isActive ? 'bg-yellow-500' : 'bg-zinc-700'}`}
                 >
                   <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-black transition-transform ${newPopup.isActive ? 'translate-x-6' : 'translate-x-0'}`} />
                 </button>
               </div>

               <div className="pt-3 border-t border-zinc-800 flex justify-end items-center space-x-3">
                  <button 
                    type="button" 
                    onClick={() => setIsPopupModalOpen(false)} 
                    className="px-5 py-2.5 rounded-xl border border-zinc-800 text-zinc-400 text-xs font-bold uppercase hover:bg-zinc-900 hover:text-white transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={isPublishingPopup || isUploadingPopupImg}
                    className="px-8 py-2.5 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-black text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-yellow-500/10 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isPublishingPopup ? 'SAVING...' : editingPopup ? 'UPDATE POPUP' : 'PUBLISH POPUP'}
                  </button>
               </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Confirmation Modal Overlay */}
      {/* Banner Modal */}
      {isBannerModalOpen && (
        <div className="fixed inset-0 bg-black/80  z-[100] flex items-center justify-center p-4 text-left">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-zinc-950 border border-yellow-500/20 w-full max-w-md rounded-3xl overflow-hidden shadow-[0_25px_50px_-12px_rgba(234,179,8,0.2)]"
          >
            <div className="bg-yellow-500 p-6 flex justify-between items-center">
               <h3 className="text-black font-black uppercase tracking-widest">{editingBanner ? 'Edit Banner' : 'Add New Banner'}</h3>
               <button onClick={() => setIsBannerModalOpen(false)} className="text-black/50 hover:text-black"><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleSaveBanner} className="p-6 space-y-5">
               <div>
                  <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest block mb-2">Banner Image</label>
                  <div className="flex flex-col space-y-3">
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        value={newBanner.imageUrl || ''}
                        onChange={(e) => setNewBanner({...newBanner, imageUrl: e.target.value})}
                        placeholder="Paste Image URL or upload file"
                        className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-yellow-500/50 font-mono"
                      />
                      <input 
                        type="file" 
                        accept="image/*"
                        className="hidden" 
                        id="banner-image-upload"
                        onChange={async (e) => {
                          if (e.target.files && e.target.files[0]) {
                            const url = await handleImageUpload(e.target.files[0]);
                            if (url) setNewBanner({...newBanner, imageUrl: url});
                          }
                        }} 
                      />
                      <label 
                        htmlFor="banner-image-upload" 
                        className={`flex items-center space-x-1.5 px-4 py-2.5 rounded-xl border border-yellow-500/30 bg-yellow-500/10 text-yellow-500 font-bold text-xs uppercase cursor-pointer hover:bg-yellow-500 hover:text-black transition-all whitespace-nowrap ${isUploadingImg ? 'opacity-50 pointer-events-none' : ''}`}
                      >
                        {isUploadingImg ? <div className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" /> : <><ImageIcon className="w-4 h-4" /><span>Upload</span></>}
                      </label>
                    </div>
                    {newBanner.imageUrl && (
                      <img src={newBanner.imageUrl} alt="Banner Preview" className="w-full h-32 object-cover rounded-xl border border-zinc-800" />
                    )}
                  </div>
               </div>
               <div>
                  <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest block mb-2">Target Link / URL (Optional)</label>
                  <input 
                    type="text" 
                    value={newBanner.link || ''}
                    onChange={(e) => setNewBanner({...newBanner, link: e.target.value})}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-yellow-500/50"
                    placeholder="e.g. https://wa.me/923001234567 or https://..."
                  />
                  <p className="text-[10px] text-zinc-500 mt-1">
                    Clicking banner will open this link in external Chrome / app (WhatsApp, Telegram, Website, etc.).
                  </p>
               </div>
               <div>
                  <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest block mb-2">Banner Type</label>
                  <select 
                    value={newBanner.type}
                    onChange={(e) => setNewBanner({...newBanner, type: e.target.value as any})}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-yellow-500/50"
                  >
                     <option value="home">Home Slider</option>
                     <option value="event">Event Banner</option>
                     <option value="offer">Special Offer</option>
                     <option value="popup">Popup Modal</option>
                  </select>
               </div>
               <div className="flex items-center space-x-3 p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800">
                  <input 
                    type="checkbox" 
                    id="banner-active"
                    checked={newBanner.isActive}
                    onChange={(e) => setNewBanner({...newBanner, isActive: e.target.checked})}
                    className="w-5 h-5 rounded border-zinc-700 bg-zinc-800 text-yellow-500 focus:ring-0"
                  />
                  <label htmlFor="banner-active" className="text-sm text-zinc-300 font-bold cursor-pointer">Active Banner</label>
               </div>
               
               <button 
                 type="submit"
                 className="w-full bg-yellow-500 text-black py-4 rounded-2xl font-black uppercase tracking-[0.2em] shadow-lg hover:bg-yellow-400 transition-all active:scale-95"
               >
                 {editingBanner ? 'Update Banner' : 'Publish Banner'}
               </button>
            </form>
          </motion.div>
        </div>
      )}

      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-black/95  z-[100] flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.9)]">
            <div className="p-5 border-b border-zinc-800 bg-zinc-900/40 flex items-center space-x-3.5">
              <div className={`p-2.5 rounded-xl border ${
                confirmModal.type === 'danger' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                confirmModal.type === 'success' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                confirmModal.type === 'warning' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                'bg-zinc-500/10 text-zinc-400 border-zinc-800'
              }`}>
                {confirmModal.type === 'danger' && <ShieldAlert className="w-5 h-5" />}
                {confirmModal.type === 'success' && <CheckCircle className="w-5 h-5" />}
                {confirmModal.type === 'warning' && <Trophy className="w-5 h-5" />}
                {confirmModal.type !== 'danger' && confirmModal.type !== 'success' && confirmModal.type !== 'warning' && <Info className="w-5 h-5" />}
              </div>
              <h2 className="text-sm font-black text-white uppercase tracking-widest">{confirmModal.title}</h2>
            </div>
            
            <div className="p-6">
              <p className="text-xs text-zinc-300 leading-relaxed font-semibold">{confirmModal.message}</p>
            </div>
            
            <div className="p-5 bg-zinc-900/30 border-t border-zinc-800 flex justify-end space-x-3">
              <button
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white rounded-xl text-xs font-bold transition-all uppercase tracking-wider"
              >
                {confirmModal.cancelText || 'Cancel'}
              </button>
              <button
                onClick={async () => {
                  try {
                    await confirmModal.onConfirm();
                  } catch (err) {
                    console.error("Error inside confirm callback:", err);
                  } finally {
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                  }
                }}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all uppercase tracking-wider ${
                  confirmModal.type === 'danger' ? 'bg-red-500 text-black hover:bg-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)]' :
                  confirmModal.type === 'success' ? 'bg-green-500 text-black hover:bg-green-400 shadow-[0_0_15px_rgba(34,197,94,0.2)]' :
                  confirmModal.type === 'warning' ? 'bg-yellow-500 text-black hover:bg-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.2)]' :
                  'bg-yellow-500 text-black hover:bg-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.2)]'
                }`}
              >
                {confirmModal.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {notifConfirmModal && (
        <div className="fixed inset-0 bg-black/95  z-[101] flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.9)] text-left">
            <div className="p-5 border-b border-zinc-800 bg-zinc-900/40 flex items-center space-x-3.5">
              <div className="p-2.5 rounded-xl border bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                <Bell className="w-5 h-5 animate-bounce" />
              </div>
              <h2 className="text-sm font-black text-white uppercase tracking-widest">{notifConfirmModal.title}</h2>
            </div>
            
            <div className="p-6">
              <p className="text-xs text-zinc-300 leading-relaxed font-semibold">{notifConfirmModal.message}</p>
            </div>
            
            <div className="p-5 bg-zinc-900/30 border-t border-zinc-800 flex flex-col gap-2">
              <button
                onClick={async () => {
                  try {
                    await notifConfirmModal.onConfirmSend();
                  } catch (err) {
                    console.error("Error saving and sending notification:", err);
                  } finally {
                    setNotifConfirmModal(null);
                  }
                }}
                className="w-full px-5 py-3 rounded-xl text-xs font-black transition-all uppercase tracking-widest bg-yellow-500 text-black hover:bg-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.2)] text-center"
              >
                Send Notification & Save
              </button>
              <button
                onClick={async () => {
                  try {
                    await notifConfirmModal.onConfirmSaveOnly();
                  } catch (err) {
                    console.error("Error saving only:", err);
                  } finally {
                    setNotifConfirmModal(null);
                  }
                }}
                className="w-full px-5 py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white rounded-xl text-xs font-black transition-all uppercase tracking-widest text-center"
              >
                Save Only (No Notification)
              </button>
              <button
                onClick={() => setNotifConfirmModal(null)}
                className="w-full px-5 py-2 text-zinc-500 hover:text-zinc-300 text-xs font-bold transition-all uppercase tracking-wider text-center mt-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Image Proof Modal */}
      <AnimatePresence>
        {isProofModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsProofModalOpen(false)}
              className="absolute inset-0 bg-black/90 "
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-4xl max-h-[90vh] bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col"
            >
               <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
                  <div className="flex items-center space-x-2">
                     <ImageIcon className="w-4 h-4 text-yellow-500" />
                     <span className="text-xs font-black text-white uppercase tracking-widest">Transaction Proof / Receipt</span>
                  </div>
                  <button 
                    onClick={() => setIsProofModalOpen(false)}
                    className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-all"
                  >
                     <X className="w-5 h-5" />
                  </button>
               </div>
               <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-zinc-950">
                  <img 
                    src={viewingProofUrl || ''} 
                    alt="Proof" 
                    className="max-w-full h-auto rounded-lg shadow-2xl border border-zinc-800"
                  />
               </div>
               <div className="p-4 border-t border-zinc-800 bg-zinc-900/50 flex justify-end">
                  <button 
                    onClick={() => setIsProofModalOpen(false)}
                    className="bg-zinc-800 text-white px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-zinc-700 transition-all"
                  >
                     Close
                  </button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
</div>
  );
};

// --- Sub-Components ---
const MonitorPlay = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
    <line x1="8" y1="21" x2="16" y2="21"></line>
    <line x1="12" y1="17" x2="12" y2="21"></line>
    <polygon points="10 7 15 10 10 13 10 7"></polygon>
  </svg>
);

const StatCard = ({ title, value, sub, icon: Icon, color, hideSub = false }: any) => (
  <div className="bg-zinc-900/50 border border-yellow-500/20 rounded-2xl p-4 flex flex-col justify-between group hover:bg-zinc-900 transition-colors">
    <div className="flex justify-between items-start mb-3">
      <div className={`p-2 rounded-xl bg-zinc-950 border border-zinc-800 ${color} group-hover:scale-110 transition-transform shadow-[0_0_10px_rgba(234,179,8,0.05)]`}>
        <Icon className="w-4 h-4" />
      </div>
    </div>
    <div>
       <p className="text-[8px] text-zinc-400 uppercase font-bold tracking-wider mb-1">{title}</p>
       <h3 className="text-lg font-black text-white">{value}</h3>
       {!hideSub && (
         <div className="flex items-center mt-1 space-x-1.5">
           {sub === 'Live' && <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_5px_#22c55e]" />}
           {sub?.includes('+') && <div className="w-0 h-0 border-l-[3px] border-r-[3px] border-b-[4px] border-l-transparent border-r-transparent border-b-green-500" />}
           <p className={`text-[8px] ${sub === 'Live' || sub?.includes('+') ? 'text-green-500' : 'text-zinc-500'} font-bold`}>{sub}</p>
         </div>
       )}
    </div>
  </div>
);

const ActivityItem = ({ icon: Icon, text, time, color = "text-zinc-400" }: any) => (
  <div className="flex justify-between items-center">
    <div className="flex items-center space-x-3">
      <div className={`p-1.5 rounded-lg bg-zinc-950 border border-zinc-800 ${color}`}>
         <Icon className="w-3.5 h-3.5" />
      </div>
      <p className="text-[10px] text-zinc-300 font-medium">{text}</p>
    </div>
    <span className="text-[9px] text-zinc-500">{time}</span>
  </div>
);

const QuickAction = ({ icon: Icon, text, onClick }: any) => (
  <button onClick={onClick} className="flex items-center space-x-3 px-5 py-3.5 bg-zinc-900/50 border border-yellow-500/20 rounded-xl hover:bg-zinc-900 hover:border-yellow-500/50 transition-all group shrink-0 shadow-[0_0_15px_rgba(234,179,8,0.05)] flex-1 min-w-[140px] justify-center">
     <div className="text-yellow-500 group-hover:scale-110 transition-transform">
        <Icon className="w-4 h-4" />
     </div>
     <span className="text-[10px] font-bold text-zinc-300 group-hover:text-white uppercase tracking-wider">{text}</span>
  </button>
);

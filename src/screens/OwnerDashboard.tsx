import React, { useState, useEffect, useMemo } from 'react';
import { 
  Shield, 
  Key, 
  UserPlus, 
  Edit2, 
  Trash2, 
  Lock, 
  Unlock, 
  LogOut, 
  CheckCircle2, 
  X, 
  Crown,
  FileText,
  Eye,
  EyeOff,
  Menu,
  Search,
  Bell,
  Power,
  ShieldCheck,
  RefreshCw,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ref, onValue, set, push, update, remove } from 'firebase/database';
import { db } from '../lib/firebase';
import { AdminRole } from '../types';
import toast from 'react-hot-toast';
import { PK_LOGO_IMAGE, DEFAULT_AVATAR } from '../lib/assets';

const OWNER_LOGO = PK_LOGO_IMAGE;
const OWNER_AVATAR = DEFAULT_AVATAR;

const ALL_MODULES = [
  { id: 'dashboard', label: 'Dashboard & Stats', desc: 'View global overview and stats' },
  { id: 'tournaments', label: 'Tournaments Management', desc: 'Create, edit & manage tournaments' },
  { id: 'results', label: 'Match Results & Rooms', desc: 'Room ID/Pass & results upload' },
  { id: 'users', label: 'Players & Users', desc: 'View, search, edit & ban users' },
  { id: 'transactions', label: 'Deposit Requests', desc: 'Verify incoming deposit proofs' },
  { id: 'withdrawals', label: 'Withdrawal Requests', desc: 'Approve and process payouts' },
  { id: 'wallet', label: 'Coin Packages & Wallet', desc: 'Manage coin packs and adjustments' },
  { id: 'teams', label: 'Squads & Teams', desc: 'View and manage team rosters' },
  { id: 'banners', label: 'Home Banners', desc: 'Manage top sliding banners' },
  { id: 'notifications', label: 'Notifications & Alerts', desc: 'Send push alerts to users' },
  { id: 'promo_codes', label: 'Promo Codes', desc: 'Generate and track promo codes' },
  { id: 'leaderboard', label: 'Leaderboard', desc: 'Rankings and high scorers' },
  { id: 'referrals', label: 'Referral System', desc: 'Referral settings and rewards' },
  { id: 'payment_settings', label: 'Payment Accounts', desc: 'Payment receiver numbers and QRs' },
  { id: 'settings', label: 'App Settings & Maintenance', desc: 'Maintenance mode and rules' },
  { id: 'themes', label: 'Theme Styling', desc: 'Seasonal styles and presets' },
  { id: 'system', label: 'System Health', desc: 'Server and database connection status' },
  { id: 'popups', label: 'In-App Popups', desc: 'Announcements and custom popups' },
  { id: 'pin_resets', label: 'PIN Reset Requests', desc: 'Handle user PIN resets' }
];

export function OwnerDashboard() {
  const [ownerKeyInput, setOwnerKeyInput] = useState('');
  const [isOwnerAuthenticated, setIsOwnerAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [rememberMe, setRememberMe] = useState(true);
  const [showKeyText, setShowKeyText] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Active Tab in Owner Panel
  const [activeTab, setActiveTab] = useState<string>('roles');

  // Firebase state
  const [adminRoles, setAdminRoles] = useState<AdminRole[]>([]);
  const [currentOwnerData, setCurrentOwnerData] = useState<{ key: string; deviceId?: string } | null>(null);
  const [adminLogs, setAdminLogs] = useState<any[]>([]);

  // Modals state
  const [isCreateRoleModalOpen, setIsCreateRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<AdminRole | null>(null);
  const [newAdminRole, setNewAdminRole] = useState<{
    adminName: string;
    adminKey: string;
    permissions: Record<string, boolean>;
  }>({
    adminName: '',
    adminKey: '',
    permissions: {
      dashboard: true,
      tournaments: false,
      results: false,
      users: false,
      transactions: false,
      withdrawals: false,
      wallet: false,
      teams: false,
      banners: false,
      notifications: false,
      promo_codes: false,
      leaderboard: false,
      referrals: false,
      payment_settings: false,
      settings: false,
      themes: false,
      system: false,
      popups: false,
      pin_resets: false
    }
  });

  // Owner Key Change state
  const [newOwnerKey, setNewOwnerKey] = useState('');
  const [confirmOwnerKey, setConfirmOwnerKey] = useState('');
  const [isChangingKey, setIsChangingKey] = useState(false);

  // Helper function to get device unique ID
  const getDeviceId = () => {
    let devId = localStorage.getItem('pk_device_id');
    if (!devId) {
      devId = 'DEV_' + Math.random().toString(36).substring(2, 12).toUpperCase();
      localStorage.setItem('pk_device_id', devId);
    }
    return devId;
  };

  // Nav Items - styled exactly like Admin Dashboard
  const navItems = [
    { id: 'roles', label: 'Admin Roles', icon: Shield },
    { id: 'owner_key', label: 'Master Key', icon: Key },
    { id: 'logs', label: 'Audit Logs', icon: FileText },
  ];

  // Sync with Firebase
  useEffect(() => {
    const rolesRef = ref(db, 'adminRoles');
    const unsubRoles = onValue(rolesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setAdminRoles(Object.values(data));
      } else {
        setAdminRoles([]);
      }
    });

    const ownerRef = ref(db, 'owner');
    const unsubOwner = onValue(ownerRef, (snapshot) => {
      const data = snapshot.val();
      if (snapshot.exists()) {
        if (typeof data === 'string') {
          setCurrentOwnerData({ key: data });
        } else if (data && typeof data === 'object') {
          setCurrentOwnerData({
            key: data.key || data.adminKey || 'PAKARENA',
            deviceId: data.deviceId
          });
        }
      } else {
        set(ownerRef, { key: 'PAKARENA' });
        setCurrentOwnerData({ key: 'PAKARENA' });
      }
    });

    const logsRef = ref(db, 'adminLogs');
    const unsubLogs = onValue(logsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data).map(([id, val]: [string, any]) => ({
          id,
          ...val
        }));
        list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        setAdminLogs(list);
      } else {
        setAdminLogs([]);
      }
    });

    return () => {
      unsubRoles();
      unsubOwner();
      unsubLogs();
    };
  }, []);

  // Auto Login if remembered
  useEffect(() => {
    const savedOwnerKey = localStorage.getItem('owner_access_key');
    if (savedOwnerKey && currentOwnerData) {
      const currentMaster = currentOwnerData.key || 'PAKARENA';
      if (savedOwnerKey === currentMaster) {
        const currentDevId = getDeviceId();
        if (!currentOwnerData.deviceId || currentOwnerData.deviceId === currentDevId) {
          setIsOwnerAuthenticated(true);
        }
      }
    }
    setIsCheckingAuth(false);
  }, [currentOwnerData]);

  // Handle Login
  const handleOwnerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerKeyInput.trim()) {
      toast.error('Please enter the Master Key');
      return;
    }

    const currentMaster = currentOwnerData?.key || 'PAKARENA';

    if (ownerKeyInput.trim() === currentMaster) {
      const currentDevId = getDeviceId();

      // Check device lock
      if (currentOwnerData?.deviceId && currentOwnerData.deviceId !== currentDevId) {
        toast.error('Access Denied: Owner Portal is locked to another device.');
        return;
      }

      // Bind device if not bound
      if (!currentOwnerData?.deviceId) {
        await update(ref(db, 'owner'), { deviceId: currentDevId });
      }

      setIsOwnerAuthenticated(true);
      if (rememberMe) {
        localStorage.setItem('owner_access_key', ownerKeyInput.trim());
      } else {
        localStorage.removeItem('owner_access_key');
      }
      toast.success('👑 Welcome Supreme Owner');
    } else {
      toast.error('Invalid Owner Master Key');
      setOwnerKeyInput('');
    }
  };

  const handleLogout = () => {
    setIsOwnerAuthenticated(false);
    localStorage.removeItem('owner_access_key');
    setOwnerKeyInput('');
    toast.success('Logged out of Owner Portal');
  };

  // Create / Update Admin Role
  const handleCreateOrUpdateAdminRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminRole.adminKey.trim() || !newAdminRole.adminName.trim()) {
      toast.error('Admin Name and Access Key are required');
      return;
    }

    try {
      if (editingRole) {
        await update(ref(db, `adminRoles/${editingRole.id}`), {
          adminName: newAdminRole.adminName.trim(),
          adminKey: newAdminRole.adminKey.trim(),
          permissions: newAdminRole.permissions
        });
        toast.success(`Updated role: ${newAdminRole.adminName}`);
      } else {
        const roleRef = push(ref(db, 'adminRoles'));
        await set(roleRef, {
          id: roleRef.key,
          adminName: newAdminRole.adminName.trim(),
          adminKey: newAdminRole.adminKey.trim(),
          permissions: newAdminRole.permissions,
          createdAt: new Date().toISOString()
        });
        toast.success(`Created sub-admin: ${newAdminRole.adminName}`);
      }

      setIsCreateRoleModalOpen(false);
      setEditingRole(null);
      resetNewRoleForm();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save Admin Role');
    }
  };

  const resetNewRoleForm = () => {
    setNewAdminRole({
      adminName: '',
      adminKey: '',
      permissions: {
        dashboard: true,
        tournaments: false,
        results: false,
        users: false,
        transactions: false,
        withdrawals: false,
        wallet: false,
        teams: false,
        banners: false,
        notifications: false,
        promo_codes: false,
        leaderboard: false,
        referrals: false,
        payment_settings: false,
        settings: false,
        themes: false,
        system: false,
        popups: false,
        pin_resets: false
      }
    });
  };

  // Delete Sub Admin
  const handleDeleteRole = async (roleId: string, roleName: string) => {
    if (window.confirm(`Are you sure you want to permanently delete Admin "${roleName}"?`)) {
      try {
        await remove(ref(db, `adminRoles/${roleId}`));
        toast.success(`Admin "${roleName}" deleted`);
      } catch (err) {
        toast.error('Failed to delete role');
      }
    }
  };

  // Reset Sub Admin Device Lock
  const handleResetRoleDevice = async (roleId: string, roleName: string) => {
    try {
      await update(ref(db, `adminRoles/${roleId}`), { deviceId: null });
      toast.success(`Device lock reset for "${roleName}".`);
    } catch (err) {
      toast.error('Failed to reset device lock');
    }
  };

  // Change Owner Master Key
  const handleChangeOwnerKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOwnerKey.trim()) {
      toast.error('Please enter new Owner Key');
      return;
    }
    if (newOwnerKey.length < 5) {
      toast.error('Owner Key must be at least 5 characters long');
      return;
    }
    if (newOwnerKey !== confirmOwnerKey) {
      toast.error('Keys do not match');
      return;
    }

    try {
      setIsChangingKey(true);
      const devId = getDeviceId();
      await set(ref(db, 'owner'), {
        key: newOwnerKey.trim(),
        deviceId: devId,
        updatedAt: new Date().toISOString()
      });

      localStorage.setItem('owner_access_key', newOwnerKey.trim());
      setNewOwnerKey('');
      setConfirmOwnerKey('');
      toast.success('👑 Master Owner Key successfully updated!');
    } catch (err: any) {
      toast.error('Failed to update Owner Key');
    } finally {
      setIsChangingKey(false);
    }
  };

  // Reset Owner Device Binding
  const handleResetOwnerDevice = async () => {
    if (window.confirm('Reset Owner device lock? Any device with the Master Key will be able to bind.')) {
      try {
        await update(ref(db, 'owner'), { deviceId: null });
        toast.success('Owner device lock reset successfully.');
      } catch (err) {
        toast.error('Failed to reset lock');
      }
    }
  };

  // Toggle all permissions at once
  const handleToggleAllPermissions = (enable: boolean) => {
    const updatedPerms: Record<string, boolean> = {};
    ALL_MODULES.forEach(m => {
      updatedPerms[m.id] = enable;
    });
    setNewAdminRole(prev => ({
      ...prev,
      permissions: updatedPerms
    }));
  };

  // Filtered Roles based on search
  const filteredRoles = useMemo(() => {
    if (!searchTerm.trim()) return adminRoles;
    const term = searchTerm.toLowerCase();
    return adminRoles.filter(
      r => r.adminName?.toLowerCase().includes(term) || r.adminKey?.toLowerCase().includes(term)
    );
  }, [adminRoles, searchTerm]);

  // Filtered Logs based on search
  const filteredLogs = useMemo(() => {
    if (!searchTerm.trim()) return adminLogs;
    const term = searchTerm.toLowerCase();
    return adminLogs.filter(
      l => 
        l.adminName?.toLowerCase().includes(term) || 
        l.action?.toLowerCase().includes(term) || 
        l.details?.toLowerCase().includes(term)
    );
  }, [adminLogs, searchTerm]);

  // If still checking auth
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center relative overflow-hidden">
        <motion.div 
          animate={{ rotate: 360 }} 
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }} 
          className="w-16 h-16 border-4 border-zinc-800 border-t-yellow-500 rounded-full" 
        />
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          transition={{ delay: 0.5 }} 
          className="mt-8 text-xs font-black text-yellow-500 uppercase tracking-[0.2em]"
        >
          Authenticating Owner Protocol...
        </motion.div>
      </div>
    );
  }

  // --- LOGIN SCREEN (EXACT ADMIN STYLE) ---
  if (!isOwnerAuthenticated) {
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
          <div className="bg-zinc-950/40 p-8 md:p-12 rounded-[2.5rem] border border-zinc-800/50 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
            <div className="flex flex-col items-center mb-10 text-center">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-3xl overflow-hidden border-2 border-yellow-500/20 mb-6 p-1.5 bg-zinc-900/50 shadow-[0_0_50px_rgba(234,179,8,0.1)] relative group">
                <div className="absolute inset-0 bg-yellow-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <img src={OWNER_LOGO} alt="Logo" className="w-full h-full object-cover rounded-2xl relative z-10" />
              </div>
              <h1 className="text-xl md:text-2xl font-black text-white tracking-[0.2em] uppercase mb-1">Terminal Owner</h1>
              <p className="text-yellow-500/60 text-[9px] font-black uppercase tracking-[0.4em]">Root Authorization Required</p>
            </div>

            <form onSubmit={handleOwnerLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest ml-4">Identity Authorization Key</label>
                <div className="relative group">
                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-700 group-focus-within:text-yellow-500 transition-colors" />
                  <input 
                    type={showKeyText ? "text" : "password"}
                    value={ownerKeyInput}
                    onChange={(e) => setOwnerKeyInput(e.target.value)}
                    placeholder="ENTER KEY"
                    className="w-full bg-zinc-900/40 border border-zinc-800 rounded-2xl py-5 pl-14 pr-12 text-white focus:outline-none focus:border-yellow-500/40 transition-all font-mono tracking-[0.2em] text-base placeholder:text-zinc-800 placeholder:tracking-normal"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowKeyText(!showKeyText)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300 transition-colors"
                  >
                    {showKeyText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
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

  // --- REUSABLE SIDEBAR COMPONENT (EXACT ADMIN STYLE) ---
  const renderSidebar = () => (
    <div className="flex flex-col h-full bg-[#0a0a0a] border-r border-yellow-500/10 shadow-[4px_0_24px_rgba(0,0,0,0.5)]">
      {/* Brand Header */}
      <div className="p-6 flex flex-col items-center justify-center border-b border-yellow-500/10">
        <div className="relative mb-2">
          <img src={OWNER_LOGO} alt="Pak Arena Logo" className="w-16 h-16 object-contain relative z-10" />
          <div className="absolute inset-0 bg-yellow-500 blur-xl opacity-20" />
        </div>
        <h1 className="text-xl font-black tracking-widest text-yellow-500 uppercase leading-none text-center">Pak Arena</h1>
        <p className="text-[8px] text-zinc-400 font-bold uppercase tracking-[0.2em] mt-1 text-center">Owner Console</p>
      </div>

      {/* Nav List - exact styling as Admin */}
      <div className="flex-1 overflow-y-auto py-4 space-y-1 px-3 custom-scrollbar" style={{ scrollBehavior: 'smooth' }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center space-x-4 px-4 py-3.5 rounded-xl text-xs transition-all duration-300 ${
                isActive 
                  ? 'bg-yellow-500/10 border border-yellow-500/30 shadow-[inset_0_0_15px_rgba(234,179,8,0.1)] text-yellow-500 font-bold' 
                  : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 font-medium'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-yellow-500' : 'text-zinc-500'}`} />
              <span>{item.label}</span>
              {item.id === 'roles' && adminRoles.length > 0 && (
                <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full font-mono bg-zinc-800 text-zinc-400">
                  {adminRoles.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Profile Card - exact Admin style */}
      <div className="p-4 border-t border-yellow-500/10 bg-[#0a0a0a]">
        <div className="flex items-center space-x-3 p-3 rounded-xl border border-zinc-800 bg-zinc-950">
          <img src={OWNER_AVATAR} alt="Owner" className="w-10 h-10 rounded-full border border-yellow-500/50" />
          <div className="flex-1">
            <p className="text-sm font-bold text-white">Supreme Owner</p>
            <p className="text-[10px] text-zinc-500">Root Administrator</p>
            <div className="flex items-center mt-1 space-x-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_5px_#22c55e]" />
              <span className="text-[9px] text-green-500 uppercase font-bold tracking-wider">Online</span>
            </div>
          </div>
        </div>
        <button 
          onClick={handleLogout}
          className="w-full mt-3 flex items-center justify-center space-x-2 p-2 rounded-xl border border-red-500/20 bg-red-500/5 text-red-500 hover:bg-red-500 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  // Active Tab Title
  const activeTabTitle = navItems.find(i => i.id === activeTab)?.label || 'DASHBOARD';

  // --- AUTHENTICATED OWNER DASHBOARD ---
  return (
    <div className="flex h-screen bg-[#050505] text-zinc-100 font-sans overflow-hidden">
      {/* Desktop Fixed Sidebar */}
      <div className="hidden lg:block fixed inset-y-0 left-0 w-[280px] z-50">
        {renderSidebar()}
      </div>

      {/* Mobile Sidebar Overlay & Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/90 z-[110] lg:hidden"
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              className="fixed inset-y-0 left-0 w-[280px] z-[120] lg:hidden"
            >
              {renderSidebar()}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:pl-[280px] min-w-0 h-screen bg-[#050505] relative overflow-hidden">
        {/* Top Header - Exact Admin Dashboard Style */}
        <header className="sticky top-0 h-[70px] border-b border-zinc-800 bg-[#0a0a0a]/90 flex items-center justify-between px-4 shrink-0 shadow-sm z-30">
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
              <h2 className="text-xl font-bold uppercase tracking-widest text-yellow-500 leading-none">
                {activeTabTitle}
              </h2>
              <p className="text-[10px] text-zinc-400 mt-1">Owner Console</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 md:space-x-6">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..." 
                className="bg-zinc-900 border border-zinc-800 rounded-lg py-2 pl-10 pr-4 text-xs w-64 text-white focus:outline-none focus:border-yellow-500/50"
              />
            </div>
            <div className="flex items-center space-x-2 md:space-x-4">
              <div className="relative">
                <Bell className="w-5 h-5 text-zinc-400 cursor-pointer hover:text-yellow-500" />
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center border-2 border-[#0a0a0a]">
                  <span className="text-[8px] font-black text-black">{adminRoles.length}</span>
                </div>
              </div>
              <button 
                onClick={handleLogout}
                className="p-2 text-zinc-400 hover:text-red-500"
                title="Logout"
              >
                <Power className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Scrollable Content Container */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-4 md:p-8 space-y-8 pb-32">
          {/* TAB 1: ADMIN ROLES */}
          {activeTab === 'roles' && (
            <div className="space-y-6">
              {/* Header with Stats & Create Button */}
              <div className="flex justify-between items-center bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
                <div>
                  <h3 className="text-sm font-bold text-yellow-500 uppercase tracking-wider">Admin Roles & Permissions</h3>
                  <p className="text-[10px] text-zinc-500 mt-1">Manage moderators, keys and module access levels</p>
                </div>
                <button 
                  onClick={() => {
                    setEditingRole(null);
                    resetNewRoleForm();
                    setIsCreateRoleModalOpen(true);
                  }}
                  className="bg-yellow-500 text-black px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-yellow-400 transition-all shadow-[0_0_20px_rgba(234,179,8,0.2)] flex items-center space-x-2"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Create New Admin</span>
                </button>
              </div>

              {/* Roles Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredRoles.map((role, i) => {
                  const allowedCount = Object.values(role.permissions || {}).filter(Boolean).length;
                  const isLocked = !!role.deviceId;

                  return (
                    <div key={role.id || i} className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 flex flex-col relative overflow-hidden group hover:border-yellow-500/40 transition-all">
                      <div className="absolute top-0 right-0 p-4 flex gap-2">
                        <button 
                          onClick={() => {
                            setEditingRole(role);
                            setNewAdminRole({
                              adminName: role.adminName,
                              adminKey: role.adminKey,
                              permissions: { ...role.permissions }
                            });
                            setIsCreateRoleModalOpen(true);
                          }}
                          className="p-2 bg-blue-500/10 text-blue-500 rounded-lg border border-blue-500/20 hover:bg-blue-500 hover:text-white transition-all"
                          title="Edit Admin Role"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteRole(role.id, role.adminName)}
                          className="p-2 bg-red-500/10 text-red-500 rounded-lg border border-red-500/20 hover:bg-red-500 hover:text-white transition-all"
                          title="Delete Admin"
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
                        <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest mb-3">
                          Allowed Modules ({allowedCount}/{ALL_MODULES.length})
                        </p>
                        <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                          {Object.entries(role.permissions || {}).filter(([_, allowed]) => allowed).map(([key]) => (
                            <span key={key} className="text-[8px] font-bold bg-zinc-900 text-zinc-400 px-2 py-1 rounded-md border border-zinc-800 uppercase">
                              {key.replace('_', ' ')}
                            </span>
                          ))}
                          {allowedCount === 0 && (
                            <span className="text-[9px] text-zinc-600 italic">No modules enabled</span>
                          )}
                        </div>
                      </div>

                      <div className="mt-6 pt-4 border-t border-zinc-900 flex justify-between items-center text-[9px]">
                        <div>
                          {isLocked ? (
                            <span className="flex items-center space-x-1 text-emerald-400 font-bold bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20">
                              <Lock className="w-3 h-3" />
                              <span>Device Locked</span>
                            </span>
                          ) : (
                            <span className="flex items-center space-x-1 text-zinc-500 bg-zinc-900 px-2 py-1 rounded-md border border-zinc-800">
                              <Unlock className="w-3 h-3" />
                              <span>Any Device</span>
                            </span>
                          )}
                        </div>
                        {isLocked ? (
                          <button
                            onClick={() => handleResetRoleDevice(role.id, role.adminName)}
                            className="text-zinc-400 hover:text-yellow-500 font-bold underline transition-colors"
                          >
                            Reset Device
                          </button>
                        ) : (
                          <span className="font-black text-yellow-500 uppercase tracking-widest">Active</span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {filteredRoles.length === 0 && (
                  <div className="col-span-full py-20 flex flex-col items-center justify-center text-zinc-600">
                    <Shield className="w-16 h-16 opacity-10 mb-4" />
                    <p className="text-xs uppercase tracking-widest font-bold">No custom admin roles found</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: MASTER KEY SETTINGS */}
          {activeTab === 'owner_key' && (
            <div className="max-w-2xl space-y-6">
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 md:p-8 shadow-xl">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="p-3 bg-yellow-500/10 rounded-2xl text-yellow-500 border border-yellow-500/20">
                    <Crown className="w-6 h-6 fill-current" />
                  </div>
                  <div>
                    <h2 className="text-base md:text-lg font-black uppercase tracking-wider text-white">
                      Supreme Master Key Management
                    </h2>
                    <p className="text-xs text-zinc-500">
                      Change the master key required to enter this Owner Portal
                    </p>
                  </div>
                </div>

                {/* Current Status */}
                <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl mb-6 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500 uppercase font-bold tracking-wider">Current Master Key:</span>
                    <span className="font-mono text-yellow-400 font-black bg-zinc-900 px-3 py-1 rounded-lg border border-zinc-800">
                      {currentOwnerData?.key || 'PAKARENA'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-3 border-t border-zinc-900">
                    <span className="text-zinc-500 uppercase font-bold tracking-wider">Device Binding Lock:</span>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs text-zinc-400">
                        {currentOwnerData?.deviceId ? 'ACTIVE (Bound to this device)' : 'UNBOUND (Any device)'}
                      </span>
                      {currentOwnerData?.deviceId && (
                        <button
                          onClick={handleResetOwnerDevice}
                          className="text-[10px] text-yellow-500 underline font-bold"
                        >
                          Reset Binding
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Change Key Form */}
                <form onSubmit={handleChangeOwnerKey} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 ml-1">
                      New Master Owner Key
                    </label>
                    <input
                      type="text"
                      required
                      value={newOwnerKey}
                      onChange={(e) => setNewOwnerKey(e.target.value)}
                      placeholder="Enter new strong master key..."
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-sm text-white font-mono focus:outline-none focus:border-yellow-500/50"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 ml-1">
                      Confirm New Key
                    </label>
                    <input
                      type="text"
                      required
                      value={confirmOwnerKey}
                      onChange={(e) => setConfirmOwnerKey(e.target.value)}
                      placeholder="Confirm new master key..."
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-sm text-white font-mono focus:outline-none focus:border-yellow-500/50"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isChangingKey}
                    className="w-full bg-yellow-500 text-black font-black uppercase tracking-widest text-xs py-4 rounded-xl hover:bg-yellow-400 transition-all shadow-[0_0_20px_rgba(234,179,8,0.2)] disabled:opacity-50 mt-4 flex items-center justify-center space-x-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isChangingKey ? 'Updating...' : 'Save & Update Master Key'}</span>
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 3: AUDIT & ACTIVITY LOGS */}
          {activeTab === 'logs' && (
            <div className="space-y-6">
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 md:p-8 shadow-xl">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 bg-yellow-500/10 rounded-2xl text-yellow-500 border border-yellow-500/20">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-base md:text-lg font-black uppercase tracking-wider text-white">
                        Admin Activity Audit Trail
                      </h2>
                      <p className="text-xs text-zinc-500">
                        Real-time records of actions taken by administrators
                      </p>
                    </div>
                  </div>

                  <span className="text-xs text-zinc-400 bg-zinc-950 px-3 py-1.5 rounded-xl border border-zinc-800 font-mono">
                    {filteredLogs.length} Records
                  </span>
                </div>

                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                  {filteredLogs.map((log, i) => (
                    <div 
                      key={log.id || i}
                      className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-2"
                    >
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-black text-yellow-400 uppercase tracking-wider">
                            {log.adminName || 'Admin'}
                          </span>
                          <span className="text-[10px] bg-zinc-900 text-zinc-400 px-2 py-0.5 rounded font-mono uppercase border border-zinc-800">
                            {log.action || 'ACTION'}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-300 mt-1">{log.details || log.message || 'Updated system data'}</p>
                      </div>

                      <div className="text-[10px] text-zinc-500 font-mono flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{log.timestamp ? new Date(log.timestamp).toLocaleString() : 'Recent'}</span>
                      </div>
                    </div>
                  ))}

                  {filteredLogs.length === 0 && (
                    <div className="py-16 text-center text-zinc-600 text-xs uppercase tracking-widest font-bold">
                      No Audit Logs Recorded Yet
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* --- CREATE / EDIT SUB ADMIN ROLE MODAL --- */}
      <AnimatePresence>
        {isCreateRoleModalOpen && (
          <div className="fixed inset-0 bg-black/95 z-[130] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-[0_0_60px_rgba(234,179,8,0.15)] my-8"
            >
              {/* Header */}
              <div className="flex justify-between items-center p-6 border-b border-zinc-900 bg-zinc-900/40">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-yellow-500/10 rounded-xl text-yellow-500 border border-yellow-500/20">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-yellow-500 uppercase tracking-[0.2em]">
                      {editingRole ? 'Edit Sub-Admin Role' : 'Create New Sub-Admin'}
                    </h2>
                    <p className="text-[10px] text-zinc-500">Configure role identity and module access</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsCreateRoleModalOpen(false)}
                  className="text-zinc-500 hover:text-white p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateOrUpdateAdminRole} className="p-6 md:p-8 space-y-6">
                {/* Admin credentials */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 ml-1">
                      Admin / Moderator Name
                    </label>
                    <input 
                      type="text" 
                      required
                      value={newAdminRole.adminName}
                      onChange={(e) => setNewAdminRole({ ...newAdminRole, adminName: e.target.value })}
                      placeholder="e.g. Tournament Manager Bilal"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-sm text-white focus:outline-none focus:border-yellow-500/50"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 ml-1">
                      Secret Admin Key
                    </label>
                    <input 
                      type="text" 
                      required
                      value={newAdminRole.adminKey}
                      onChange={(e) => setNewAdminRole({ ...newAdminRole, adminKey: e.target.value })}
                      placeholder="e.g. TOURNEY_BILAL_99"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-sm text-white font-mono focus:outline-none focus:border-yellow-500/50"
                    />
                  </div>
                </div>

                {/* Module Permissions Checklist */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-white">Module Access Permissions</h4>
                      <p className="text-[10px] text-zinc-500">Choose which sections this admin is allowed to access</p>
                    </div>

                    <div className="flex items-center space-x-2 text-[10px]">
                      <button
                        type="button"
                        onClick={() => handleToggleAllPermissions(true)}
                        className="text-yellow-500 hover:underline font-bold"
                      >
                        Select All
                      </button>
                      <span className="text-zinc-600">|</span>
                      <button
                        type="button"
                        onClick={() => handleToggleAllPermissions(false)}
                        className="text-zinc-400 hover:underline font-bold"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
                    {ALL_MODULES.map((mod) => {
                      const isChecked = !!newAdminRole.permissions[mod.id];
                      return (
                        <label
                          key={mod.id}
                          className={`flex items-start justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                            isChecked 
                              ? 'bg-yellow-500/10 border-yellow-500/30' 
                              : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
                          }`}
                        >
                          <div className="pr-2">
                            <div className="text-xs font-bold text-white uppercase tracking-wider">{mod.label}</div>
                            <div className="text-[9px] text-zinc-500 mt-0.5">{mod.desc}</div>
                          </div>
                          <input 
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => setNewAdminRole({
                              ...newAdminRole,
                              permissions: {
                                ...newAdminRole.permissions,
                                [mod.id]: e.target.checked
                              }
                            })}
                            className="mt-1 w-4 h-4 rounded bg-zinc-950 border-zinc-700 text-yellow-500 focus:ring-0"
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Submit button */}
                <div className="pt-4 border-t border-zinc-900 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsCreateRoleModalOpen(false)}
                    className="px-6 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-bold text-zinc-400 hover:bg-zinc-800 transition-all uppercase tracking-wider"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-8 py-3 rounded-xl bg-yellow-500 text-black text-xs font-black uppercase tracking-widest hover:bg-yellow-400 transition-all shadow-[0_0_20px_rgba(234,179,8,0.2)] active:scale-95"
                  >
                    {editingRole ? 'Save Changes' : 'Create Admin Role'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

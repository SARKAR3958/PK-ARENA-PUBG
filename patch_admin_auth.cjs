const fs = require('fs');
let code = fs.readFileSync('src/screens/AdminDashboard.tsx', 'utf8');

// 1. Add isCheckingAuth state and rememberMe state
code = code.replace(
  /const \[isAdminAuthenticated, setIsAdminAuthenticated\] = useState\(false\);/,
  `const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [rememberMe, setRememberMe] = useState(true);`
);

// 2. Change the rolesRef onValue callback and useEffect logic
const oldRolesEffect = `    const rolesRef = ref(db, 'adminRoles');
    onValue(rolesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const rolesList = Object.values(data) as AdminRole[];
        setAdminRoles(rolesList);
        
        // If we logged in with a key, find the matching role
        const savedKey = localStorage.getItem('admin_access_key');
        if (savedKey) {
          const role = rolesList.find(r => r.adminKey === savedKey);
          if (role) setCurrentAdminRole(role);
        }
      }
    });`;

const newRolesEffect = `    const rolesRef = ref(db, 'adminRoles');
    onValue(rolesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const rolesList = Object.values(data) as AdminRole[];
        setAdminRoles(rolesList);
      }
    });`;

code = code.replace(oldRolesEffect, newRolesEffect);

// Add a separate useEffect for auto-login
const authEffect = `
  useEffect(() => {
    if (adminRoles.length === 0) return;
    const checkAuth = async () => {
      const savedKey = localStorage.getItem('admin_access_key');
      if (savedKey) {
        if (savedKey === 'ADMIN12' || savedKey === 'PAKARENA') {
          setIsAdminAuthenticated(true);
          setIsCheckingAuth(false);
          return;
        }
        const role = adminRoles.find(r => r.adminKey === savedKey);
        if (role) {
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
  }, [adminRoles]);
`;

code = code.replace(
  /const handleSaveBanner = async/,
  authEffect + '\n  const handleSaveBanner = async'
);

// 3. handleAdminLogin logic to use rememberMe
code = code.replace(
  /localStorage\.setItem\('admin_access_key', adminKey\);/g,
  `if (rememberMe) { localStorage.setItem('admin_access_key', adminKey); } else { localStorage.removeItem('admin_access_key'); }`
);

// 4. Update the "Initialize Core" form to include "Remember Me" checkbox
const oldFormEnd = `              <button 
                type="submit"
                className="w-full h-16 bg-yellow-500 text-black font-black rounded-2xl shadow-[0_15px_30px_rgba(234,179,8,0.2)] hover:bg-yellow-400 active:scale-[0.98] transition-all flex items-center justify-center space-x-3 text-xs uppercase tracking-[0.2em]"
              >`;

const newFormEnd = `              <div className="flex items-center space-x-3 ml-2">
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
              >`;

code = code.replace(oldFormEnd, newFormEnd);

// 5. Update render to handle isCheckingAuth
const oldIfAdminAuth = `  if (!isAdminAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 md:p-6 relative overflow-hidden">`;

const newIfAdminAuth = `  if (!isAdminAuthenticated) {
    if (isCheckingAuth) {
      return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center relative overflow-hidden">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="w-16 h-16 border-4 border-zinc-800 border-t-yellow-500 rounded-full" />
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-8 text-xs font-black text-yellow-500 uppercase tracking-[0.2em]">Authenticating Core...</motion.div>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 md:p-6 relative overflow-hidden">`;

code = code.replace(oldIfAdminAuth, newIfAdminAuth);

fs.writeFileSync('src/screens/AdminDashboard.tsx', code);

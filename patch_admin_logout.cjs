const fs = require('fs');
let code = fs.readFileSync('src/screens/AdminDashboard.tsx', 'utf8');

code = code.replace(
  /setIsAdminAuthenticated\(false\);\s*setCurrentAdminRole\(null\);\s*toast\.success\('Logged out from Admin Dashboard'\);/g,
  `setIsAdminAuthenticated(false);
               setCurrentAdminRole(null);
               localStorage.removeItem('admin_access_key');
               toast.success('Logged out from Admin Dashboard');`
);

fs.writeFileSync('src/screens/AdminDashboard.tsx', code);

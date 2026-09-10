const fs = require('fs');
let content = fs.readFileSync('src/screens/AdminDashboard.tsx', 'utf-8');

content = content.replace("toast.error('Failed to kick player');", "console.error(err); toast.error('Failed to kick player: ' + err.message);");
fs.writeFileSync('src/screens/AdminDashboard.tsx', content);

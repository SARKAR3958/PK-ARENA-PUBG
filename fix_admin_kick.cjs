const fs = require('fs');
let content = fs.readFileSync('src/screens/AdminDashboard.tsx', 'utf-8');

const oldKick = `  const handleKickPlayer = async (player: any) => {
      if (!window.confirm(\`Are you sure you want to kick \${player.username}?\`)) return;
      try {`;

const newKick = `  const handleKickPlayer = async (player: any) => {
      // Direct kick without window.confirm due to iframe limitations
      try {`;

content = content.replace(oldKick, newKick);
fs.writeFileSync('src/screens/AdminDashboard.tsx', content);

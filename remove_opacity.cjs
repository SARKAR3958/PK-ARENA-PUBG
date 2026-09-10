const fs = require('fs');
let code = fs.readFileSync('src/screens/AdminDashboard.tsx', 'utf-8');
const regex = /\s*\{\/\*\s*Opacity Control\s*\*\/\}\s*<div>[\s\S]*?<\/div>\s*\{\/\*\s*Shape Control\s*\*\/\}/;
code = code.replace(regex, '\n                       {/* Shape Control */}');
fs.writeFileSync('src/screens/AdminDashboard.tsx', code);

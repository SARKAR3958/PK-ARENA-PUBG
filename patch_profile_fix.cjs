const fs = require('fs');
let code = fs.readFileSync('src/screens/Profile.tsx', 'utf8');

code = code.replace(
  /navigator\.clipboard\.writeText\('\$\{currentUser\?\.referralCode \|\| 'PKARENA25'\}'\);/,
  `navigator.clipboard.writeText(currentUser?.referralCode || 'PKARENA25');`
);

fs.writeFileSync('src/screens/Profile.tsx', code);

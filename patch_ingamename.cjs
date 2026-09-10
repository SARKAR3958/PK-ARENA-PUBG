const fs = require('fs');
let code = fs.readFileSync('src/context/AppContext.tsx', 'utf8');

code = code.replace(
  /joinedAt: new Date\(\)\.toISOString\(\),/g,
  `joinedAt: new Date().toISOString(),\n        inGameName: currentUser.inGameName,`
);

fs.writeFileSync('src/context/AppContext.tsx', code);

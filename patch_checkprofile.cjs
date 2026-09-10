const fs = require('fs');
let code = fs.readFileSync('src/context/AppContext.tsx', 'utf8');

code = code.replace(
  /return !!\(user && user\.inGameName && user\.gameUid && user\.phone\);/,
  `return !!(user && user.inGameName && user.gameUid && (user.phone || (user as any).phoneNumber));`
);

fs.writeFileSync('src/context/AppContext.tsx', code);

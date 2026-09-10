const fs = require('fs');
let code = fs.readFileSync('src/screens/Home.tsx', 'utf8');

code = code.replace(
  /username: user\?\.username \|\| 'Unknown',/g,
  `username: user?.username || 'Unknown',
                            inGameName: user?.inGameName || 'No Name',`
);

fs.writeFileSync('src/screens/Home.tsx', code);

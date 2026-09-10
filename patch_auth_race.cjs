const fs = require('fs');
let code = fs.readFileSync('src/context/AppContext.tsx', 'utf8');

code = code.replace(
  /\} else if \(!userSnapshot\.exists\(\)\) \{[\s\S]*?set\(userRef, newUser\);\s*\}/,
  `}`
);

fs.writeFileSync('src/context/AppContext.tsx', code);

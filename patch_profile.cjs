const fs = require('fs');
let code = fs.readFileSync('src/screens/Profile.tsx', 'utf8');

code = code.replace(
  /PK_685590/g,
  `\${currentUser?.referralCode || 'PKARENA25'}`
);

code = code.replace(
  /<span className="text-lg font-bold flex-1 text-center font-mono tracking-widest text-white">PKARENA25<\/span>/g,
  `<span className="text-lg font-bold flex-1 text-center font-mono tracking-widest text-white">{currentUser?.referralCode || 'PKARENA25'}</span>`
);

fs.writeFileSync('src/screens/Profile.tsx', code);

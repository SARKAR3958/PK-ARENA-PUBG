const fs = require('fs');
let content = fs.readFileSync('src/context/AppContext.tsx', 'utf8');

if (!content.includes('playErrorSound')) {
  content = content.replace(
    "import { auth, db } from '../lib/firebase';",
    "import { auth, db } from '../lib/firebase';\nimport { playErrorSound } from '../lib/sound';"
  );
}

content = content.replace(/toast\.error\(/g, "playErrorSound(); toast.error(");

fs.writeFileSync('src/context/AppContext.tsx', content);
console.log('patched context errors');

const fs = require('fs');
let content = fs.readFileSync('src/screens/Wallet.tsx', 'utf8');

// Add playErrorSound and playDepositSuccessSound imports
if (!content.includes('playErrorSound')) {
  content = content.replace(
    "import { useApp } from '../context/AppContext';",
    "import { useApp } from '../context/AppContext';\nimport { playErrorSound, playDepositSuccessSound } from '../lib/sound';"
  );
}

// Replace toast.error with playErrorSound + toast.error
content = content.replace(/toast\.error\(/g, "playErrorSound(); toast.error(");

// Note: Ensure the toast.success on deposit doesn't have playDepositSuccessSound inside it already, 
// wait, the deposit sound is only required when "depoist request success me jo sounds ata hai wo add kru" -> he meant play that sound on TOURNAMENT JOIN success.
// I already added playDepositSuccessSound on tournament join.
// Let's verify we replaced the toast errors.

fs.writeFileSync('src/screens/Wallet.tsx', content);
console.log('patched wallet errors');

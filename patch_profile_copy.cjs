const fs = require('fs');
let code = fs.readFileSync('src/screens/Profile.tsx', 'utf8');

code = code.replace(
  /const copyCode = \(\) => \{\s*navigator\.clipboard\.writeText\('PKARENA25'\);\s*toast\.success\('Referral code copied!'\);\s*\};/g,
  `const copyCode = () => {
    navigator.clipboard.writeText(currentUser?.referralCode || 'PKARENA25');
    toast.success('Referral code copied!');
  };`
);

fs.writeFileSync('src/screens/Profile.tsx', code);

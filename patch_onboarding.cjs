const fs = require('fs');
let code = fs.readFileSync('src/components/OnboardingModal.tsx', 'utf8');

code = code.replace(
  /\/\/ 1\. Update Firebase\s*await update\(ref\(db, \`users\/\$\{currentUser\.uid\}\`\), profileData\);\s*\/\/ 2\. Update Context\s*await updateUserProfile\(profileData\);/,
  `// 1. Update Firebase & Context via updateUserProfile\n      await updateUserProfile(profileData);`
);

fs.writeFileSync('src/components/OnboardingModal.tsx', code);

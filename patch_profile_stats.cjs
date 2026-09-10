const fs = require('fs');
let code = fs.readFileSync('src/screens/Profile.tsx', 'utf8');

code = code.replace(
  /\{referralStats\.invited\}/g,
  `{currentUser?.referralsCount || 0}`
);

code = code.replace(
  /\{referralStats\.earned\}/g,
  `{currentUser?.referralsEarned || 0}`
);

fs.writeFileSync('src/screens/Profile.tsx', code);

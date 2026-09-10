const fs = require('fs');
let code = fs.readFileSync('src/types.ts', 'utf8');

code = code.replace(
  /tournamentsPlayed\?: number;/,
  `tournamentsPlayed?: number;\n  referralCode?: string;\n  referredBy?: string;\n  referralsCount?: number;\n  referralsEarned?: number;`
);

fs.writeFileSync('src/types.ts', code);

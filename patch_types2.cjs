const fs = require('fs');
let code = fs.readFileSync('src/types.ts', 'utf8');

code = code.replace(
  /referralsEarned\?: number;/,
  `referralsEarned?: number;\n  referralActivity?: Record<string, { user: string, status: string, reward: number, date: string }>;`
);

fs.writeFileSync('src/types.ts', code);

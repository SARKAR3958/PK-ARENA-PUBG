const fs = require('fs');
let code = fs.readFileSync('src/screens/AdminDashboard.tsx', 'utf8');

code = code.replace(
  /const \[matchRulesText, setMatchRulesText\] = useState\(''\);/g,
  `const [matchRulesText, setMatchRulesText] = useState('Emulators are strictly prohibited. Using them will result in a ban without refund.\\nTeam up in solo matches is not allowed. All players involved will be disqualified.\\nEnsure your in-game name matches exactly with your profile name.');`
);

code = code.replace(
  /setMatchRulesText\(t\.rules \|\| ''\);/g,
  `setMatchRulesText(t.rules || 'Emulators are strictly prohibited. Using them will result in a ban without refund.\\nTeam up in solo matches is not allowed. All players involved will be disqualified.\\nEnsure your in-game name matches exactly with your profile name.');`
);

fs.writeFileSync('src/screens/AdminDashboard.tsx', code);

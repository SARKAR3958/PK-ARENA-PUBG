const fs = require('fs');
let content = fs.readFileSync('src/screens/Home.tsx', 'utf-8');

content = content.replace("{showRulesModal.roomId || 'WAITING...'}", "{ (tournaments.find(t => t.id === showRulesModal.tournamentId) || showRulesModal).roomId || 'WAITING...' }");
content = content.replace("{showRulesModal.roomPass || 'WAITING...'}", "{ (tournaments.find(t => t.id === showRulesModal.tournamentId) || showRulesModal).password || 'WAITING...' }");

fs.writeFileSync('src/screens/Home.tsx', content);

const fs = require('fs');
let code = fs.readFileSync('src/screens/Home.tsx', 'utf8');

code = code.replace(
  /const players = \[\];\s*for \(const uid in matchesData\) \{\s*for \(const mid in matchesData\[uid\]\) \{\s*if \(matchesData\[uid\]\[mid\]\.tournamentId === viewingPlayersTournament\.id\) \{\s*players\.push\(matchesData\[uid\]\[mid\]\);\s*\}\s*\}\s*\}/g,
  `const players = [];
           const usersSnap = await get(ref(db, 'users'));
           const allUsers = usersSnap.val() || {};
           for (const uid in matchesData) {
             for (const mid in matchesData[uid]) {
                if (matchesData[uid][mid].tournamentId === viewingPlayersTournament.id) {
                   const playerObj = matchesData[uid][mid];
                   playerObj.inGameName = playerObj.inGameName || allUsers[uid]?.inGameName || 'No Name';
                   players.push(playerObj);
                }
             }
           }`
);

fs.writeFileSync('src/screens/Home.tsx', code);

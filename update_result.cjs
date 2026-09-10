const fs = require('fs');
let content = fs.readFileSync('src/screens/AdminDashboard.tsx', 'utf-8');

// Update resultData state
content = content.replace("const [resultData, setResultData] = useState({ kills: 0, rank: 1 });", "const [resultData, setResultData] = useState({ kills: 0, rank: 1, winnings: 0 });");

// Update handleAddPlayerResult
const oldHandler = `              const killPrize = (match.perKill || 0) * resultData.kills;
              const totalPrize = killPrize; // You can add rank logic here if needed
              
              const updates: any = {};
              updates[\`users/\${player.uid}/walletBalance\`] = (userData.walletBalance || 0) + totalPrize;
              updates[\`users/\${player.uid}/totalKills\`] = (userData.totalKills || 0) + resultData.kills;
              if (resultData.rank === 1) {
                  updates[\`users/\${player.uid}/totalWins\`] = (userData.totalWins || 0) + 1;
              }
              updates[\`users/\${player.uid}/totalEarnings\`] = (userData.totalEarnings || 0) + totalPrize;

              updates[\`userMatches/\${player.uid}/\${player.id}/rank\`] = resultData.rank;
              updates[\`userMatches/\${player.uid}/\${player.id}/kills\`] = resultData.kills;
              updates[\`userMatches/\${player.uid}/\${player.id}/reward\`] = totalPrize;
              updates[\`userMatches/\${player.uid}/\${player.id}/status\`] = 'COMPLETED';

              if (totalPrize > 0) {
                 const txRef = push(ref(db, 'transactions'));
                 updates[\`transactions/\${txRef.key}\`] = {
                     id: txRef.key,
                     userId: player.uid,
                     username: player.username,
                     amount: totalPrize,
                     type: 'winning',
                     status: 'completed',
                     createdAt: new Date().toISOString()
                 };
              }`;

const newHandler = `              const killPrize = (match.perKill || 0) * resultData.kills;
              const totalPrize = killPrize + (resultData.winnings || 0); // Include winnings input
              
              const updates: any = {};
              updates[\`users/\${player.uid}/walletBalance\`] = (userData.walletBalance || 0) + totalPrize;
              updates[\`users/\${player.uid}/totalKills\`] = (userData.totalKills || 0) + resultData.kills;
              if (resultData.rank === 1) {
                  updates[\`users/\${player.uid}/totalWins\`] = (userData.totalWins || 0) + 1;
              }
              updates[\`users/\${player.uid}/totalEarnings\`] = (userData.totalEarnings || 0) + totalPrize;

              updates[\`userMatches/\${player.uid}/\${player.id}/rank\`] = resultData.rank;
              updates[\`userMatches/\${player.uid}/\${player.id}/kills\`] = resultData.kills;
              updates[\`userMatches/\${player.uid}/\${player.id}/reward\`] = totalPrize;
              updates[\`userMatches/\${player.uid}/\${player.id}/winnings\`] = resultData.winnings || 0;
              updates[\`userMatches/\${player.uid}/\${player.id}/status\`] = 'COMPLETED';

              if (totalPrize > 0) {
                 const txRef = push(ref(db, 'transactions'));
                 updates[\`transactions/\${txRef.key}\`] = {
                     id: txRef.key,
                     userId: player.uid,
                     username: player.username || 'User',
                     amount: totalPrize,
                     type: 'match_win',
                     status: 'completed',
                     date: new Date().toISOString(), // Using 'date' as per Transaction interface
                     details: \`Match winnings (\${resultData.kills} kills, rank \${resultData.rank})\`
                 };
              }`;

content = content.replace(oldHandler, newHandler);
fs.writeFileSync('src/screens/AdminDashboard.tsx', content);

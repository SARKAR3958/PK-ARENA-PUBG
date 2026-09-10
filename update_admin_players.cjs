const fs = require('fs');
let content = fs.readFileSync('src/screens/AdminDashboard.tsx', 'utf-8');

const oldViewPlayers = `  const handleViewPlayers = async (matchId: string) => {
      setSelectedMatchId(matchId);
      setIsPlayersModalOpen(true);
      const usersRef = ref(db, 'userMatches');
      const snapshot = await get(usersRef);
      const allUserMatches = snapshot.val();
      const players = [];
      if (allUserMatches) {
          for (const uid in allUserMatches) {
             for (const mid in allUserMatches[uid]) {
                if (allUserMatches[uid][mid].tournamentId === matchId) {
                   const user = users.find(u => u.uid === uid);
                   players.push({
                      ...allUserMatches[uid][mid],
                      username: user?.username || 'Unknown',
                      inGameName: user?.inGameName || 'Unknown',
                      gameUid: user?.gameUid || 'Unknown'
                   });
                }
             }
          }
      }
      setMatchPlayers(players.sort((a, b) => a.slot - b.slot));
  };`;

const newViewPlayers = `  const handleViewPlayers = async (matchId: string) => {
      setSelectedMatchId(matchId);
      setIsPlayersModalOpen(true);
      const usersRef = ref(db, 'userMatches');
      const snapshot = await get(usersRef);
      const allUserMatches = snapshot.val();
      const players = [];
      if (allUserMatches) {
          for (const uid in allUserMatches) {
             for (const mid in allUserMatches[uid]) {
                if (allUserMatches[uid][mid].tournamentId === matchId) {
                   const user = users.find(u => u.uid === uid);
                   players.push({
                      ...allUserMatches[uid][mid],
                      uid: uid,
                      username: user?.username || 'Unknown',
                      inGameName: user?.inGameName || 'Unknown',
                      gameUid: user?.gameUid || 'Unknown',
                      phone: user?.phone || 'N/A',
                      profilePic: user?.profilePic || 'https://ui-avatars.com/api/?name=' + (user?.username || 'U')
                   });
                }
             }
          }
      }
      setMatchPlayers(players.sort((a, b) => a.slot - b.slot));
  };

  const handleKickPlayer = async (player: any) => {
      if (!window.confirm(\`Are you sure you want to kick \${player.username}?\`)) return;
      try {
          const match = tournaments.find(t => t.id === selectedMatchId);
          if (!match) return toast.error('Match not found');

          const userRef = ref(db, \`users/\${player.uid}\`);
          const userSnap = await get(userRef);
          const userData = userSnap.val();
          
          if (userData) {
              const newBalance = (userData.walletBalance || 0) + (match.entryFee || 0);
              const updates: any = {};
              updates[\`users/\${player.uid}/walletBalance\`] = newBalance;
              updates[\`userMatches/\${player.uid}/\${player.id}\`] = null; // Delete match from user's list
              updates[\`tournaments/\${selectedMatchId}/spotsFilled\`] = Math.max((match.spotsFilled || 1) - 1, 0);

              // Create refund transaction
              const txRef = push(ref(db, 'transactions'));
              updates[\`transactions/\${txRef.key}\`] = {
                  id: txRef.key,
                  userId: player.uid,
                  username: player.username,
                  amount: match.entryFee,
                  type: 'refund',
                  status: 'completed',
                  createdAt: new Date().toISOString()
              };

              await update(ref(db), updates);
              toast.success('Player kicked and refunded');
              handleViewPlayers(selectedMatchId); // Refresh list
          }
      } catch (err) {
          toast.error('Failed to kick player');
      }
  };

  const [resultData, setResultData] = useState({ kills: 0, rank: 1 });
  const [resultPlayerId, setResultPlayerId] = useState('');
  
  const handleAddPlayerResult = async (player: any) => {
      try {
          const match = tournaments.find(t => t.id === selectedMatchId);
          if (!match) return toast.error('Match not found');

          const userRef = ref(db, \`users/\${player.uid}\`);
          const userSnap = await get(userRef);
          const userData = userSnap.val();
          
          if (userData) {
              const killPrize = (match.perKill || 0) * resultData.kills;
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
              }

              await update(ref(db), updates);
              toast.success('Result added successfully!');
              setResultPlayerId('');
              handleViewPlayers(selectedMatchId);
          }
      } catch (err) {
          toast.error('Failed to add result');
      }
  };
`;

content = content.replace(oldViewPlayers, newViewPlayers);
fs.writeFileSync('src/screens/AdminDashboard.tsx', content);

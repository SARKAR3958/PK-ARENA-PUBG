const fs = require('fs');
let code = fs.readFileSync('src/context/AppContext.tsx', 'utf8');

const oldCode = `              updates[\`users/\${referrerId}/referralsCount\`] = (referrerData.referralsCount || 0) + 1;
              updates[\`users/\${referrerId}/referralsEarned\`] = (referrerData.referralsEarned || 0) + referrerBonus;
              
              const newRefId = push(ref(db, 'dummy')).key;
              updates[\`users/\${referrerId}/referralActivity/\${newRefId}\`] = {
                user: currentUser.username,
                status: 'PAID',
                reward: referrerBonus,
                date: new Date().toLocaleDateString('en-GB')
              };`;

const newCode = `              updates[\`users/\${referrerId}/referralsCount\`] = (referrerData.referralsCount || 0) + 1;
              updates[\`users/\${referrerId}/referralsEarned\`] = (referrerData.referralsEarned || 0) + referrerBonus;
              
              let refActivityIdToUpdate = push(ref(db, 'dummy')).key;
              if (referrerData.referralActivity) {
                for (const actId in referrerData.referralActivity) {
                  if (referrerData.referralActivity[actId].user === currentUser.username) {
                    refActivityIdToUpdate = actId;
                    break;
                  }
                }
              }
              updates[\`users/\${referrerId}/referralActivity/\${refActivityIdToUpdate}\`] = {
                user: currentUser.username,
                status: 'PAID',
                reward: referrerBonus,
                date: new Date().toLocaleDateString('en-GB')
              };`;

code = code.replace(oldCode, newCode);
fs.writeFileSync('src/context/AppContext.tsx', code);

const fs = require('fs');
let code = fs.readFileSync('src/context/AppContext.tsx', 'utf8');

// We need to fix the joinMatch logic to update referral activity.
code = code.replace(
  /updates\[\`users\/\$\{referrerId\}\/referralsEarned\`\] = \(referrerData\.referralsEarned \|\| 0\) \+ referrerBonus;/g,
  `updates[\`users/\${referrerId}/referralsEarned\`] = (referrerData.referralsEarned || 0) + referrerBonus;
              
              const newRefId = push(ref(db, 'dummy')).key;
              updates[\`users/\${referrerId}/referralActivity/\${newRefId}\`] = {
                user: currentUser.username,
                status: 'PAID',
                reward: referrerBonus,
                date: new Date().toLocaleDateString('en-GB')
              };`
);

// We need to fix registerManual to add PENDING referral activity if referredBy exists
code = code.replace(
  /await set\(ref\(db, \`users\/\$\{res\.user\.uid\}\`\), newUser\);/g,
  `const updates: any = {};
      updates[\`users/\${res.user.uid}\`] = newUser;
      
      if (data.referredBy) {
        try {
          const usersRef = ref(db, 'users');
          const usersSnap = await get(usersRef);
          if (usersSnap.exists()) {
            const allUsers = usersSnap.val();
            for (const uid in allUsers) {
              if (allUsers[uid].referralCode === data.referredBy) {
                const newRefId = push(ref(db, 'dummy')).key;
                updates[\`users/\${uid}/referralActivity/\${newRefId}\`] = {
                  user: newUser.username,
                  status: 'PENDING',
                  reward: 0,
                  date: new Date().toLocaleDateString('en-GB')
                };
                break;
              }
            }
          }
        } catch(e) {
          console.error("Register referral tracking error", e);
        }
      }
      
      await update(ref(db), updates);`
);

fs.writeFileSync('src/context/AppContext.tsx', code);

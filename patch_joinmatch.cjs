const fs = require('fs');
let code = fs.readFileSync('src/context/AppContext.tsx', 'utf8');

code = code.replace(
  /updates\[\`tournaments\/\$\{tournament\.id\}\/spotsFilled\`\] = \(tournament\.spotsFilled \|\| 0\) \+ 1;/g,
  `updates[\`tournaments/\${tournament.id}/spotsFilled\`] = (tournament.spotsFilled || 0) + 1;

      // Handle Referral Reward on first match
      if ((currentUser.totalMatches || 0) === 0 && currentUser.referredBy && tournament.entryFee > 0) {
        try {
          const usersRef = ref(db, 'users');
          const usersSnap = await get(usersRef);
          if (usersSnap.exists()) {
            const allUsers = usersSnap.val();
            let referrerId = null;
            let referrerData = null;
            for (const uid in allUsers) {
              if (allUsers[uid].referralCode === currentUser.referredBy) {
                referrerId = uid;
                referrerData = allUsers[uid];
                break;
              }
            }

            if (referrerId && referrerData) {
              const settingsSnap = await get(ref(db, 'appSettings'));
              const settings = settingsSnap.val() || {};
              const referrerBonus = settings.referrerBonus || 50;
              const refereeBonus = settings.refereeBonus || 25;

              updates[\`users/\${referrerId}/walletBalance\`] = (referrerData.walletBalance || 0) + referrerBonus;
              updates[\`users/\${auth.currentUser.uid}/walletBalance\`] = currentUser.walletBalance - tournament.entryFee + refereeBonus;
              
              // Increment referral stats
              updates[\`users/\${referrerId}/referralsCount\`] = (referrerData.referralsCount || 0) + 1;
              updates[\`users/\${referrerId}/referralsEarned\`] = (referrerData.referralsEarned || 0) + referrerBonus;

              toast.success(\`Referral bonus applied! You got \${refereeBonus} coins.\`);
            }
          }
        } catch (e) {
          console.error("Referral bonus error", e);
        }
      }`
);

fs.writeFileSync('src/context/AppContext.tsx', code);

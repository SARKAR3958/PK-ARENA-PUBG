const fs = require('fs');
let code = fs.readFileSync('src/context/AppContext.tsx', 'utf8');

code = code.replace(
  /await update\(userRef, data\);/,
  `const updates: any = {};
      updates[\`users/\${auth.currentUser.uid}\`] = data;
      
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
                  user: currentUser?.username || 'Gamer',
                  status: 'PENDING',
                  reward: 0,
                  date: new Date().toLocaleDateString('en-GB')
                };
                break;
              }
            }
          }
        } catch(e) {
          console.error("Update profile referral tracking error", e);
        }
      }
      
      await update(ref(db), updates);`
);

fs.writeFileSync('src/context/AppContext.tsx', code);

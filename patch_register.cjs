const fs = require('fs');
let code = fs.readFileSync('src/context/AppContext.tsx', 'utf8');

const oldRegister = `    try {
      // 1. Dynamic Duplicate Checks for username, phone, gameUid to prevent multiple accounts
      const usersRef = ref(db, 'users');
      const snapshot = await get(usersRef);
      if (snapshot.exists()) {
        const users = snapshot.val();
        const cleanUsername = data.username?.trim().toLowerCase();
        const cleanPhone = data.phone?.trim();
        const cleanGameUid = data.gameUid?.trim();

        for (const uid in users) {
          if (cleanUsername && users[uid].username && users[uid].username.toLowerCase() === cleanUsername) {
            throw new Error('This username is already taken. Please choose another.');
          }
          if (cleanPhone && users[uid].phone && users[uid].phone === cleanPhone) {
            throw new Error('This phone number is already registered. Multiple accounts are not allowed.');
          }
          if (cleanGameUid && users[uid].gameUid && users[uid].gameUid === cleanGameUid) {
            throw new Error('This Game UID is already registered to another account.');
          }
        }
      }`;

const newRegister = `    try {
      // 1. Dynamic Duplicate Checks for username, phone, gameUid to prevent multiple accounts
      const usersRef = ref(db, 'users');
      
      if (data.username) {
        const qUser = query(usersRef, orderByChild('username'), equalTo(data.username.trim()));
        const snapUser = await get(qUser);
        if (snapUser.exists()) throw new Error('This username is already taken. Please choose another.');
      }
      
      if (data.phone) {
        const qPhone = query(usersRef, orderByChild('phone'), equalTo(data.phone.trim()));
        const snapPhone = await get(qPhone);
        if (snapPhone.exists()) throw new Error('This phone number is already registered. Multiple accounts are not allowed.');
      }
      
      if (data.gameUid) {
        const qUid = query(usersRef, orderByChild('gameUid'), equalTo(data.gameUid.trim()));
        const snapUid = await get(qUid);
        if (snapUid.exists()) throw new Error('This Game UID is already registered to another account.');
      }`;

code = code.replace(oldRegister, newRegister);

// also fix the referral check in registerManual
const oldRefCheck = `      if (data.referredBy) {
        try {
          if (snapshot.exists()) {
            const allUsers = snapshot.val();
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
      }`;

const newRefCheck = `      if (data.referredBy) {
        try {
          const qRef = query(usersRef, orderByChild('referralCode'), equalTo(data.referredBy));
          const snapRef = await get(qRef);
          if (snapRef.exists()) {
            snapRef.forEach((childSnap) => {
              const uid = childSnap.key;
              const newRefId = push(ref(db, 'dummy')).key;
              updates[\`users/\${uid}/referralActivity/\${newRefId}\`] = {
                user: newUser.username,
                status: 'PENDING',
                reward: 0,
                date: new Date().toLocaleDateString('en-GB')
              };
            });
          }
        } catch(e) {
          console.error("Register referral tracking error", e);
        }
      }`;
code = code.replace(oldRefCheck, newRefCheck);

fs.writeFileSync('src/context/AppContext.tsx', code);
console.log('patched register');

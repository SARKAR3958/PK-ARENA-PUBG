const fs = require('fs');
let code = fs.readFileSync('src/context/AppContext.tsx', 'utf8');

const oldLogin = `      const usersRef = ref(db, 'users');
      const snapshot = await get(usersRef);
      let foundEmail = '';
      
      if (snapshot.exists()) {
        const users = snapshot.val();
        for (const uid in users) {
          if (users[uid].username && users[uid].username.toLowerCase() === target.toLowerCase()) {
            foundEmail = users[uid].email;
            break;
          }
        }
      }`;

const newLogin = `      let foundEmail = '';
      const qUser = query(ref(db, 'users'), orderByChild('username'), equalTo(target));
      const snapUser = await get(qUser);
      if (snapUser.exists()) {
        snapUser.forEach(child => {
          foundEmail = child.val().email;
        });
      }`;

code = code.replace(oldLogin, newLogin);

const oldJoin1 = `      const usersRef = ref(db, 'users');
      const usersSnap = await get(usersRef);

      if (usersSnap.exists()) {
        const allUsers = usersSnap.val();
        for (const uid in allUsers) {
          if (uid !== currentUser.uid) {
            const u = allUsers[uid];
            if (u.gameUid && u.gameUid === currentUser.gameUid) {
              throw new Error('This Game UID is already registered to another user.');
            }
            if (u.phone && u.phone === currentUser.phone) {
               throw new Error('This Phone Number is already registered to another user.');
            }
          }
        }
      }`;

const newJoin1 = `      const qUid = query(ref(db, 'users'), orderByChild('gameUid'), equalTo(currentUser.gameUid));
      const snapUid = await get(qUid);
      if (snapUid.exists()) {
        snapUid.forEach(child => {
          if (child.key !== currentUser.uid) throw new Error('This Game UID is already registered to another user.');
        });
      }
      
      if (currentUser.phone) {
        const qPhone = query(ref(db, 'users'), orderByChild('phone'), equalTo(currentUser.phone));
        const snapPhone = await get(qPhone);
        if (snapPhone.exists()) {
          snapPhone.forEach(child => {
            if (child.key !== currentUser.uid) throw new Error('This Phone Number is already registered to another user.');
          });
        }
      }`;
code = code.replace(oldJoin1, newJoin1);


const oldJoin2 = `          const usersRef = ref(db, 'users');
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
            }`;

const newJoin2 = `          const qRef = query(ref(db, 'users'), orderByChild('referralCode'), equalTo(currentUser.referredBy));
          const snapRef = await get(qRef);
          if (snapRef.exists()) {
            let referrerId = null;
            let referrerData = null;
            snapRef.forEach(child => {
              referrerId = child.key;
              referrerData = child.val();
            });`;

code = code.replace(oldJoin2, newJoin2);


const oldTxRefCheck = `          const usersRef = ref(db, 'users');
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
            }`;

const newTxRefCheck = `          const qRef = query(ref(db, 'users'), orderByChild('referralCode'), equalTo(currentUser.referredBy));
          const snapRef = await get(qRef);
          if (snapRef.exists()) {
            let referrerId = null;
            let referrerData = null;
            snapRef.forEach(child => {
              referrerId = child.key;
              referrerData = child.val();
            });`;

code = code.replace(oldTxRefCheck, newTxRefCheck);


fs.writeFileSync('src/context/AppContext.tsx', code);
console.log('patched other queries');

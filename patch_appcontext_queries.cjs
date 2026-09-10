const fs = require('fs');
let code = fs.readFileSync('src/context/AppContext.tsx', 'utf8');

// Add equalTo to imports
if (!code.includes('equalTo')) {
  code = code.replace("import { ref, onValue, set, get, update, push, child, query, orderByChild, limitToLast }", "import { ref, onValue, set, get, update, push, child, query, orderByChild, limitToLast, equalTo }");
}

// 1. checkUsernameExists
code = code.replace(
`  const checkUsernameExists = useCallback(async (username: string, excludeUserId?: string) => {
    try {
      const cleanUsername = username.trim().toLowerCase();
      const usersRef = ref(db, 'users');
      const snapshot = await get(usersRef);
      
      if (snapshot.exists()) {
        const users = snapshot.val();
        for (const uid in users) {
          if (excludeUserId && uid === excludeUserId) continue;
          if (users[uid].username && users[uid].username.toLowerCase() === cleanUsername) {
            return true;
          }
        }
      }
      return false;
    } catch (err) {
      console.error('Error checking username exists:', err);
      return false;
    }
  }, []);`,
`  const checkUsernameExists = useCallback(async (username: string, excludeUserId?: string) => {
    try {
      const cleanUsername = username.trim();
      const usersRef = ref(db, 'users');
      const q = query(usersRef, orderByChild('username'), equalTo(cleanUsername));
      const snapshot = await get(q);
      
      if (snapshot.exists()) {
        if (!excludeUserId) return true;
        let found = false;
        snapshot.forEach((child) => {
          if (child.key !== excludeUserId) found = true;
        });
        return found;
      }
      return false;
    } catch (err) {
      console.error('Error checking username exists:', err);
      return false;
    }
  }, []);`
);

// Write back to check
fs.writeFileSync('src/context/AppContext.tsx', code);
console.log('Patched checkUsernameExists');

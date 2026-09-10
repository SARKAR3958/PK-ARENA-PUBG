const fs = require('fs');
let code = fs.readFileSync('src/context/AppContext.tsx', 'utf8');

code = code.replace(
  /const signInWithGoogle = async \(\) => \{\s*try \{\s*await signInWithPopup\(auth, googleProvider\);\s*toast\.success\('Signed in with Google!'\);\s*\} catch \(error: any\) \{\s*toast\.error\(error\.message\);\s*\}\s*\};/,
  `const signInWithGoogle = async () => {
    try {
      const res = await signInWithPopup(auth, googleProvider);
      const userRef = ref(db, \`users/\${res.user.uid}\`);
      const userSnap = await get(userRef);
      if (!userSnap.exists()) {
        const generatedCode = \`PK\${Math.floor(100000 + Math.random() * 900000)}\`;
        const newUser = {
          id: res.user.uid,
          uid: res.user.uid,
          username: res.user.displayName || 'Gamer',
          email: res.user.email || '',
          avatarUrl: 'https://i.ibb.co/WpFZDVf5/gaming-logo-1117469-9898.jpg',
          joinedDate: new Date().toLocaleDateString('en-GB'),
          walletBalance: 0,
          totalEarnings: 0,
          totalMatches: 0,
          totalWins: 0,
          winRate: 0,
          totalKills: 0,
          kdRatio: 0,
          referralCode: generatedCode
        };
        await set(userRef, newUser);
      }
      toast.success('Signed in with Google!');
    } catch (error: any) {
      toast.error(error.message);
    }
  };`
);

code = code.replace(
  /avatarUrl: 'https:\/\/api\.dicebear\.com\/7\.x\/avataaars\/svg\?seed=Felix',/,
  "avatarUrl: 'https://i.ibb.co/WpFZDVf5/gaming-logo-1117469-9898.jpg',\n        referralCode: `PK${Math.floor(100000 + Math.random() * 900000)}`,"
);

fs.writeFileSync('src/context/AppContext.tsx', code);

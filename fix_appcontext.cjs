const fs = require('fs');

let appContext = fs.readFileSync('src/context/AppContext.tsx', 'utf-8');
const oldAddTx = `const addTransaction = async (tx: any) => {
    if (!auth.currentUser) return;
    try {
      const txId = push(child(ref(db), 'userTransactions')).key;
      const txData = {
        ...tx,
        id: txId,
        userId: auth.currentUser.uid,
        username: currentUser?.username || 'Unknown',
        date: tx.date || new Date().toISOString(),
        createdAt: new Date().toISOString()
      };
      
      const updates: any = {};
      updates[\`userTransactions/\${auth.currentUser.uid}/\${txId}\`] = txData;
      updates[\`transactions/\${txId}\`] = txData;
      
      await update(ref(db), updates);
    } catch (error: any) {
      toast.error(error.message);
    }
  };`;

const newAddTx = `const addTransaction = async (tx: any) => {
    if (!auth.currentUser) return;
    try {
      const txId = push(child(ref(db), 'userTransactions')).key;
      const txData = {
        ...tx,
        id: txId,
        userId: auth.currentUser.uid,
        username: currentUser?.username || 'Unknown',
        email: currentUser?.email || 'N/A',
        phone: currentUser?.phone || 'N/A',
        date: tx.date || new Date().toISOString(),
        createdAt: new Date().toISOString()
      };
      
      const updates: any = {};
      updates[\`userTransactions/\${auth.currentUser.uid}/\${txId}\`] = txData;
      updates[\`transactions/\${txId}\`] = txData;
      
      await update(ref(db), updates);
    } catch (error: any) {
      toast.error(error.message);
    }
  };`;

appContext = appContext.replace(oldAddTx, newAddTx);
fs.writeFileSync('src/context/AppContext.tsx', appContext);

console.log('Fixed AppContext.tsx');

const fs = require('fs');

let wallet = fs.readFileSync('src/screens/Wallet.tsx', 'utf-8');

const oldDeposit = `const newTx = {
      m: paymentMethod === 'easypaisa' ? 'Easypaisa' : 'JazzCash',
      amount,
      coins: amount,
      status: 'PENDING',
      iconBg: paymentMethod === 'easypaisa' ? 'bg-[#009144]' : 'bg-[#ED1C24]',
      isWithdraw: false
    };
    await addTransaction(newTx);`;

const newDeposit = `const newTx = {
      amount: Number(amount),
      type: 'deposit',
      status: 'pending',
      method: paymentMethod === 'easypaisa' ? 'Easypaisa' : 'JazzCash',
      date: new Date().toISOString(),
      // old fields for backwards compatibility
      m: paymentMethod === 'easypaisa' ? 'Easypaisa' : 'JazzCash',
      coins: amount,
      iconBg: paymentMethod === 'easypaisa' ? 'bg-[#009144]' : 'bg-[#ED1C24]',
      isWithdraw: false
    };
    await addTransaction(newTx);`;

wallet = wallet.replace(oldDeposit, newDeposit);

const oldWithdraw = `const newTx = {
      m: paymentMethod === 'easypaisa' ? 'Easypaisa' : 'JazzCash',
      amount,
      coins: amount,
      status: 'PENDING',
      iconBg: paymentMethod === 'easypaisa' ? 'bg-[#009144]' : 'bg-[#ED1C24]',
      isWithdraw: true,
      accountTitle: withdrawTitle,
      accountNumber: withdrawNumber
    };
    await addTransaction(newTx);`;

const newWithdraw = `const newTx = {
      amount: Number(amount),
      type: 'withdrawal',
      status: 'pending',
      method: paymentMethod === 'easypaisa' ? 'Easypaisa' : 'JazzCash',
      details: \`Title: \${withdrawTitle} | Number: \${withdrawNumber}\`,
      phoneNumber: withdrawNumber,
      date: new Date().toISOString(),
      // old fields for backwards compatibility
      m: paymentMethod === 'easypaisa' ? 'Easypaisa' : 'JazzCash',
      coins: amount,
      iconBg: paymentMethod === 'easypaisa' ? 'bg-[#009144]' : 'bg-[#ED1C24]',
      isWithdraw: true,
      accountTitle: withdrawTitle,
      accountNumber: withdrawNumber
    };
    await addTransaction(newTx);`;

wallet = wallet.replace(oldWithdraw, newWithdraw);

fs.writeFileSync('src/screens/Wallet.tsx', wallet);

let appContext = fs.readFileSync('src/context/AppContext.tsx', 'utf-8');
const oldAddTx = `const addTransaction = async (tx: any) => {
    if (!auth.currentUser) return;
    try {
      const txId = push(child(ref(db), 'userTransactions')).key;
      await set(ref(db, \`userTransactions/\${auth.currentUser.uid}/\${txId}\`), {
        ...tx,
        id: txId,
        date: new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })
      });
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

console.log('Fixed Wallet and AppContext');

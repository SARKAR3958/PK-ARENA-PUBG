const fs = require('fs');

let content = fs.readFileSync('src/screens/AdminDashboard.tsx', 'utf-8');

const oldTransactionsTable = `<table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-zinc-500 border-b border-zinc-800">
                          <th className="pb-3 font-normal">USER ID</th>
                          <th className="pb-3 font-normal">TYPE</th>
                          <th className="pb-3 font-normal">AMOUNT</th>
                          <th className="pb-3 font-normal">METHOD</th>
                          <th className="pb-3 font-normal">DATE</th>
                          <th className="pb-3 font-normal">STATUS</th>
                        </tr>
                      </thead>
                      <tbody className="text-zinc-300">
                         {transactions.map((t, i) => (
                           <tr key={i} className="border-b border-zinc-800/50 hover:bg-zinc-800/20">
                             <td className="py-3 text-zinc-500">{t.userId?.substring(0, 8)}...</td>
                             <td className="py-3 uppercase font-bold text-[10px]">{t.type}</td>
                             <td className="py-3 text-yellow-500 font-bold">PKR {t.amount}</td>
                             <td className="py-3">{t.paymentMethod || 'N/A'}</td>
                             <td className="py-3 text-zinc-500">{new Date(t.createdAt).toLocaleString()}</td>
                             <td className="py-3"><span className="uppercase text-[10px] font-bold border border-zinc-700 px-2 py-0.5 rounded">{t.status}</span></td>
                           </tr>
                         ))}
                      </tbody>
                   </table>`;

const newTransactionsTable = `<div className="space-y-4">
                      {transactions.sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime()).map((t, i) => (
                        <div key={i} className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                           <div className="flex-1">
                             <div className="flex items-center space-x-3 mb-2">
                                <span className={\`px-2 py-1 rounded text-[9px] font-bold uppercase \${t.type === 'deposit' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : t.type === 'withdrawal' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'}\`}>
                                  {t.type}
                                </span>
                                <span className={\`px-2 py-1 rounded text-[9px] font-bold uppercase border \${t.status === 'completed' ? 'bg-green-500/10 text-green-500 border-green-500/20' : t.status === 'rejected' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'}\`}>
                                  {t.status}
                                </span>
                                <span className="text-[10px] text-zinc-500">{new Date(t.date || t.createdAt).toLocaleString()}</span>
                             </div>
                             
                             <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                               <div>
                                 <p className="text-[9px] text-zinc-500 uppercase font-bold mb-1">User Details</p>
                                 <p className="text-xs text-white font-bold">{t.username || 'Unknown'}</p>
                                 {t.phone && <p className="text-[10px] text-zinc-400">{t.phone}</p>}
                                 {t.email && <p className="text-[10px] text-zinc-400">{t.email}</p>}
                               </div>
                               <div>
                                 <p className="text-[9px] text-zinc-500 uppercase font-bold mb-1">Method / Details</p>
                                 <p className="text-xs text-white font-bold">{t.method || t.paymentMethod || 'N/A'}</p>
                                 {(t.details || t.phoneNumber) && <p className="text-[10px] text-zinc-400 line-clamp-2">{t.details || t.phoneNumber}</p>}
                               </div>
                               <div>
                                 <p className="text-[9px] text-zinc-500 uppercase font-bold mb-1">Amount</p>
                                 <p className="text-sm font-black text-yellow-500">PKR {t.amount}</p>
                               </div>
                               {t.screenshot && (
                                 <div>
                                   <p className="text-[9px] text-zinc-500 uppercase font-bold mb-1">Screenshot</p>
                                   <a href={t.screenshot} target="_blank" rel="noreferrer" className="inline-block text-[10px] bg-zinc-800 text-yellow-500 hover:bg-zinc-700 px-3 py-1.5 rounded font-bold transition-colors">
                                     View Image
                                   </a>
                                 </div>
                               )}
                             </div>
                           </div>
                           
                           {t.status === 'pending' && (
                             <div className="flex flex-row md:flex-col gap-2 shrink-0 border-t border-zinc-800 md:border-t-0 md:border-l pt-3 md:pt-0 md:pl-4">
                                <button onClick={() => handleApproveTransaction(t)} className="flex-1 bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-black border border-green-500/30 font-bold text-xs px-4 py-2 rounded-lg transition-colors uppercase">
                                  Approve
                                </button>
                                <button onClick={() => handleRejectTransaction(t)} className="flex-1 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-black border border-red-500/30 font-bold text-xs px-4 py-2 rounded-lg transition-colors uppercase">
                                  Reject
                                </button>
                             </div>
                           )}
                        </div>
                      ))}
                   </div>`;

content = content.replace(oldTransactionsTable, newTransactionsTable);

// We need to implement handleApproveTransaction and handleRejectTransaction
const rejectTxFunc = `  const handleRejectTransaction = async (t: Transaction) => {
    if (!window.confirm('Are you sure you want to reject this transaction?')) return;
    try {
      const updates: any = {};
      updates[\`transactions/\${t.id}/status\`] = 'rejected';
      updates[\`userTransactions/\${t.userId}/\${t.id}/status\`] = 'rejected';
      await update(ref(db), updates);
      toast.success('Transaction rejected');
    } catch (err) {
      toast.error('Failed to reject transaction');
    }
  };`;

const approveTxFuncOld = `  const handleApproveTransaction = async (t: Transaction) => {
    if (t.status !== 'pending') return;
    try {
      const updates: any = {};
      updates[\`transactions/\${t.id}/status\`] = 'completed';
      
      const userRef = ref(db, \`users/\${t.userId}\`);
      const userSnap = await get(userRef);
      const userData = userSnap.val();
      
      if (userData) {
          if (t.type === 'deposit') {
             updates[\`users/\${t.userId}/walletBalance\`] = (userData.walletBalance || 0) + t.amount;
             updates[\`users/\${t.userId}/totalDeposits\`] = (userData.totalDeposits || 0) + t.amount;
          } else if (t.type === 'withdrawal') {
             updates[\`users/\${t.userId}/walletBalance\`] = (userData.walletBalance || 0) - t.amount;
             updates[\`users/\${t.userId}/totalWithdrawals\`] = (userData.totalWithdrawals || 0) + t.amount;
          }
      }
      
      await update(ref(db), updates);
      toast.success('Transaction approved successfully');
    } catch (err) {
      toast.error('Failed to approve transaction');
    }
  };`;

const approveTxFuncNew = `  const handleApproveTransaction = async (t: Transaction) => {
    if (t.status !== 'pending') return;
    try {
      const updates: any = {};
      updates[\`transactions/\${t.id}/status\`] = 'completed';
      updates[\`userTransactions/\${t.userId}/\${t.id}/status\`] = 'completed';
      
      const userRef = ref(db, \`users/\${t.userId}\`);
      const userSnap = await get(userRef);
      const userData = userSnap.val();
      
      if (userData) {
          if (t.type === 'deposit') {
             updates[\`users/\${t.userId}/walletBalance\`] = (userData.walletBalance || 0) + t.amount;
             updates[\`users/\${t.userId}/totalDeposits\`] = (userData.totalDeposits || 0) + t.amount;
          } else if (t.type === 'withdrawal') {
             // For withdrawal, amount is already deducted when requested, or is it?
             // Actually, the app might not deduct it when requested. Let's assume it doesn't and deduct here.
             // Wait, looking at Wallet.tsx, handleWithdraw does NOT deduct balance directly, it just creates a transaction.
             // So we must deduct it on approval.
             updates[\`users/\${t.userId}/walletBalance\`] = (userData.walletBalance || 0) - t.amount;
             updates[\`users/\${t.userId}/totalWithdrawals\`] = (userData.totalWithdrawals || 0) + t.amount;
          }
      }
      
      await update(ref(db), updates);
      toast.success('Transaction approved successfully');
    } catch (err) {
      toast.error('Failed to approve transaction');
    }
  };`;

if (content.includes('const handleApproveTransaction = async')) {
    content = content.replace(approveTxFuncOld, approveTxFuncNew + '\\n\\n' + rejectTxFunc);
}

fs.writeFileSync('src/screens/AdminDashboard.tsx', content);

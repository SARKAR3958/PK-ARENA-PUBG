const fs = require('fs');
let content = fs.readFileSync('src/screens/AdminDashboard.tsx', 'utf-8');

const oldUI = `                             <div className="flex items-center space-x-3 mb-3">
                               <div className="flex flex-col flex-1">
                                 <label className="text-[9px] text-zinc-500 uppercase font-bold mb-1">Final Rank</label>
                                 <div className="relative">
                                   <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                                     <span className="text-zinc-500 text-xs font-bold">#</span>
                                   </div>
                                   <input type="number" min="1" value={resultData.rank} onChange={e => setResultData({...resultData, rank: Number(e.target.value)})} className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 pl-6 text-sm font-bold text-white focus:outline-none focus:border-yellow-500/50" />
                                 </div>
                               </div>
                               <div className="flex flex-col flex-1">
                                 <label className="text-[9px] text-zinc-500 uppercase font-bold mb-1">Total Kills</label>
                                 <input type="number" min="0" value={resultData.kills} onChange={e => setResultData({...resultData, kills: Number(e.target.value)})} className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-sm font-bold text-white focus:outline-none focus:border-yellow-500/50" />
                               </div>
                             </div>`;

const newUI = `                             <div className="flex items-center space-x-2 mb-3">
                               <div className="flex flex-col flex-1">
                                 <label className="text-[9px] text-zinc-500 uppercase font-bold mb-1">Rank</label>
                                 <div className="relative">
                                   <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                                     <span className="text-zinc-500 text-xs font-bold">#</span>
                                   </div>
                                   <input type="number" min="1" value={resultData.rank} onChange={e => setResultData({...resultData, rank: Number(e.target.value)})} className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 pl-6 text-xs font-bold text-white focus:outline-none focus:border-yellow-500/50" />
                                 </div>
                               </div>
                               <div className="flex flex-col flex-1">
                                 <label className="text-[9px] text-zinc-500 uppercase font-bold mb-1">Kills</label>
                                 <input type="number" min="0" value={resultData.kills} onChange={e => setResultData({...resultData, kills: Number(e.target.value)})} className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-xs font-bold text-white focus:outline-none focus:border-yellow-500/50" />
                               </div>
                               <div className="flex flex-col flex-1">
                                 <label className="text-[9px] text-zinc-500 uppercase font-bold mb-1">Winning (₹)</label>
                                 <input type="number" min="0" value={resultData.winnings || 0} onChange={e => setResultData({...resultData, winnings: Number(e.target.value)})} className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-xs font-bold text-white focus:outline-none focus:border-yellow-500/50" />
                               </div>
                             </div>`;

content = content.replace(oldUI, newUI);
// also set initial state in Add Result button
content = content.replace("setResultData({ rank: 1, kills: 0 });", "setResultData({ rank: 1, kills: 0, winnings: 0 });");

fs.writeFileSync('src/screens/AdminDashboard.tsx', content);

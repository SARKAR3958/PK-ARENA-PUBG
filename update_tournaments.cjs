const fs = require('fs');
const content = fs.readFileSync('src/screens/AdminDashboard.tsx', 'utf-8');

const startTag = ") : activeTab === 'tournaments' ? (";
const endTag = ") : activeTab === 'transactions' ? (";

const startIndex = content.indexOf(startTag);
const endIndex = content.indexOf(endTag);

if (startIndex === -1 || endIndex === -1) {
  console.log("Could not find start or end index");
  process.exit(1);
}

const replacement = `) : activeTab === 'tournaments' ? (
             <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
                <div className="flex justify-between items-center mb-6">
                   <h3 className="text-sm font-bold text-yellow-500 uppercase tracking-wider">Tournaments ({tournaments.length})</h3>
                   <button onClick={() => setIsCreateMatchModalOpen(true)} className="bg-yellow-500 text-black px-4 py-2 rounded-lg font-bold text-xs uppercase hover:bg-yellow-400 transition-colors">Create New</button>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {tournaments.map((t, i) => (
                     <div key={t.id || i} className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-lg relative group flex flex-col">
                        <div className="p-4 border-b border-zinc-800 bg-zinc-900/30 flex justify-between items-start">
                           <div>
                              <h4 className="font-bold text-white text-sm mb-1">{t.title}</h4>
                              <div className="flex items-center text-[10px] text-zinc-500 space-x-2">
                                 <span>#{t.id?.substring(0,8).toUpperCase()}</span>
                                 <span>•</span>
                                 <span>{t.date} {t.time}</span>
                              </div>
                           </div>
                           <span className="text-[10px] font-bold px-2 py-1 rounded bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">{t.status}</span>
                        </div>
                        <div className="p-4 grid grid-cols-2 gap-4 flex-1">
                           <div>
                              <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Entry Fee</div>
                              <div className="font-bold text-xs">{t.entryFee ? \`PKR \${t.entryFee}\` : 'FREE'}</div>
                           </div>
                           <div>
                              <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Prize Pool</div>
                              <div className="font-bold text-xs text-green-500">{t.prizePool ? \`PKR \${t.prizePool}\` : 'N/A'}</div>
                           </div>
                           <div>
                              <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Mode & Map</div>
                              <div className="font-bold text-xs">{t.type} {t.mode} • {t.map}</div>
                           </div>
                           <div>
                              <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Players</div>
                              <div className="font-bold text-xs">{t.spotsFilled || 0} / {t.spotsTotal}</div>
                           </div>
                        </div>
                        <div className="p-3 border-t border-zinc-800 bg-zinc-900/30 flex flex-wrap gap-2 justify-end">
                           <button onClick={() => handleViewPlayers(t.id)} className="px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/30 text-[10px] font-bold hover:bg-blue-500/20 transition-colors">Players</button>
                           <button onClick={() => { setSelectedMatchId(t.id); setRoomData({ roomId: t.roomId || '', password: t.password || '' }); setIsRoomModalOpen(true); }} className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 border border-zinc-700 text-[10px] font-bold hover:bg-zinc-700 transition-colors">Room Info</button>
                           <button onClick={() => { setEditingMatch(t); setIsEditMatchModalOpen(true); }} className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 border border-zinc-700 text-[10px] font-bold hover:bg-zinc-700 transition-colors">Edit</button>
                           <button onClick={() => handleDeleteMatch(t.id)} className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 text-[10px] font-bold hover:bg-red-500/20 transition-colors">Delete</button>
                        </div>
                     </div>
                  ))}
                </div>
             </div>
           `;

const newContent = content.substring(0, startIndex) + replacement + content.substring(endIndex);
fs.writeFileSync('src/screens/AdminDashboard.tsx', newContent);
console.log("Updated tournaments");

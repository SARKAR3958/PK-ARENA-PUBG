const fs = require('fs');
let content = fs.readFileSync('src/screens/AdminDashboard.tsx', 'utf-8');

const oldPlayerCard = `                             <div className="text-[10px] text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded uppercase tracking-wider">{player.phone}</div>
                          </div>
                          <div className="text-xs text-zinc-400 mt-1 font-mono">
                             IGN: <span className="text-white">{player.inGameName}</span> | UID: <span className="text-yellow-500">{player.gameUid}</span>
                          </div>
                        </div>
                     </div>
                     <div className="flex flex-col md:flex-row items-stretch md:items-center space-y-2 md:space-y-0 md:space-x-3 w-full md:w-auto">
                        {resultPlayerId === player.uid ? (
                           <div className="flex items-center space-x-2 bg-zinc-950 p-2 rounded-lg border border-zinc-800">
                             <div className="flex flex-col">
                               <label className="text-[9px] text-zinc-500 uppercase">Rank</label>
                               <input type="number" min="1" value={resultData.rank} onChange={e => setResultData({...resultData, rank: Number(e.target.value)})} className="w-16 bg-zinc-900 border border-zinc-800 rounded p-1.5 text-xs text-white" />
                             </div>
                             <div className="flex flex-col">
                               <label className="text-[9px] text-zinc-500 uppercase">Kills</label>
                               <input type="number" min="0" value={resultData.kills} onChange={e => setResultData({...resultData, kills: Number(e.target.value)})} className="w-16 bg-zinc-900 border border-zinc-800 rounded p-1.5 text-xs text-white" />
                             </div>
                             <div className="flex items-end">
                                <button onClick={() => handleAddPlayerResult(player)} className="bg-green-500 text-black px-3 py-1.5 rounded text-[10px] font-bold uppercase hover:bg-green-400">Save</button>
                                <button onClick={() => setResultPlayerId('')} className="ml-1 text-zinc-500 hover:text-white px-2 py-1.5"><X className="w-4 h-4" /></button>
                             </div>
                           </div>
                        ) : (
                          <>
                            {player.status === 'COMPLETED' ? (
                               <div className="px-3 py-1.5 bg-green-500/10 text-green-500 border border-green-500/20 rounded-lg text-xs font-bold">
                                 Rank {player.rank} • {player.kills} Kills
                               </div>
                            ) : (
                               <button onClick={() => { setResultPlayerId(player.uid); setResultData({ rank: 1, kills: 0 }); }} className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/30 px-4 py-2 rounded-lg font-bold text-xs uppercase hover:bg-yellow-500 hover:text-black transition-colors text-center">Add Result</button>
                            )}
                          </>
                        )}
                        <button onClick={() => handleKickPlayer(player)} className="bg-red-500/10 text-red-500 border border-red-500/30 px-4 py-2 rounded-lg font-bold text-xs uppercase hover:bg-red-500 hover:text-black transition-colors text-center">Kick & Refund</button>`;

const newPlayerCard = `                             <div className="flex items-center space-x-1 text-[10px] text-zinc-300 bg-zinc-800 px-2 py-0.5 rounded tracking-wider">
                               <span>{player.phone}</span>
                               <button onClick={() => { navigator.clipboard.writeText(player.phone); toast.success('Phone copied!'); }} className="text-zinc-500 hover:text-white transition-colors">
                                 <Copy className="w-3 h-3" />
                               </button>
                             </div>
                          </div>
                          <div className="text-xs text-zinc-400 mt-1 font-mono">
                             IGN: <span className="text-white">{player.inGameName}</span> | UID: <span className="text-yellow-500">{player.gameUid}</span>
                          </div>
                        </div>
                     </div>
                     <div className="flex flex-col items-end space-y-2 w-full md:w-auto">
                        {resultPlayerId === player.uid ? (
                           <div className="flex flex-col bg-zinc-950 p-3 rounded-lg border border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.1)] w-full sm:w-auto">
                             <div className="text-[10px] text-yellow-500 font-bold uppercase tracking-widest mb-2 flex items-center"><Trophy className="w-3 h-3 mr-1" /> Enter Match Results</div>
                             <div className="flex items-center space-x-3 mb-3">
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
                             </div>
                             <div className="flex items-center space-x-2">
                                <button onClick={() => handleAddPlayerResult(player)} className="flex-1 bg-yellow-500 text-black px-3 py-2 rounded text-xs font-bold uppercase hover:bg-yellow-400 transition-colors shadow-[0_0_10px_rgba(234,179,8,0.3)]">Save Result</button>
                                <button onClick={() => setResultPlayerId('')} className="bg-zinc-800 text-zinc-400 hover:text-white px-3 py-2 rounded text-xs uppercase font-bold transition-colors">Cancel</button>
                             </div>
                           </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            {player.status === 'COMPLETED' ? (
                               <div className="px-3 py-1.5 bg-green-500/10 text-green-500 border border-green-500/20 rounded-lg text-xs font-bold flex items-center">
                                 <Trophy className="w-3 h-3 mr-1" /> Rank {player.rank} • {player.kills} Kills
                               </div>
                            ) : (
                               <button onClick={() => { setResultPlayerId(player.uid); setResultData({ rank: 1, kills: 0 }); }} className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/30 px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase hover:bg-yellow-500 hover:text-black transition-colors text-center flex items-center"><Trophy className="w-3 h-3 mr-1" /> Add Result</button>
                            )}
                            <button onClick={() => handleKickPlayer(player)} className="bg-red-500/10 text-red-500 border border-red-500/30 px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase hover:bg-red-500 hover:text-black transition-colors text-center">Kick & Refund</button>
                          </div>
                        )}`;

content = content.replace(oldPlayerCard, newPlayerCard);
fs.writeFileSync('src/screens/AdminDashboard.tsx', content);

import re

with open("src/screens/AdminDashboard.tsx", "r", encoding="utf-8") as f:
    content = f.read()

old_block = """                   .map((player, idx) => (
                   <div key={idx} className={`flex flex-col md:flex-row justify-between items-start md:items-center p-4 rounded-xl gap-4 border transition-all ${
                     player.status === 'COMPLETED' ? 'bg-zinc-900/80 border-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.05)]' : 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-700'
                   }`}>
                      <div className="flex items-center space-x-6">
                         <div className="w-12 h-12 flex items-center justify-center bg-zinc-950 rounded-xl border border-zinc-800 font-black text-yellow-500 text-lg shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                            {player.slot}
                         </div>
                         <div>
                           <div className="flex flex-col">
                              <div className="text-base font-black text-white uppercase tracking-tight flex items-center">
                                {player.username}
                                {player.status === 'COMPLETED' && <Medal className="w-3 h-3 ml-2 text-yellow-500" />}
                              </div>
                              <div className="flex items-center space-x-1 text-[10px] text-zinc-400 font-bold mt-0.5">
                                <span>{player.phone}</span>
                                <button onClick={() => { navigator.clipboard.writeText(player.phone); toast.success('Phone copied!'); }} className="text-zinc-500 hover:text-white transition-colors ml-1">
                                  <Copy className="w-3 h-3" />
                                </button>
                              </div>
                           </div>
                           <div className="grid grid-cols-1 gap-1 mt-3 border-t border-zinc-800 pt-3">
                              <div className="flex items-center space-x-2">
                                 <span className="text-[9px] text-zinc-500 font-black uppercase tracking-widest min-w-[45px]">IGN :</span>
                                 <span className="text-[11px] text-yellow-500 font-black uppercase tracking-tight">{player.inGameName}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                 <span className="text-[9px] text-zinc-500 font-black uppercase tracking-widest min-w-[45px]">UID :</span>
                                 <span className="text-[11px] text-white font-black tracking-tight">{player.gameUid}</span>
                              </div>
                              <div className="flex items-center space-x-2 mt-1">
                                 <span className="text-[9px] text-zinc-500 font-black uppercase tracking-widest min-w-[45px]">JOINED :</span>
                                 <span className="text-[9px] text-zinc-400 font-bold">
                                    {player.joinedAt ? new Date(player.joinedAt).toLocaleString() : 'N/A'}
                                 </span>
                              </div>
                              <div className="flex items-center space-x-2 mt-2 pt-2 border-t border-zinc-800/50">
                                 <span className="text-[10px] text-yellow-500 font-black uppercase tracking-[0.2em] min-w-[45px]">SLOT NO :</span>
                                 <span className="text-sm text-yellow-500 font-black px-2 py-0.5 bg-yellow-500/10 border border-yellow-500/20 rounded shadow-[0_0_10px_rgba(234,179,8,0.05)]">
                                    {player.slot}
                                 </span>
                              </div>
                           </div>
                         </div>
                      </div>
                      <div className="flex flex-col items-end space-y-2 w-full md:w-auto">
                         {resultPlayerId === player.uid ? (
                            <div className="flex flex-col bg-zinc-950 p-3 rounded-lg border border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.1)] w-full sm:w-auto">
                              <div className="text-[10px] text-yellow-500 font-bold uppercase tracking-widest mb-2 flex items-center"><Trophy className="w-3 h-3 mr-1" /> Enter Match Results</div>
                              <div className="flex items-center space-x-2 mb-3">
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
                              </div>
                              <div className="flex items-center space-x-2">
                                 <button onClick={() => confirmAddPlayerResult(player)} className="flex-1 bg-yellow-500 text-black px-3 py-2 rounded text-xs font-bold uppercase hover:bg-yellow-400 transition-colors shadow-[0_0_10px_rgba(234,179,8,0.3)]">Save Result</button>
                                 <button onClick={() => setResultPlayerId('')} className="bg-zinc-800 text-zinc-400 hover:text-white px-3 py-2 rounded text-xs uppercase font-bold transition-colors">Cancel</button>
                              </div>
                            </div>
                         ) : (
                           <div className="flex items-center space-x-2">
                             {player.status === 'COMPLETED' ? (
                                <div className="px-3 py-1.5 bg-green-500/10 text-green-500 border border-green-500/20 rounded-lg text-xs font-bold flex items-center">
                                  <Trophy className="w-3 h-3 mr-1" /> Rank {player.rank} • {player.kills} Kills • PKR {player.winnings || 0}
                                </div>
                             ) : (
                                <button onClick={() => { setResultPlayerId(player.uid); setResultData({ rank: 1, kills: 0, winnings: 0 }); }} className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/30 px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase hover:bg-yellow-500 hover:text-black transition-colors text-center flex items-center"><Trophy className="w-3 h-3 mr-1" /> Add Result</button>
                             )}
                             <button onClick={() => confirmKickPlayer(player)} className="bg-red-500/10 text-red-500 border border-red-500/30 px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase hover:bg-red-500 hover:text-black transition-colors text-center">Kick & Refund</button>
                           </div>
                         )}
                      </div>
                   </div>
                 ))"""

new_block = """                   .map((player, idx) => (
                   <div key={idx} className={`flex flex-col justify-between p-4 sm:p-5 rounded-2xl gap-4 border transition-all ${
                     player.status === 'COMPLETED' ? 'bg-zinc-900/90 border-green-500/30 shadow-[0_0_20px_rgba(34,197,94,0.1)]' : 'bg-zinc-900/60 border-yellow-500/20 hover:border-yellow-500/40 shadow-[0_4px_20px_rgba(0,0,0,0.5)]'
                   }`}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
                         <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 flex items-center justify-center bg-gradient-to-br from-yellow-500/20 to-zinc-950 rounded-xl border border-yellow-500/40 font-black text-yellow-500 text-lg shadow-[0_0_15px_rgba(234,179,8,0.2)]">
                               {player.slot}
                            </div>
                            <div>
                               <div className="text-base font-black text-white uppercase tracking-tight flex items-center">
                                 {player.username}
                                 {player.status === 'COMPLETED' && <Medal className="w-3.5 h-3.5 ml-2 text-yellow-500" />}
                               </div>
                               <div className="flex items-center space-x-1.5 text-[11px] text-zinc-400 font-bold mt-0.5">
                                 <span>{player.phone}</span>
                                 <button onClick={() => { navigator.clipboard.writeText(player.phone); toast.success('Phone copied!'); }} className="text-yellow-500 hover:text-yellow-400 transition-colors p-1">
                                   <Copy className="w-3.5 h-3.5" />
                                 </button>
                               </div>
                            </div>
                         </div>
                         <div className="flex items-center space-x-2 self-start sm:self-auto">
                            <span className="text-[10px] text-yellow-500 font-black uppercase tracking-widest">SLOT NO :</span>
                            <span className="text-xs text-black font-black px-2.5 py-1 bg-yellow-500 rounded-lg shadow-[0_0_10px_rgba(234,179,8,0.3)]">
                               {player.slot}
                            </span>
                         </div>
                      </div>

                      {/* Leader / Player Details */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3.5">
                         <div className="space-y-1">
                            <span className="text-[9px] text-zinc-500 font-black uppercase tracking-widest block">Leader / Player IGN</span>
                            <span className="text-xs text-yellow-400 font-black uppercase tracking-tight block">{player.inGameName}</span>
                         </div>
                         <div className="space-y-1">
                            <span className="text-[9px] text-zinc-500 font-black uppercase tracking-widest block">Character UID</span>
                            <span className="text-xs text-white font-black tracking-tight block">{player.gameUid}</span>
                         </div>
                         <div className="sm:col-span-2 pt-2 border-t border-zinc-800/60 flex justify-between items-center text-[10px] text-zinc-400">
                            <span className="font-bold">Joined: {player.joinedAt ? new Date(player.joinedAt).toLocaleString() : 'N/A'}</span>
                         </div>
                      </div>

                      {/* Teammates Section (if Duo / Trio / Squad) */}
                      {player.teamDetails && player.teamDetails.length > 0 && (
                         <div className="space-y-2 bg-zinc-950/80 border border-yellow-500/20 rounded-xl p-3.5">
                            <div className="flex items-center justify-between">
                               <span className="text-[10px] font-black text-yellow-500 uppercase tracking-widest flex items-center">
                                 <Users className="w-3.5 h-3.5 mr-1.5" /> Teammates ({player.teamDetails.length})
                               </span>
                            </div>
                            <div className="space-y-2 mt-2">
                               {player.teamDetails.map((tm: any, tIdx: number) => (
                                  <div key={tIdx} className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                     <div className="flex items-center space-x-2">
                                        <span className="text-[9px] font-black bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded">T{tIdx + 1}</span>
                                        <span className="text-xs font-black text-white uppercase">{tm.inGameName}</span>
                                     </div>
                                     <div className="text-[11px] font-bold text-zinc-400 font-mono bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
                                        UID: {tm.gameUid}
                                     </div>
                                  </div>
                               ))}
                            </div>
                         </div>
                      )}

                      {/* Actions / Results */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between pt-2 gap-3">
                         {resultPlayerId === player.uid ? (
                            <div className="flex flex-col bg-zinc-950 p-4 rounded-xl border border-yellow-500/40 shadow-[0_0_20px_rgba(234,179,8,0.15)] w-full">
                              <div className="text-xs text-yellow-500 font-black uppercase tracking-widest mb-3 flex items-center"><Trophy className="w-4 h-4 mr-1.5" /> Enter Match Results</div>
                              <div className="grid grid-cols-3 gap-2 mb-3">
                                <div className="flex flex-col">
                                  <label className="text-[9px] text-zinc-400 uppercase font-bold mb-1">Rank</label>
                                  <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                                      <span className="text-zinc-500 text-xs font-bold">#</span>
                                    </div>
                                    <input type="number" min="1" value={resultData.rank} onChange={e => setResultData({...resultData, rank: Number(e.target.value)})} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 pl-6 text-xs font-bold text-white focus:outline-none focus:border-yellow-500" />
                                  </div>
                                </div>
                                <div className="flex flex-col">
                                  <label className="text-[9px] text-zinc-400 uppercase font-bold mb-1">Kills</label>
                                  <input type="number" min="0" value={resultData.kills} onChange={e => setResultData({...resultData, kills: Number(e.target.value)})} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs font-bold text-white focus:outline-none focus:border-yellow-500" />
                                </div>
                                <div className="flex flex-col">
                                  <label className="text-[9px] text-zinc-400 uppercase font-bold mb-1">Winning (PKR)</label>
                                  <input type="number" min="0" value={resultData.winnings || 0} onChange={e => setResultData({...resultData, winnings: Number(e.target.value)})} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs font-bold text-white focus:outline-none focus:border-yellow-500" />
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                 <button onClick={() => confirmAddPlayerResult(player)} className="flex-1 bg-yellow-500 text-black px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-yellow-400 transition-colors shadow-[0_0_15px_rgba(234,179,8,0.3)]">Save Result</button>
                                 <button onClick={() => setResultPlayerId('')} className="bg-zinc-800 text-zinc-400 hover:text-white px-4 py-2.5 rounded-xl text-xs uppercase font-bold transition-colors">Cancel</button>
                              </div>
                            </div>
                         ) : (
                           <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full">
                             {player.status === 'COMPLETED' ? (
                                <div className="flex-1 px-3 py-2 bg-green-500/15 text-green-400 border border-green-500/30 rounded-xl text-xs font-bold flex items-center justify-center">
                                  <Trophy className="w-3.5 h-3.5 mr-1.5" /> Rank {player.rank} • {player.kills} Kills • PKR {player.winnings || 0}
                                </div>
                             ) : (
                                <button onClick={() => { setResultPlayerId(player.uid); setResultData({ rank: 1, kills: 0, winnings: 0 }); }} className="flex-1 bg-yellow-500/10 text-yellow-500 border border-yellow-500/30 py-2.5 px-4 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-yellow-500 hover:text-black transition-colors text-center flex items-center justify-center shadow-[0_0_10px_rgba(234,179,8,0.1)]">
                                  <Trophy className="w-3.5 h-3.5 mr-1.5" /> Add Result
                                </button>
                             )}
                             <button onClick={() => confirmKickPlayer(player)} className="bg-red-500/10 text-red-500 border border-red-500/30 py-2.5 px-4 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-red-500 hover:text-black transition-colors text-center flex items-center justify-center">
                                Kick & Refund
                              </button>
                           </div>
                         )}
                      </div>
                   </div>
                 ))"""

if old_block in content:
    content = content.replace(old_block, new_block)
    print("Admin player cards updated successfully.")
else:
    print("Warning: old_block not found in AdminDashboard.tsx")

with open("src/screens/AdminDashboard.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("File write completed.")

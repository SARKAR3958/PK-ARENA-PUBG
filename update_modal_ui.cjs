const fs = require('fs');
let content = fs.readFileSync('src/screens/AdminDashboard.tsx', 'utf-8');

const oldModal = `{/* Players Modal */}
      {isPlayersModalOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="flex justify-between items-center p-6 border-b border-zinc-800 bg-zinc-900/50">
              <h2 className="text-lg font-black text-yellow-500 uppercase tracking-widest">Joined Players ({matchPlayers.length})</h2>
              <button onClick={() => setIsPlayersModalOpen(false)} className="text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 overflow-y-auto space-y-2">
              {matchPlayers.length === 0 ? (
                <div className="text-center py-8 text-zinc-500">No players joined yet</div>
              ) : (
                matchPlayers.map((player, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-zinc-900 border border-zinc-800 p-3 rounded-xl">
                     <div className="flex items-center space-x-3">
                        <div className="w-6 text-center text-xs font-bold text-yellow-500">#{player.slot}</div>
                        <div>
                          <div className="text-sm font-bold text-white">{player.username}</div>
                          <div className="text-[10px] text-zinc-400">IGN: {player.inGameName} | UID: {player.gameUid}</div>
                        </div>
                     </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}`;

const newModal = `{/* Players Modal */}
      {isPlayersModalOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-zinc-800 bg-zinc-900/50 shrink-0">
              <h2 className="text-lg font-black text-yellow-500 uppercase tracking-widest">Joined Players ({matchPlayers.length})</h2>
              <button onClick={() => setIsPlayersModalOpen(false)} className="text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              {matchPlayers.length === 0 ? (
                <div className="text-center py-8 text-zinc-500">No players joined yet</div>
              ) : (
                matchPlayers.map((player, idx) => (
                  <div key={idx} className="flex flex-col md:flex-row justify-between items-start md:items-center bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl gap-4">
                     <div className="flex items-center space-x-4">
                        <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-black text-yellow-500 shrink-0">
                          {player.slot}
                        </div>
                        <img src={player.profilePic} alt="PFP" className="w-12 h-12 rounded-full object-cover border border-zinc-700" />
                        <div>
                          <div className="flex items-center space-x-2">
                             <div className="text-base font-bold text-white">{player.username}</div>
                             <div className="text-[10px] text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded uppercase tracking-wider">{player.phone}</div>
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
                        <button onClick={() => handleKickPlayer(player)} className="bg-red-500/10 text-red-500 border border-red-500/30 px-4 py-2 rounded-lg font-bold text-xs uppercase hover:bg-red-500 hover:text-black transition-colors text-center">Kick & Refund</button>
                     </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}`;

content = content.replace(oldModal, newModal);
fs.writeFileSync('src/screens/AdminDashboard.tsx', content);

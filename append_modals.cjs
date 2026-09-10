const fs = require('fs');
const content = fs.readFileSync('src/screens/AdminDashboard.tsx', 'utf-8');

const endTag = "    </div>\n  );\n};\n\n// --- Sub-Components ---";
const insertIndex = content.lastIndexOf(endTag);

if (insertIndex === -1) {
  console.log("Could not find insert index");
  process.exit(1);
}

const modals = `

      {/* Edit Match Modal */}
      {isEditMatchModalOpen && editingMatch && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-2xl overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-zinc-800 bg-zinc-900/50">
              <h2 className="text-lg font-black text-yellow-500 uppercase tracking-widest">Edit Match</h2>
              <button onClick={() => setIsEditMatchModalOpen(false)} className="text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleUpdateMatch} className="p-6 overflow-y-auto max-h-[70vh] space-y-6">
               <div className="grid grid-cols-2 gap-4">
                 <div className="col-span-2">
                   <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Match Title</label>
                   <input required type="text" value={editingMatch.title} onChange={e => setEditingMatch({...editingMatch, title: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-yellow-500" />
                 </div>
                 
                 <div>
                   <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Game Type</label>
                   <select value={editingMatch.type} onChange={e => setEditingMatch({...editingMatch, type: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-yellow-500">
                      <option value="BR">Battle Royale</option>
                      <option value="CS">Clash Squad</option>
                      <option value="LW">Lone Wolf</option>
                   </select>
                 </div>
                 
                 <div>
                   <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Team Mode</label>
                   <select value={editingMatch.mode} onChange={e => setEditingMatch({...editingMatch, mode: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-yellow-500">
                      <option value="SOLO">Solo</option>
                      <option value="DUO">Duo</option>
                      <option value="SQUAD">Squad</option>
                   </select>
                 </div>

                 <div>
                   <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Date</label>
                   <input required type="date" value={editingMatch.date} onChange={e => setEditingMatch({...editingMatch, date: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-yellow-500" />
                 </div>
                 
                 <div>
                   <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Time</label>
                   <input required type="time" value={editingMatch.time} onChange={e => setEditingMatch({...editingMatch, time: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-yellow-500" />
                 </div>

                 <div>
                   <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Status</label>
                   <select value={editingMatch.status} onChange={e => setEditingMatch({...editingMatch, status: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-yellow-500">
                      <option value="UPCOMING">UPCOMING</option>
                      <option value="LIVE">LIVE</option>
                      <option value="IN-PROGRESS">IN-PROGRESS</option>
                      <option value="COMPLETED">COMPLETED</option>
                      <option value="CANCELLED">CANCELLED</option>
                   </select>
                 </div>
                 
                 <div>
                   <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Entry Fee (PKR)</label>
                   <input required type="number" min="0" value={editingMatch.entryFee} onChange={e => setEditingMatch({...editingMatch, entryFee: Number(e.target.value)})} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-yellow-500" />
                 </div>

                 <div>
                   <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Prize Pool (PKR)</label>
                   <input required type="number" min="0" value={editingMatch.prizePool} onChange={e => setEditingMatch({...editingMatch, prizePool: Number(e.target.value)})} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-yellow-500" />
                 </div>
                 
                 <div>
                   <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Per Kill Prize</label>
                   <input type="number" min="0" value={editingMatch.perKill} onChange={e => setEditingMatch({...editingMatch, perKill: Number(e.target.value)})} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-yellow-500" />
                 </div>

                 <div>
                   <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Map</label>
                   <input required type="text" value={editingMatch.map} onChange={e => setEditingMatch({...editingMatch, map: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-yellow-500" />
                 </div>
               </div>
               
               <button type="submit" className="w-full bg-yellow-500 text-black font-black uppercase tracking-widest py-4 rounded-xl hover:bg-yellow-400 transition-colors mt-6 shadow-[0_0_20px_rgba(234,179,8,0.2)]">
                 Save Changes
               </button>
            </form>
          </div>
        </div>
      )}

      {/* Room ID & Pass Modal */}
      {isRoomModalOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-zinc-800 bg-zinc-900/50">
              <h2 className="text-lg font-black text-yellow-500 uppercase tracking-widest">Update Room Details</h2>
              <button onClick={() => setIsRoomModalOpen(false)} className="text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleUpdateRoom} className="p-6 space-y-6">
               <div>
                 <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Room ID</label>
                 <input type="text" value={roomData.roomId} onChange={e => setRoomData({...roomData, roomId: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-yellow-500" placeholder="e.g. 12345678" />
               </div>
               <div>
                 <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Room Password</label>
                 <input type="text" value={roomData.password} onChange={e => setRoomData({...roomData, password: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-yellow-500" placeholder="e.g. pk123" />
               </div>
               <button type="submit" className="w-full bg-yellow-500 text-black font-black uppercase tracking-widest py-4 rounded-xl hover:bg-yellow-400 transition-colors mt-6 shadow-[0_0_20px_rgba(234,179,8,0.2)]">
                 Save Room Details
               </button>
            </form>
          </div>
        </div>
      )}

      {/* Players Modal */}
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
      )}
`;

const newContent = content.substring(0, insertIndex) + modals + content.substring(insertIndex);
fs.writeFileSync('src/screens/AdminDashboard.tsx', newContent);
console.log("Appended Modals");

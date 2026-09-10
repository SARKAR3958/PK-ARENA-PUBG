import re

with open("src/screens/Home.tsx", "r", encoding="utf-8") as f:
    content = f.read()

old_block = """                <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 flex items-start">
                  <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0 mr-2 mt-0.5" />
                  <div>
                    <h4 className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-0.5">Warning</h4>
                    <p className="text-[10px] text-zinc-300 leading-relaxed font-medium">
                      Enter your real teammate IGN and ID otherwise admin will kick from room.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Leader (Current User) */}
                  <div className="bg-zinc-900/50 border border-yellow-500/20 rounded-xl p-3 relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-yellow-500 text-black text-[8px] font-black px-2 py-1 rounded-bl-lg uppercase tracking-widest">
                      Leader (You)
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      <div>
                        <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">In-Game Name</label>
                        <input type="text" value={currentUser?.inGameName || ''} disabled className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-400 font-bold opacity-70" />
                      </div>
                      <div>
                        <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Character ID</label>
                        <input type="text" value={currentUser?.gameUid || ''} disabled className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-400 font-bold opacity-70" />
                      </div>
                    </div>
                  </div>

                  {/* Teammates */}
                  {teamMembers.map((member, idx) => (
                    <div key={idx} className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-3 relative">
                      <div className="absolute top-0 right-0 bg-zinc-800 text-zinc-400 text-[8px] font-black px-2 py-1 rounded-bl-lg uppercase tracking-widest">
                        Teammate {idx + 1}
                      </div>
                      <div className="grid grid-cols-2 gap-3 mt-2">
                        <div>
                          <label className="block text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">In-Game Name</label>
                          <input 
                            type="text" 
                            placeholder="IGN..."
                            value={member.inGameName} 
                            onChange={(e) => {
                              const newMembers = [...teamMembers];
                              newMembers[idx].inGameName = e.target.value;
                              setTeamMembers(newMembers);
                            }}
                            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-yellow-500 transition-colors placeholder:text-zinc-600" 
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">Character ID</label>
                          <input 
                            type="text"
                            placeholder="ID..." 
                            value={member.gameUid} 
                            onChange={(e) => {
                              const newMembers = [...teamMembers];
                              newMembers[idx].gameUid = e.target.value;
                              setTeamMembers(newMembers);
                            }}
                            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-yellow-500 transition-colors placeholder:text-zinc-600" 
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>"""

new_block = """                <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 flex items-start">
                  <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0 mr-2 mt-0.5" />
                  <div>
                    <h4 className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-0.5">Warning</h4>
                    <p className="text-[10px] text-zinc-300 leading-relaxed font-medium">
                      enter your real teammate ign and id otherwise random will kick from room
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Leader (Current User) - Editable, 1 input per row */}
                  <div className="bg-zinc-900/50 border border-yellow-500/20 rounded-xl p-3.5 relative overflow-hidden space-y-3">
                    <div className="absolute top-0 right-0 bg-yellow-500 text-black text-[8px] font-black px-2.5 py-1 rounded-bl-lg uppercase tracking-widest">
                      Leader (You)
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-yellow-500 uppercase tracking-widest mb-1">Leader In-Game Name (IGN)</label>
                      <input 
                        type="text" 
                        placeholder="Enter your IGN..."
                        value={leaderInGameName} 
                        onChange={(e) => setLeaderInGameName(e.target.value)}
                        className="w-full bg-zinc-900 border border-yellow-500/40 rounded-xl px-3.5 py-3 text-xs text-white font-bold focus:outline-none focus:border-yellow-500 transition-colors placeholder:text-zinc-600 shadow-inner" 
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-yellow-500 uppercase tracking-widest mb-1">Leader Character ID (UID)</label>
                      <input 
                        type="text" 
                        placeholder="Enter your Character ID..."
                        value={leaderGameUid} 
                        onChange={(e) => setLeaderGameUid(e.target.value)}
                        className="w-full bg-zinc-900 border border-yellow-500/40 rounded-xl px-3.5 py-3 text-xs text-white font-bold focus:outline-none focus:border-yellow-500 transition-colors placeholder:text-zinc-600 shadow-inner" 
                      />
                    </div>
                  </div>

                  {/* Teammates - 1 input per row */}
                  {teamMembers.map((member, idx) => (
                    <div key={idx} className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-3.5 relative space-y-3">
                      <div className="absolute top-0 right-0 bg-zinc-800 text-zinc-400 text-[8px] font-black px-2 py-1 rounded-bl-lg uppercase tracking-widest">
                        Teammate {idx + 1}
                      </div>
                      <div>
                        <label className="block text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">Teammate {idx + 1} In-Game Name (IGN)</label>
                        <input 
                          type="text" 
                          placeholder="Teammate IGN..."
                          value={member.inGameName} 
                          onChange={(e) => {
                            const newMembers = [...teamMembers];
                            newMembers[idx].inGameName = e.target.value;
                            setTeamMembers(newMembers);
                          }}
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-3 text-xs text-white font-bold focus:outline-none focus:border-yellow-500 transition-colors placeholder:text-zinc-600" 
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">Teammate {idx + 1} Character ID (UID)</label>
                        <input 
                          type="text"
                          placeholder="Teammate Character ID..." 
                          value={member.gameUid} 
                          onChange={(e) => {
                            const newMembers = [...teamMembers];
                            newMembers[idx].gameUid = e.target.value;
                            setTeamMembers(newMembers);
                          }}
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-3 text-xs text-white font-bold focus:outline-none focus:border-yellow-500 transition-colors placeholder:text-zinc-600" 
                        />
                      </div>
                    </div>
                  ))}
                </div>"""

if old_block in content:
    content = content.replace(old_block, new_block)
    print("Modal layout updated")
else:
    print("Warning: old_block not found")

# Update validation click handler
old_click = """                 <button 
                   onClick={() => {
                     const isIncomplete = teamMembers.some(m => !m.inGameName.trim() || !m.gameUid.trim());
                     if (isIncomplete) {
                       toast.error('Please fill in all teammate details');
                       return;
                     }
                     executeJoinMatch(teamMembers);
                   }}
                   disabled={isJoining}
                   className="w-full bg-gradient-pk bg-gradient-pk-hover text-black font-black py-3 rounded-xl text-sm uppercase tracking-widest shadow-[0_0_20px_rgba(234,179,8,0.2)] disabled:opacity-50"
                 >
                   {isJoining ? 'PROCESSING...' : 'JOIN MATCH'}
                 </button>"""

new_click = """                 <button 
                   onClick={() => {
                     if (!leaderInGameName.trim() || !leaderGameUid.trim()) {
                       toast.error('Please fill in your leader IGN and Character ID');
                       return;
                     }
                     const isIncomplete = teamMembers.some(m => !m.inGameName.trim() || !m.gameUid.trim());
                     if (isIncomplete) {
                       toast.error('Please fill in all teammate details');
                       return;
                     }
                     // Pass teamDetails including leader if needed or teamMembers
                     executeJoinMatch(teamMembers);
                   }}
                   disabled={isJoining}
                   className="w-full bg-gradient-pk bg-gradient-pk-hover text-black font-black py-3.5 rounded-xl text-sm uppercase tracking-widest shadow-[0_0_20px_rgba(234,179,8,0.2)] disabled:opacity-50"
                 >
                   {isJoining ? 'PROCESSING...' : 'JOIN'}
                 </button>"""

if old_click in content:
    content = content.replace(old_click, new_click)
    print("Join button click updated")

with open("src/screens/Home.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Home.tsx fully updated.")

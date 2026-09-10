const fs = require('fs');
let content = fs.readFileSync('src/screens/Home.tsx', 'utf-8');

// Replace {showRulesModal.roomId || 'WAITING...'} and {showRulesModal.roomPass || 'WAITING...'}
// with actual tournament look up inside the render.
// Since showRulesModal is used in JSX, we can do an IIFE or inline the look up.

// Let's replace the whole modal
const oldModal = `{showRulesModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-950 border border-yellow-900/50 rounded-2xl w-full max-w-sm overflow-hidden flex flex-col"
            >
              <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900">
                <h3 className="text-sm font-bold text-yellow-500 flex items-center uppercase tracking-tight">
                  <AlertTriangle className="w-4 h-4 mr-2" /> Match Rules & Room
                </h3>
                <button onClick={() => setShowRulesModal(null)} className="text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-5 space-y-4">
                <div className="bg-yellow-500/5 border border-yellow-500/10 rounded-xl p-4">
                  <div className="text-[10px] text-yellow-500/60 uppercase font-bold mb-3 flex items-center tracking-widest">
                    <div className="w-1 h-1 bg-yellow-500 rounded-full mr-2" /> Room Credentials
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-[9px] text-zinc-500 uppercase font-bold mb-1">Room ID</div>
                      <div className="text-sm font-mono font-bold text-white tracking-wider">{showRulesModal.roomId || 'WAITING...'}</div>
                    </div>
                    <div>
                      <div className="text-[9px] text-zinc-500 uppercase font-bold mb-1">Password</div>
                      <div className="text-sm font-mono font-bold text-white tracking-wider">{showRulesModal.roomPass || 'WAITING...'}</div>
                    </div>
                  </div>
                  <p className="mt-3 text-[9px] text-zinc-500 italic">* Room ID & Pass will be updated 10 mins before match start.</p>
                </div>
                <div className="space-y-2.5">
                  <div className="text-[10px] text-zinc-400 uppercase font-bold mb-1 tracking-widest">Important Rules</div>
                  <div className="flex items-start space-x-2">
                    <div className="w-1 h-1 bg-yellow-500 rounded-full mt-1.5 shrink-0" />
                    <p className="text-[10px] text-zinc-300 leading-relaxed">Emulators are strictly prohibited. Using them will result in a ban without refund.</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <div className="w-1 h-1 bg-yellow-500 rounded-full mt-1.5 shrink-0" />
                    <p className="text-[10px] text-zinc-300 leading-relaxed">Team up in solo matches is not allowed. All players involved will be disqualified.</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <div className="w-1 h-1 bg-yellow-500 rounded-full mt-1.5 shrink-0" />
                    <p className="text-[10px] text-zinc-300 leading-relaxed">Ensure your in-game name matches exactly with your profile name.</p>
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-zinc-800 bg-zinc-900">
                <button 
                  onClick={() => setShowRulesModal(null)}
                  className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 rounded-xl text-xs uppercase tracking-widest transition-colors"
                >
                  GOT IT
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}`;

const newModal = `{showRulesModal && (() => {
          const actualTour = tournaments.find(t => t.id === showRulesModal.tournamentId) || showRulesModal;
          return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-950 border border-yellow-900/50 rounded-2xl w-full max-w-sm overflow-hidden flex flex-col"
            >
              <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900">
                <h3 className="text-sm font-bold text-yellow-500 flex items-center uppercase tracking-tight">
                  <AlertTriangle className="w-4 h-4 mr-2" /> Match Rules & Room
                </h3>
                <button onClick={() => setShowRulesModal(null)} className="text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-5 space-y-4">
                <div className="bg-yellow-500/5 border border-yellow-500/10 rounded-xl p-4">
                  <div className="text-[10px] text-yellow-500/60 uppercase font-bold mb-3 flex items-center tracking-widest">
                    <div className="w-1 h-1 bg-yellow-500 rounded-full mr-2" /> Room Credentials
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-[9px] text-zinc-500 uppercase font-bold mb-1">Room ID</div>
                      <div className="text-sm font-mono font-bold text-white tracking-wider">{actualTour.roomId || 'WAITING...'}</div>
                    </div>
                    <div>
                      <div className="text-[9px] text-zinc-500 uppercase font-bold mb-1">Password</div>
                      <div className="text-sm font-mono font-bold text-white tracking-wider">{actualTour.password || 'WAITING...'}</div>
                    </div>
                  </div>
                  <p className="mt-3 text-[9px] text-zinc-500 italic">* Room ID & Pass will be updated 10 mins before match start.</p>
                </div>
                <div className="space-y-2.5">
                  <div className="text-[10px] text-zinc-400 uppercase font-bold mb-1 tracking-widest">Important Rules</div>
                  <div className="flex items-start space-x-2">
                    <div className="w-1 h-1 bg-yellow-500 rounded-full mt-1.5 shrink-0" />
                    <p className="text-[10px] text-zinc-300 leading-relaxed">Emulators are strictly prohibited. Using them will result in a ban without refund.</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <div className="w-1 h-1 bg-yellow-500 rounded-full mt-1.5 shrink-0" />
                    <p className="text-[10px] text-zinc-300 leading-relaxed">Team up in solo matches is not allowed. All players involved will be disqualified.</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <div className="w-1 h-1 bg-yellow-500 rounded-full mt-1.5 shrink-0" />
                    <p className="text-[10px] text-zinc-300 leading-relaxed">Ensure your in-game name matches exactly with your profile name.</p>
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-zinc-800 bg-zinc-900">
                <button 
                  onClick={() => setShowRulesModal(null)}
                  className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 rounded-xl text-xs uppercase tracking-widest transition-colors"
                >
                  GOT IT
                </button>
              </div>
            </motion.div>
          </motion.div>
          )
        })()}`;

if(content.includes('<div>\n                      <div className="text-[9px] text-zinc-500 uppercase font-bold mb-1">Password</div>\n                      <div className="text-sm font-mono font-bold text-white tracking-wider">{showRulesModal.roomPass || \'WAITING...\'}</div>\n                    </div>')) {
  content = content.replace(oldModal, newModal);
  fs.writeFileSync('src/screens/Home.tsx', content);
  console.log("Updated rules modal in Home.tsx");
} else {
  console.log("Could not find the target code.");
}

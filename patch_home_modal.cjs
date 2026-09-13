const fs = require('fs');
let content = fs.readFileSync('src/screens/Home.tsx', 'utf8');

const successModalJSX = `
      {/* Join Success Modal */}
      <AnimatePresence>
        {joinSuccessModal?.show && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-zinc-950 border border-yellow-500/30 rounded-2xl p-6 max-w-sm w-full shadow-2xl overflow-hidden relative text-center"
            >
              {/* Confetti or simple icon */}
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-yellow-500/20 border border-yellow-500 flex items-center justify-center">
                <Trophy className="w-8 h-8 text-yellow-500" />
              </div>
              <h2 className="text-xl font-black text-white uppercase tracking-wider mb-2">Registration Success</h2>
              <p className="text-zinc-400 text-sm mb-4">
                You have successfully joined <span className="text-yellow-500 font-bold">{joinSuccessModal.matchName}</span>
              </p>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 mb-6 inline-block w-full">
                <span className="text-xs text-zinc-500 uppercase tracking-widest block mb-1">Slot No</span>
                <span className="text-xl font-black text-white">{joinSuccessModal.slotNo || 'Auto'}</span>
              </div>
              <button
                onClick={() => setJoinSuccessModal(null)}
                className="w-full bg-gradient-pk bg-gradient-pk-hover text-black font-black py-3 rounded-xl text-sm uppercase tracking-widest shadow-lg shadow-yellow-500/20 active:scale-[0.98]"
              >
                OK
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
`;

// Inject before closing motion div
const closeIndex = content.lastIndexOf('    </motion.div>');
if (closeIndex !== -1 && !content.includes('Join Success Modal')) {
  content = content.slice(0, closeIndex) + successModalJSX + '\n' + content.slice(closeIndex);
  fs.writeFileSync('src/screens/Home.tsx', content);
  console.log('Appended success modal');
} else {
  console.log('Could not find injection point or modal already exists');
}

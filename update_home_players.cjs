const fs = require('fs');
let content = fs.readFileSync('src/screens/Home.tsx', 'utf-8');

// Add imports
if (!content.includes('import { db } from')) {
    content = content.replace("import toast from 'react-hot-toast';", "import toast from 'react-hot-toast';\nimport { db } from '../lib/firebase';\nimport { ref, get } from 'firebase/database';\nimport { useEffect } from 'react';");
}

// Add state and effect
const stateMarker = `const [showRulesModal, setShowRulesModal] = useState<any>(null);`;
const stateContent = `  const [showRulesModal, setShowRulesModal] = useState<any>(null);
  const [matchPlayers, setMatchPlayers] = useState<any[]>([]);
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(false);

  useEffect(() => {
    if (viewingPlayersTournament) {
       const fetchPlayers = async () => {
         setIsLoadingPlayers(true);
         try {
            const usersRef = ref(db, 'userMatches');
            const snapshot = await get(usersRef);
            const allUserMatches = snapshot.val();
            
            const usersListRef = ref(db, 'users');
            const usersSnapshot = await get(usersListRef);
            const allUsers = usersSnapshot.val() || {};
            
            const players = [];
            if (allUserMatches) {
                for (const uid in allUserMatches) {
                   for (const mid in allUserMatches[uid]) {
                      if (allUserMatches[uid][mid].tournamentId === viewingPlayersTournament.id) {
                         const user = allUsers[uid];
                         players.push({
                            ...allUserMatches[uid][mid],
                            username: user?.username || 'Unknown',
                            phone: user?.phone || 'N/A'
                         });
                      }
                   }
                }
            }
            setMatchPlayers(players.sort((a, b) => a.slot - b.slot));
         } catch(err) {
            console.error(err);
         }
         setIsLoadingPlayers(false);
       };
       fetchPlayers();
    } else {
       setMatchPlayers([]);
    }
  }, [viewingPlayersTournament]);`;

if(!content.includes('const [matchPlayers')) {
  content = content.replace(stateMarker, stateContent);
}

// Replace the UI part
const uiOld = `              <div className="p-4 overflow-y-auto space-y-2 flex-1">
                {viewingPlayersTournament.spotsFilled > 0 ? (
                  Array.from({ length: viewingPlayersTournament.spotsFilled }).map((_, i) => (
                    <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex items-center justify-between group hover:border-yellow-500/30 transition-colors">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center text-xs font-bold text-yellow-500 mr-3 border border-zinc-700">
                          {i + 1}
                        </div>
                        <div>
                          <div className="text-[11px] font-bold text-white group-hover:text-yellow-500 transition-colors">Player_{i + 1}</div>
                        </div>
                      </div>
                      <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 opacity-50">
                    <User className="w-12 h-12 text-zinc-800 mb-2" />
                    <div className="text-zinc-500 font-bold text-sm">No players joined yet</div>
                  </div>
                )}
              </div>`;

const uiNew = `              <div className="p-4 overflow-y-auto space-y-2 flex-1">
                {isLoadingPlayers ? (
                  <div className="text-center py-10 text-zinc-500 text-xs font-bold uppercase tracking-widest animate-pulse">Loading Players...</div>
                ) : matchPlayers.length > 0 ? (
                  matchPlayers.map((player, i) => (
                    <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex items-center justify-between group hover:border-yellow-500/30 transition-colors">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center text-xs font-bold text-yellow-500 mr-3 border border-zinc-700">
                          {player.slot}
                        </div>
                        <div>
                          <div className="text-[11px] font-bold text-white group-hover:text-yellow-500 transition-colors">{player.username}</div>
                          <div className="flex items-center space-x-1 mt-1 text-[9px] text-zinc-400 bg-zinc-950 px-1.5 py-0.5 rounded w-fit">
                             <span>{player.phone}</span>
                             <button onClick={() => { navigator.clipboard.writeText(player.phone); toast.success('Phone copied!'); }} className="text-zinc-500 hover:text-white transition-colors ml-1">
                               <Copy className="w-3 h-3" />
                             </button>
                          </div>
                        </div>
                      </div>
                      <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 opacity-50">
                    <User className="w-12 h-12 text-zinc-800 mb-2" />
                    <div className="text-zinc-500 font-bold text-sm">No players joined yet</div>
                  </div>
                )}
              </div>`;

content = content.replace(uiOld, uiNew);
fs.writeFileSync('src/screens/Home.tsx', content);

console.log("Updated Home.tsx with players list");

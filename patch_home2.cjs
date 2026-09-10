const fs = require('fs');
let code = fs.readFileSync('src/screens/Home.tsx', 'utf8');

code = code.replace(
  /<button \s*onClick=\{\(\) => \{\s*const t = viewingPlayersTournament;\s*setViewingPlayersTournament\(null\);\s*setSelectedTournament\(t\);\s*setSelectedSlot\(null\);\s*\}\}\s*className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3 rounded-xl text-xs uppercase tracking-widest transition-colors"\s*>\s*Join This Match\s*<\/button>/g,
  `{joinedMatches.some(m => m.tournamentId === viewingPlayersTournament.id) ? (
                  <button 
                  onClick={() => {
                    const joined = joinedMatches.find(m => m.tournamentId === viewingPlayersTournament.id);
                    setViewingPlayersTournament(null);
                    setShowRulesModal(joined);
                  }}
                  className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 rounded-xl text-xs uppercase tracking-widest transition-colors border border-zinc-700"
                >
                  View Match Rules
                </button>
                ) : (
                  <button 
                  onClick={() => {
                    const t = viewingPlayersTournament;
                    setViewingPlayersTournament(null);
                    setSelectedTournament(t);
                    setSelectedSlot(null);
                  }}
                  className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3 rounded-xl text-xs uppercase tracking-widest transition-colors"
                >
                  Join This Match
                </button>
                )}`
);

fs.writeFileSync('src/screens/Home.tsx', code);

const fs = require('fs');

// Profile.tsx
let profile = fs.readFileSync('src/screens/Profile.tsx', 'utf-8');

if (!profile.includes('Copy')) {
    profile = profile.replace(/import {([^}]+)} from 'lucide-react';/, (match, p1) => {
        return `import {${p1}, Copy} from 'lucide-react';`;
    });
}

const oldProfileRoom = `<div className="mt-2 pt-2 border-t border-zinc-800 flex justify-between items-center bg-zinc-950 p-2 rounded-lg">
                            <div>
                               <div className="text-[9px] text-zinc-500 uppercase">Room ID</div>
                               <div className="text-xs font-black text-white">{actualTour.roomId}</div>
                            </div>
                            <div className="text-right">
                               <div className="text-[9px] text-zinc-500 uppercase">Password</div>
                               <div className="text-xs font-black text-white">{actualTour.password}</div>
                            </div>
                          </div>`;

const newProfileRoom = `<div className="mt-2 pt-2 border-t border-zinc-800 flex justify-between items-center bg-zinc-950 p-2 rounded-lg">
                            <div>
                               <div className="text-[9px] text-zinc-500 uppercase">Room ID</div>
                               <div className="flex items-center space-x-2">
                                 <div className="text-xs font-black text-white">{actualTour.roomId}</div>
                                 <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigator.clipboard.writeText(actualTour.roomId); toast.success('Room ID copied!'); }} className="text-zinc-500 hover:text-white"><Copy className="w-3 h-3" /></button>
                               </div>
                            </div>
                            <div className="text-right">
                               <div className="text-[9px] text-zinc-500 uppercase">Password</div>
                               <div className="flex items-center space-x-2 justify-end">
                                 <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigator.clipboard.writeText(actualTour.password); toast.success('Password copied!'); }} className="text-zinc-500 hover:text-white"><Copy className="w-3 h-3" /></button>
                                 <div className="text-xs font-black text-white">{actualTour.password}</div>
                               </div>
                            </div>
                          </div>`;

profile = profile.replace(oldProfileRoom, newProfileRoom);
fs.writeFileSync('src/screens/Profile.tsx', profile);

// Home.tsx
let home = fs.readFileSync('src/screens/Home.tsx', 'utf-8');

if (!home.includes('Copy')) {
    home = home.replace(/import {([^}]+)} from 'lucide-react';/, (match, p1) => {
        return `import {${p1}, Copy} from 'lucide-react';`;
    });
}

const oldHomeRoom = `<div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-[9px] text-zinc-500 uppercase font-bold mb-1">Room ID</div>
                      <div className="text-sm font-mono font-bold text-white tracking-wider">{ (tournaments.find(t => t.id === showRulesModal.tournamentId) || showRulesModal).roomId || 'WAITING...' }</div>
                    </div>
                    <div>
                      <div className="text-[9px] text-zinc-500 uppercase font-bold mb-1">Password</div>
                      <div className="text-sm font-mono font-bold text-white tracking-wider">{ (tournaments.find(t => t.id === showRulesModal.tournamentId) || showRulesModal).password || 'WAITING...' }</div>
                    </div>
                  </div>`;

const newHomeRoom = `<div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-[9px] text-zinc-500 uppercase font-bold mb-1">Room ID</div>
                      <div className="flex items-center space-x-2">
                        <div className="text-sm font-mono font-bold text-white tracking-wider">{ (tournaments.find(t => t.id === showRulesModal.tournamentId) || showRulesModal).roomId || 'WAITING...' }</div>
                        { (tournaments.find(t => t.id === showRulesModal.tournamentId) || showRulesModal).roomId && (tournaments.find(t => t.id === showRulesModal.tournamentId) || showRulesModal).roomId !== 'WAITING...' && (
                          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigator.clipboard.writeText((tournaments.find(t => t.id === showRulesModal.tournamentId) || showRulesModal).roomId); toast.success('Room ID copied!'); }} className="text-zinc-500 hover:text-white"><Copy className="w-3 h-3" /></button>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] text-zinc-500 uppercase font-bold mb-1">Password</div>
                      <div className="flex items-center space-x-2">
                        <div className="text-sm font-mono font-bold text-white tracking-wider">{ (tournaments.find(t => t.id === showRulesModal.tournamentId) || showRulesModal).password || 'WAITING...' }</div>
                        { (tournaments.find(t => t.id === showRulesModal.tournamentId) || showRulesModal).password && (tournaments.find(t => t.id === showRulesModal.tournamentId) || showRulesModal).password !== 'WAITING...' && (
                          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigator.clipboard.writeText((tournaments.find(t => t.id === showRulesModal.tournamentId) || showRulesModal).password); toast.success('Password copied!'); }} className="text-zinc-500 hover:text-white"><Copy className="w-3 h-3" /></button>
                        )}
                      </div>
                    </div>
                  </div>`;

home = home.replace(oldHomeRoom, newHomeRoom);
fs.writeFileSync('src/screens/Home.tsx', home);

console.log("Updated both files");

const fs = require('fs');
let code = fs.readFileSync('src/screens/Home.tsx', 'utf8');

// Replace top-left tags
code = code.replace(
  /<div className="absolute top-3 left-3 flex flex-col space-y-1\.5">[\s\S]*?<\/div>\s*<div className={`absolute top-3 right-3/m,
  `<div className="absolute top-3 left-3 flex flex-col space-y-1.5">
                   {t.status === 'UPCOMING' && <MatchCountdown date={t.date} time={t.time} />}
                   {t.status === 'LIVE' && (
                     <div className="bg-red-600/80 backdrop-blur-md text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border border-red-500/20 flex items-center shadow-[0_0_10px_rgba(220,38,38,0.5)]">
                       <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse mr-1.5" />
                       STARTED
                     </div>
                   )}
                   {t.status === 'COMPLETED' && (
                     <div className="bg-zinc-900/80 backdrop-blur-md text-zinc-400 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border border-zinc-700/50 flex items-center">
                       COMPLETED
                     </div>
                   )}
                   <div className="bg-yellow-500 text-black text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg flex items-center">
                      <MapPin className="w-3 h-3 mr-1.5" />
                      {t.map}
                   </div>
                </div>

                <div className={\`absolute top-3 right-3`
);

// Add date and time below per kill row
const afterPerKill = `
                   <div className="bg-zinc-900/50 rounded-2xl p-2.5 border border-zinc-800/50">
                      <div className="text-[8px] text-zinc-500 font-black uppercase tracking-widest mb-1">Per Kill</div>
                      <div className="text-xs font-black text-white">PKR {t.perKill || 0}</div>
                   </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 mb-5">
                   <div className="bg-zinc-900/50 rounded-2xl p-2.5 border border-zinc-800/50 flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-yellow-500" />
                      <div>
                        <div className="text-[8px] text-zinc-500 font-black uppercase tracking-widest">Date</div>
                        <div className="text-[10px] font-black text-white">{t.date || 'TBA'}</div>
                      </div>
                   </div>
                   <div className="bg-zinc-900/50 rounded-2xl p-2.5 border border-zinc-800/50 flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-yellow-500" />
                      <div>
                        <div className="text-[8px] text-zinc-500 font-black uppercase tracking-widest">Time</div>
                        <div className="text-[10px] font-black text-white">{t.time || 'TBA'}</div>
                      </div>
                   </div>
                </div>
`;

code = code.replace(
  /<div className="bg-zinc-900\/50 rounded-2xl p-2\.5 border border-zinc-800\/50">\s*<div className="text-\[8px\] text-zinc-500 font-black uppercase tracking-widest mb-1">Per Kill<\/div>\s*<div className="text-xs font-black text-white">PKR \{t\.perKill \|\| 0\}<\/div>\s*<\/div>\s*<\/div>/m,
  afterPerKill
);

fs.writeFileSync('src/screens/Home.tsx', code);

const fs = require('fs');
let content = fs.readFileSync('src/screens/AdminDashboard.tsx', 'utf-8');

const createMapIndex = content.indexOf('<label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Map</label>');
if (createMapIndex > 0) {
  content = content.replace(
    '<div>\n                   <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Map</label>',
    `<div>
                   <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Total Slots</label>
                   <input required type="number" min="2" value={newMatch.spotsTotal} onChange={e => setNewMatch({...newMatch, spotsTotal: Number(e.target.value)})} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-yellow-500" />
                 </div>
                 <div>
                   <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Map</label>`
  );
}

const editMapIndex = content.indexOf('<label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Map</label>', createMapIndex + 10);
if (editMapIndex > 0) {
  content = content.replace(
    '<div>\n                   <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Map</label>',
    `<div>
                   <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Total Slots</label>
                   <input required type="number" min="2" value={editingMatch.spotsTotal} onChange={e => setEditingMatch({...editingMatch, spotsTotal: Number(e.target.value)})} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-yellow-500" />
                 </div>
                 <div>
                   <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Map</label>`
  );
}

fs.writeFileSync('src/screens/AdminDashboard.tsx', content);

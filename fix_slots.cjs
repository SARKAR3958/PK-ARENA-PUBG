const fs = require('fs');
let content = fs.readFileSync('src/screens/AdminDashboard.tsx', 'utf-8');

// Undo the mess
content = content.replace(
`<div>
                   <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Total Slots</label>
                   <input required type="number" min="2" value={newMatch.spotsTotal} onChange={e => setNewMatch({...newMatch, spotsTotal: Number(e.target.value)})} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-yellow-500" />
                 </div>
                 <div>
                   <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Total Slots</label>
                   <input required type="number" min="2" value={editingMatch.spotsTotal} onChange={e => setEditingMatch({...editingMatch, spotsTotal: Number(e.target.value)})} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-yellow-500" />
                 </div>
                 <div>
                   <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Map</label>`,
`<div>
                   <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Total Slots</label>
                   <input required type="number" min="2" value={newMatch.spotsTotal} onChange={e => setNewMatch({...newMatch, spotsTotal: Number(e.target.value)})} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-yellow-500" />
                 </div>
                 <div>
                   <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Map</label>`
);

// Now apply to edit match form.
// I will just locate the exact string in edit match form.
const editMapLabel = '<div>\n                   <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Map</label>\n                   <input required type="text" value={editingMatch.map}';

if(content.includes(editMapLabel)) {
   content = content.replace(editMapLabel, 
`<div>
                   <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Total Slots</label>
                   <input required type="number" min="2" value={editingMatch.spotsTotal} onChange={e => setEditingMatch({...editingMatch, spotsTotal: Number(e.target.value)})} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-yellow-500" />
                 </div>
                 ${editMapLabel}`);
}

fs.writeFileSync('src/screens/AdminDashboard.tsx', content);

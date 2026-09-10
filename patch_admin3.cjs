const fs = require('fs');
let code = fs.readFileSync('src/screens/AdminDashboard.tsx', 'utf8');

code = code.replace(
  /<input type="number" defaultValue="50" className="bg-zinc-900 border border-zinc-800 text-white px-3 py-1\.5 rounded w-full md:w-24 text-sm" \/>/g,
  `<input type="number" value={settings?.referrerBonus || 50} onChange={(e) => setSettings({...settings, referrerBonus: parseInt(e.target.value)})} className="bg-zinc-900 border border-zinc-800 text-white px-3 py-1.5 rounded w-full md:w-24 text-sm" />`
);

code = code.replace(
  /<input type="number" defaultValue="25" className="bg-zinc-900 border border-zinc-800 text-white px-3 py-1\.5 rounded w-full md:w-24 text-sm" \/>/g,
  `<input type="number" value={settings?.refereeBonus || 25} onChange={(e) => setSettings({...settings, refereeBonus: parseInt(e.target.value)})} className="bg-zinc-900 border border-zinc-800 text-white px-3 py-1.5 rounded w-full md:w-24 text-sm" />`
);

code = code.replace(
  /<button className="bg-yellow-500 text-black px-6 py-2 rounded-xl font-bold text-xs uppercase tracking-widest w-full">Save Settings<\/button>/g,
  `<button onClick={async () => { await update(ref(db, 'appSettings'), { referrerBonus: settings?.referrerBonus || 50, refereeBonus: settings?.refereeBonus || 25 }); toast.success('Referral settings saved'); }} className="bg-yellow-500 text-black px-6 py-2 rounded-xl font-bold text-xs uppercase tracking-widest w-full">Save Settings</button>`
);

fs.writeFileSync('src/screens/AdminDashboard.tsx', code);

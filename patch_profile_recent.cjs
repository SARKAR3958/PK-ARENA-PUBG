const fs = require('fs');
let code = fs.readFileSync('src/screens/Profile.tsx', 'utf8');

code = code.replace(
  /<h4 className="text-xs font-bold text-white mb-2 uppercase border-b border-zinc-800 pb-1">Recent Activity<\/h4>\s*<div className="space-y-2">\s*\{\[\s*\{ user: 'AliGamer', status: 'ADDED', date: '10 May 2025' \},\s*\{ user: 'Sniper007', status: 'PENDING', date: '09 May 2025' \}\s*\]\.map\(\(act, i\) => \(\s*<div key=\{i\} className="flex justify-between items-center bg-zinc-900 border border-zinc-800 rounded-lg p-2">\s*<div>\s*<div className="text-\[11px\] font-bold text-white">\{act\.user\}<\/div>\s*<div className="text-\[9px\] text-zinc-500">\{act\.date\}<\/div>\s*<\/div>\s*<div className=\{`text-\[9px\] font-bold px-2 py-0\.5 rounded \$\{act\.status === 'ADDED' \? 'bg-green-500\/20 text-green-500' : 'bg-yellow-500\/20 text-yellow-500'\}`\}>\s*\{act\.status\}\s*<\/div>\s*<\/div>\s*\)\)\}\s*<\/div>/,
  `<h4 className="text-xs font-bold text-white mb-2 uppercase border-b border-zinc-800 pb-1">Recent Activity</h4>
                  <div className="space-y-2">
                    <div className="text-center py-4 text-[10px] text-zinc-500 uppercase tracking-widest">
                       No recent activity yet
                    </div>
                  </div>`
);

fs.writeFileSync('src/screens/Profile.tsx', code);

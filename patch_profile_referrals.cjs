const fs = require('fs');
let code = fs.readFileSync('src/screens/Profile.tsx', 'utf8');

const recentActivityReplacement = `
                  <h4 className="text-xs font-bold text-white mb-2 uppercase border-b border-zinc-800 pb-1">Recent Activity</h4>
                  <div className="space-y-2">
                    {currentUser?.referralActivity && Object.keys(currentUser.referralActivity).length > 0 ? (
                      Object.values(currentUser.referralActivity).reverse().map((act: any, i) => (
                        <div key={i} className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-lg p-2">
                          <div className="flex items-center">
                            <div className="w-6 h-6 bg-zinc-800 rounded-full flex items-center justify-center mr-2">
                              <User className="w-3 h-3 text-zinc-400" />
                            </div>
                            <div>
                              <div className="text-[10px] font-bold text-white">{act.user}</div>
                              <div className="text-[8px] text-zinc-500">{act.date}</div>
                            </div>
                          </div>
                          <div className="flex items-center">
                            {act.status === 'PAID' ? (
                              <span className="text-[9px] font-bold text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded flex items-center">+{act.reward} Coins</span>
                            ) : (
                              <span className="text-[9px] font-bold text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded flex items-center">Pending</span>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4">
                        <div className="text-[10px] text-zinc-500">No recent referrals</div>
                      </div>
                    )}
                  </div>
`;

code = code.replace(
  /<h4 className="text-xs font-bold text-white mb-2 uppercase border-b border-zinc-800 pb-1">Recent Activity<\/h4>[\s\S]*?<div className="text-center py-4">\s*<div className="text-\[10px\] text-zinc-500">No recent referrals<\/div>\s*<\/div>\s*<\/div>/,
  recentActivityReplacement.trim()
);

fs.writeFileSync('src/screens/Profile.tsx', code);

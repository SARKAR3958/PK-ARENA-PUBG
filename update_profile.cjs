const fs = require('fs');
let content = fs.readFileSync('src/screens/Profile.tsx', 'utf-8');

content = content.replace(
  'const { joinedMatches, achievements, claimAchievement, referralStats, currentUser, logout, updateUserProfile } = useApp();',
  'const { joinedMatches, achievements, claimAchievement, referralStats, currentUser, logout, updateUserProfile, tournaments } = useApp();'
);

const oldUpcoming = `                  joinedMatches.filter(m => m.status === 'UPCOMING').map((tour, i) => (
                    <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex flex-col group hover:border-yellow-500/30 transition-colors">
                      <div className="text-xs font-bold text-white mb-2">{tour.title}</div>
                      <div className="flex items-center justify-between text-[10px] text-zinc-400">
                        <div className="flex items-center"><Clock className="w-3 h-3 mr-1" /> {tour.date}</div>
                        <div className="text-yellow-500 font-bold bg-yellow-500/10 px-2 py-1 rounded">JOINED</div>
                      </div>
                    </div>
                  ))`;

const newUpcoming = `                  joinedMatches.filter(m => m.status === 'UPCOMING').map((tour, i) => {
                    const actualTour = tournaments.find(t => t.id === tour.tournamentId) || tour;
                    return (
                      <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex flex-col group hover:border-yellow-500/30 transition-colors">
                        <div className="text-xs font-bold text-white mb-2">{tour.title}</div>
                        <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-2">
                          <div className="flex items-center"><Clock className="w-3 h-3 mr-1" /> {actualTour.date} {actualTour.time}</div>
                          <div className="text-yellow-500 font-bold bg-yellow-500/10 px-2 py-1 rounded">JOINED</div>
                        </div>
                        {actualTour.roomId && actualTour.roomId !== 'WAITING...' && (
                          <div className="mt-2 pt-2 border-t border-zinc-800 flex justify-between items-center bg-zinc-950 p-2 rounded-lg">
                            <div>
                               <div className="text-[9px] text-zinc-500 uppercase">Room ID</div>
                               <div className="text-xs font-black text-white">{actualTour.roomId}</div>
                            </div>
                            <div className="text-right">
                               <div className="text-[9px] text-zinc-500 uppercase">Password</div>
                               <div className="text-xs font-black text-white">{actualTour.password}</div>
                            </div>
                          </div>
                        )}
                        {(!actualTour.roomId || actualTour.roomId === 'WAITING...') && (
                          <div className="mt-2 pt-2 border-t border-zinc-800 text-center">
                            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Room Details Pending</div>
                          </div>
                        )}
                      </div>
                    );
                  })`;

content = content.replace(oldUpcoming, newUpcoming);
fs.writeFileSync('src/screens/Profile.tsx', content);

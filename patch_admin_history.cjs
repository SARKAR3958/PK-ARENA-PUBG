const fs = require("fs");
let content = fs.readFileSync("src/screens/AdminDashboard.tsx", "utf8");

// 1. Add state for notification history
content = content.replace(
  "const [tournaments, setTournaments] = useState<Tournament[]>([]);",
  "const [tournaments, setTournaments] = useState<Tournament[]>([]);\n  const [notificationHistory, setNotificationHistory] = useState<any[]>([]);"
);

// 2. Fetch notification history
content = content.replace(
  "const usersRef = ref(db, 'users');",
  "const historyRef = ref(db, 'adminNotificationHistory');\n    onValue(historyRef, (snapshot) => {\n      const data = snapshot.val();\n      if (data) {\n        const history = Object.keys(data).map(key => ({ id: key, ...data[key] }));\n        setNotificationHistory(history.sort((a, b) => b.createdAt - a.createdAt));\n      } else {\n        setNotificationHistory([]);\n      }\n    });\n\n    const usersRef = ref(db, 'users');"
);

// 3. Clear Notifications function
content = content.replace(
  "const handleSendPushNotification = async (e: React.FormEvent) => {",
  `const handleClearAllNotifications = async () => {
    if (window.confirm("Are you sure you want to clear all user notifications instantly? This cannot be undone.")) {
      try {
        await remove(ref(db, 'notifications'));
        await remove(ref(db, 'userNotifications'));
        toast.success("All notifications deleted for all users!");
      } catch (err) {
        toast.error("Failed to delete notifications");
      }
    }
  };

  const handleSendPushNotification = async (e: React.FormEvent) => {`
);

// 4. Update Notifications Tab UI
const oldUi = `<div className="max-w-2xl bg-zinc-950 p-6 rounded-xl border border-zinc-800">
            <form onSubmit={handleSendPushNotification} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Notification Title</label>
                <input 
                  type="text" 
                  value={notificationTitle}
                  onChange={(e) => setNotificationTitle(e.target.value)}
                  placeholder="e.g. Special Weekend Event!" 
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-yellow-500" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Message</label>
                <textarea 
                  value={notificationMessage}
                  onChange={(e) => setNotificationMessage(e.target.value)}
                  placeholder="Write your notification message here..." 
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white h-32 focus:outline-none focus:border-yellow-500 resize-none" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Target URL (Optional)</label>
                <input 
                  type="text" 
                  value={notificationUrl}
                  onChange={(e) => setNotificationUrl(e.target.value)}
                  placeholder="e.g. https://example.com/event" 
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-yellow-500" 
                />
              </div>
              <button 
                type="submit" 
                disabled={isSendingNotification}
                className={\`w-full bg-yellow-500 text-black font-black uppercase tracking-widest py-3 rounded-lg transition-colors \${isSendingNotification ? 'opacity-50 cursor-not-allowed' : 'hover:bg-yellow-400'}\`}
              >
                {isSendingNotification ? 'Sending...' : 'Send Notification Now'}
              </button>
            </form>
          </div>`;

const newUi = `<div className="flex flex-col lg:flex-row gap-6">
              <div className="w-full lg:w-1/2">
                <div className="bg-zinc-950 p-6 rounded-xl border border-zinc-800 mb-6">
                  <form onSubmit={handleSendPushNotification} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Notification Title</label>
                      <input 
                        type="text" 
                        value={notificationTitle}
                        onChange={(e) => setNotificationTitle(e.target.value)}
                        placeholder="e.g. Special Weekend Event!" 
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-yellow-500" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Message</label>
                      <textarea 
                        value={notificationMessage}
                        onChange={(e) => setNotificationMessage(e.target.value)}
                        placeholder="Write your notification message here..." 
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white h-32 focus:outline-none focus:border-yellow-500 resize-none" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Target URL (Optional)</label>
                      <input 
                        type="text" 
                        value={notificationUrl}
                        onChange={(e) => setNotificationUrl(e.target.value)}
                        placeholder="e.g. https://example.com/event" 
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-yellow-500" 
                      />
                    </div>
                    <button 
                      type="submit" 
                      disabled={isSendingNotification}
                      className={\`w-full bg-yellow-500 text-black font-black uppercase tracking-widest py-3 rounded-lg transition-colors \${isSendingNotification ? 'opacity-50 cursor-not-allowed' : 'hover:bg-yellow-400'}\`}
                    >
                      {isSendingNotification ? 'Sending...' : 'Send Notification Now'}
                    </button>
                  </form>
                </div>

                <div className="bg-red-500/10 p-6 rounded-xl border border-red-500/20">
                  <h3 className="text-sm font-bold text-red-500 uppercase tracking-wider mb-2">Danger Zone</h3>
                  <p className="text-xs text-zinc-400 mb-4">Clear all currently active notifications for all users. They will instantly disappear from user inboxes.</p>
                  <button onClick={handleClearAllNotifications} className="w-full bg-red-600/20 text-red-500 hover:bg-red-600/30 border border-red-500/50 font-black uppercase tracking-widest py-3 rounded-lg transition-colors">
                    CLEAR ALL NOTIFICATIONS
                  </button>
                </div>
              </div>

              <div className="w-full lg:w-1/2">
                <div className="bg-zinc-950 p-6 rounded-xl border border-zinc-800 h-[600px] flex flex-col">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Notification History</h3>
                  <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                    {notificationHistory.length === 0 ? (
                       <div className="text-center text-zinc-500 text-sm py-10">No notifications sent yet.</div>
                    ) : (
                       notificationHistory.map((notif: any) => (
                         <div key={notif.id} className="bg-zinc-900 p-4 rounded-xl border border-zinc-800/50 flex flex-col">
                           <div className="flex justify-between items-start mb-2">
                             <div className="font-bold text-sm text-yellow-500">{notif.title}</div>
                             <div className={\`text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-widest \${notif.type === 'AUTO' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'}\`}>
                               {notif.type || 'MANUAL'}
                             </div>
                           </div>
                           <div className="text-xs text-zinc-300 mb-3">{notif.message}</div>
                           <div className="flex justify-between items-center text-[10px] text-zinc-600 mt-auto">
                             <div>{notif.url ? 'Has URL' : 'No URL'}</div>
                             <div>{new Date(notif.createdAt).toLocaleString()}</div>
                           </div>
                         </div>
                       ))
                    )}
                  </div>
                </div>
              </div>
          </div>`;

content = content.replace(oldUi, newUi);

fs.writeFileSync("src/screens/AdminDashboard.tsx", content);

const fs = require('fs');
let code = fs.readFileSync('src/components/TopBar.tsx', 'utf8');

code = code.replace(
  /export function TopBar\(\{ showBack = false \}: \{ showBack\?: boolean \}\) \{/g,
  `import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { ref, onValue } from 'firebase/database';
import { motion, AnimatePresence } from 'motion/react';
import { X, Clock } from 'lucide-react';

export function TopBar({ showBack = false }: { showBack?: boolean }) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const notifRef = ref(db, 'notifications');
    const unsub = onValue(notifRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.values(data).sort((a: any, b: any) => b.createdAt - a.createdAt);
        setNotifications(list);
      }
    });
    return () => unsub();
  }, []);
`
);

code = code.replace(
  /<button className="relative text-zinc-400 hover:text-white transition-colors p-1">/g,
  `<button onClick={() => setShowNotifications(true)} className="relative text-zinc-400 hover:text-white transition-colors p-1">`
);

code = code.replace(
  /<\/div>\s*<\/div>\s*\);\s*\}/g,
  `      </div>

      <AnimatePresence>
        {showNotifications && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-sm overflow-hidden flex flex-col max-h-[80vh] shadow-2xl"
            >
              <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
                <h3 className="text-sm font-black text-white flex items-center uppercase tracking-widest"><Bell className="w-4 h-4 mr-2 text-yellow-500" /> Notifications</h3>
                <button onClick={() => setShowNotifications(false)} className="text-zinc-400 hover:text-white p-1 rounded-full hover:bg-zinc-800"><X className="w-4 h-4" /></button>
              </div>
              <div className="overflow-y-auto p-4 space-y-3">
                {notifications.length > 0 ? (
                  notifications.map((n, i) => (
                    <div key={i} className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-4">
                      <div className="text-xs font-bold text-white mb-1.5">{n.title}</div>
                      <div className="text-[10px] text-zinc-400 leading-relaxed mb-3">{n.message}</div>
                      <div className="flex items-center text-[9px] font-bold text-zinc-500 uppercase tracking-widest"><Clock className="w-3 h-3 mr-1" /> {new Date(n.createdAt).toLocaleString()}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10">
                    <Bell className="w-10 h-10 text-zinc-800 mx-auto mb-3" />
                    <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest">No Notifications</div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}`
);

fs.writeFileSync('src/components/TopBar.tsx', code);

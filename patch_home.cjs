const fs = require('fs');
let code = fs.readFileSync('src/screens/Home.tsx', 'utf8');

// Banner logic: remove the timeout and make banners fetch faster if we could, but banners fetch already happens in useEffect.
// Actually, let's remove AnimatePresence initial={{ opacity: 0 }} so it shows immediately.
code = code.replace(
  /initial=\{\{ opacity: 0, x: 20 \}\}/,
  `initial={{ opacity: 1, x: 0 }}`
);

const countdownComponent = `
function MatchCountdown({ date, time }: { date?: string, time: string }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!date || !time) return;
    const update = () => {
      const matchTime = new Date(\`\${date}T\${time}\`).getTime();
      const diff = matchTime - Date.now();
      if (diff <= 0) {
        setTimeLeft('STARTED');
      } else {
        const d = Math.floor(diff / (1000 * 60 * 60 * 24));
        const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(\`\${d > 0 ? d + 'd ' : ''}\${h}h \${m}m \${s}s\`);
      }
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [date, time]);

  if (!date || !timeLeft) return null;
  return (
    <div className="bg-zinc-950/80 backdrop-blur-md text-yellow-500 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border border-yellow-500/20 flex items-center">
      <Clock className="w-3 h-3 mr-1.5" />
      {timeLeft}
    </div>
  );
}

export function Home() {
`;

code = code.replace(/export function Home\(\) \{/, countdownComponent);

code = code.replace(
  /<Clock className="w-3 h-3 mr-1\.5 text-yellow-500" \/>\s*\{t\.time\}\s*<\/div>/,
  `$&
                   {t.date && (
                     <div className="bg-black/60 backdrop-blur-md text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border border-white/10 flex items-center mt-1.5">
                        <Calendar className="w-3 h-3 mr-1.5 text-yellow-500" />
                        {t.date}
                     </div>
                   )}
                   {t.status === 'UPCOMING' && <MatchCountdown date={t.date} time={t.time} />}`
);


fs.writeFileSync('src/screens/Home.tsx', code);

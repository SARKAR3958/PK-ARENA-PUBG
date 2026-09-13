const fs = require("fs");
const path = "src/context/AppContext.tsx";
let content = fs.readFileSync(path, "utf8");

const effectCode = `
  useEffect(() => {
    const checkAutoTasks = async () => {
      const now = new Date();
      const dateString = now.toLocaleDateString('en-GB'); 
      const hour = now.getHours();

      try {
        const resetRef = ref(db, 'systemSettings/lastDailyReset');
        const resetSnap = await get(resetRef);
        const lastReset = resetSnap.val();

        if (lastReset !== dateString) {
           await remove(ref(db, 'notifications'));
           await remove(ref(db, 'userNotifications'));
           await set(ref(db, 'systemSettings/lastDailyReset'), dateString);
           console.log('Daily notification reset complete');
        }

        const targetHours = [12, 15, 18, 21];
        if (targetHours.includes(hour) && appSettings?.onesignalAppId && appSettings?.onesignalRestApiKey) {
          const pushKey = \`\${dateString}-\${hour}\`;
          const pushRef = ref(db, 'systemSettings/lastAutoPush');
          const pushSnap = await get(pushRef);
          
          if (pushSnap.val() !== pushKey) {
             await set(ref(db, 'systemSettings/lastAutoPush'), pushKey);
             
             const templates = [
               { title: '💎 Come Back & Play!', message: 'Your next reward could be waiting.' },
               { title: '🏆 Your Next Victory Awaits!', message: 'Open the app and start playing.' },
               { title: '🔥 PK ARENA PUBG', message: 'Don\\'t miss today\\'s exciting matches!' },
               { title: '🎮 Hey Gamer!', message: 'Your battles are waiting. Come back and play!' }
             ];
             const randomPush = templates[Math.floor(Math.random() * templates.length)];

             fetch('/api/send-notification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  appId: appSettings.onesignalAppId,
                  restApiKey: appSettings.onesignalRestApiKey,
                  title: randomPush.title,
                  message: randomPush.message,
                  url: ''
                }),
              }).then(() => {
                 push(ref(db, 'adminNotificationHistory'), {
                   title: randomPush.title,
                   message: randomPush.message,
                   type: 'AUTO',
                   createdAt: Date.now()
                 });
              }).catch(console.error);
          }
        }
      } catch (err) {
        console.error("Auto task error", err);
      }
    };

    const interval = setInterval(checkAutoTasks, 60 * 1000); 
    checkAutoTasks(); 

    return () => clearInterval(interval);
  }, [appSettings?.onesignalAppId, appSettings?.onesignalRestApiKey]);

  return (`;

content = content.replace("  return (", effectCode);
fs.writeFileSync(path, content);

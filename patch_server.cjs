const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

if (!content.includes('node-cron')) {
  // Add imports
  content = content.replace(
    'import axios from "axios";',
    'import axios from "axios";\nimport cron from "node-cron";'
  );

  // Define cron logic
  const cronLogic = `
  // Setup Auto Notifications
  const sendScheduledPush = async (hour) => {
    try {
      const dbRes = await axios.get("https://pak-arena-new-default-rtdb.firebaseio.com/appSettings.json");
      const appSettings = dbRes.data;
      if (!appSettings || !appSettings.onesignalAppId || !appSettings.onesignalRestApiKey) {
        console.log("Missing OneSignal config for auto push");
        return;
      }
      
      const templates = [
        { title: "💎 Come Back & Play!", message: "Your next reward could be waiting." },
        { title: "🏆 Your Next Victory Awaits!", message: "Open the app and start playing." },
        { title: "🔥 PK ARENA PUBG", message: "Don't miss today's exciting matches!" },
        { title: "🎮 Hey Gamer!", message: "Your battles are waiting. Come back and play!" }
      ];
      const randomPush = templates[Math.floor(Math.random() * templates.length)];

      const payload = {
        app_id: appSettings.onesignalAppId,
        headings: { en: randomPush.title },
        contents: { en: randomPush.message },
        included_segments: ["All"],
      };

      const response = await axios.post(
        "https://onesignal.com/api/v1/notifications",
        payload,
        {
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            Authorization: \`Basic \${appSettings.onesignalRestApiKey}\`,
          },
        }
      );
      
      // Also try to log to adminNotificationHistory via Firebase REST API
      await axios.post("https://pak-arena-new-default-rtdb.firebaseio.com/adminNotificationHistory.json", {
        title: randomPush.title,
        message: randomPush.message,
        type: "AUTO",
        target: "ALL",
        createdAt: Date.now()
      });

      console.log(\`Successfully sent auto notification for \${hour} PM PKT\`, response.data);
    } catch (error) {
      console.error("Scheduled push error:", error.response?.data || error.message);
    }
  };

  // Schedule for 12 PM PKT (Asia/Karachi)
  cron.schedule("0 12 * * *", () => sendScheduledPush(12), { timezone: "Asia/Karachi" });
  
  // Schedule for 3 PM (15:00) PKT
  cron.schedule("0 15 * * *", () => sendScheduledPush(3), { timezone: "Asia/Karachi" });
  
  // Schedule for 6 PM (18:00) PKT
  cron.schedule("0 18 * * *", () => sendScheduledPush(6), { timezone: "Asia/Karachi" });
  
  // Schedule for 9 PM (21:00) PKT
  cron.schedule("0 21 * * *", () => sendScheduledPush(9), { timezone: "Asia/Karachi" });
  
`;

  // Inject before app.listen
  const listenIndex = content.indexOf('app.listen(PORT');
  if (listenIndex !== -1) {
    content = content.slice(0, listenIndex) + cronLogic + content.slice(listenIndex);
    fs.writeFileSync('server.ts', content);
    console.log('Successfully patched server.ts with node-cron');
  } else {
    console.log('Failed to find app.listen in server.ts');
  }
} else {
  console.log('node-cron already exists in server.ts');
}

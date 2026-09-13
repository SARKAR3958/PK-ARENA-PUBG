const fs = require("fs");
let content = fs.readFileSync("src/screens/AdminDashboard.tsx", "utf8");

content = content.replace(
`        await push(ref(db, 'notifications'), {
          title: notificationTitle,
          message: notificationMessage,
          url: notificationUrl || '',
          createdAt: Date.now()
        });`,
`        await push(ref(db, 'notifications'), {
          title: notificationTitle,
          message: notificationMessage,
          url: notificationUrl || '',
          createdAt: Date.now()
        });
        await push(ref(db, 'adminNotificationHistory'), {
          title: notificationTitle,
          message: notificationMessage,
          url: notificationUrl || '',
          type: 'MANUAL',
          createdAt: Date.now()
        });`);

fs.writeFileSync("src/screens/AdminDashboard.tsx", content);

const fs = require('fs');
let code = fs.readFileSync('src/screens/AdminDashboard.tsx', 'utf8');

code = code.replace(
  /const data = await response\.json\(\);\s*if \(data\.success\) \{/g,
  `const data = await response.json();
      if (data.success) {
        await push(ref(db, 'notifications'), {
          title: notificationTitle,
          message: notificationMessage,
          url: notificationUrl || '',
          createdAt: Date.now()
        });`
);

fs.writeFileSync('src/screens/AdminDashboard.tsx', code);

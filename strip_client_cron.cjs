const fs = require('fs');
let content = fs.readFileSync('src/context/AppContext.tsx', 'utf8');

// Replace the client cron execution with just nothing
content = content.replace(
  'const interval = setInterval(checkAutoTasks, 60 * 1000);',
  '// const interval = setInterval(checkAutoTasks, 60 * 1000);'
);
content = content.replace(
  'checkAutoTasks();',
  '// checkAutoTasks();'
);
content = content.replace(
  'return () => clearInterval(interval);',
  'return () => {};'
);

fs.writeFileSync('src/context/AppContext.tsx', content);
console.log('stripped client cron');

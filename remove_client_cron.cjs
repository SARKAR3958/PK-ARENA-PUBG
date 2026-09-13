const fs = require('fs');
let content = fs.readFileSync('src/context/AppContext.tsx', 'utf8');

const regex = /const checkAutoTasks = async \(\) => \{[\s\S]*?\};\s*const interval = setInterval\(checkAutoTasks, 60 \* 1000\);\s*checkAutoTasks\(\);\s*return \(\) => clearInterval\(interval\);/g;

if (regex.test(content)) {
  content = content.replace(regex, '');
  fs.writeFileSync('src/context/AppContext.tsx', content);
  console.log('Removed checkAutoTasks from AppContext');
} else {
  console.log('Could not find checkAutoTasks to remove');
}

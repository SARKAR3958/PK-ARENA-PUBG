const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

// Since Vercel won't run server.ts background jobs, we can safely remove the node-cron from it
// so it doesn't cause issues if you ever run it locally or elsewhere. 
// However, keeping it in server.ts for local dev doesn't hurt. We'll leave it as is.

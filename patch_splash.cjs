const fs = require('fs');
let code = fs.readFileSync('src/components/SplashScreen.tsx', 'utf8');

code = code.replace(
  />\s*PK TOURNAMENT\s*<\/motion\.h1>/,
  `>
              PK ARENA
            </motion.h1>`
);

fs.writeFileSync('src/components/SplashScreen.tsx', code);

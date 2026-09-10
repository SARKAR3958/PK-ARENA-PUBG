const fs = require('fs');
let code = fs.readFileSync('src/screens/Home.tsx', 'utf8');

code = code.replace(
  /<AnimatePresence mode="wait">\s*<motion\.img[\s\S]*?alt="Battle Banner"\s*\/>\s*<\/AnimatePresence>/,
  `
            <motion.img 
              key={banners[currentBannerIndex]?.id || currentBannerIndex}
              src={banners[currentBannerIndex]?.imageUrl} 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="w-full h-full object-cover absolute inset-0"
              alt="Battle Banner"
            />
`
);

fs.writeFileSync('src/screens/Home.tsx', code);

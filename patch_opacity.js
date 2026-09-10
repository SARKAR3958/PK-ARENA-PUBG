const fs = require('fs');
let code = fs.readFileSync('src/components/GoldenParticlesBg.tsx', 'utf-8');

code = code.replace(/p\.opacity \* opacityMultiplier/g, 'Math.min(1, p.opacity * opacityMultiplier)');
code = code.replace(/0\.4 \* opacityMultiplier/g, 'Math.min(1, 0.4 * opacityMultiplier)');
code = code.replace(/0\.5 \* opacityMultiplier/g, 'Math.min(1, 0.5 * opacityMultiplier)');

fs.writeFileSync('src/components/GoldenParticlesBg.tsx', code);

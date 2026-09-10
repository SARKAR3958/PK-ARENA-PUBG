const fs = require('fs');
let code = fs.readFileSync('src/components/GoldenParticlesBg.tsx', 'utf-8');

code = code.replace(/let size = Math\.random\(\) \* 2 \+ 1;/g, `let baseScale = particleType === 'circle' ? 1 : (particleType === 'snow' ? 4 : (particleType === 'star' ? 3 : 3));
        let size = (Math.random() * 2 + 1) * baseScale;`);

// Increase overall opacity
code = code.replace(/const opacityMultiplier = \(appSettings\?\.backgroundParticleOpacity \?\? 80\) \/ 100;/g, `const opacityMultiplier = ((appSettings?.backgroundParticleOpacity ?? 80) / 100) * 1.5;`);

fs.writeFileSync('src/components/GoldenParticlesBg.tsx', code);

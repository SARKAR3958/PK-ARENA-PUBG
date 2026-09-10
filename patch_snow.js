const fs = require('fs');
let code = fs.readFileSync('src/components/GoldenParticlesBg.tsx', 'utf-8');

const snowDrawCode = `          } else if (p.particleType === 'snow') {
             ctx.font = \`\${p.size * 3}px Arial\`;
             ctx.textAlign = 'center';
             ctx.textBaseline = 'middle';
             ctx.fillStyle = \`rgba(\${rgb.r}, \${rgb.g}, \${rgb.b}, \${Math.min(1, p.opacity * opacityMultiplier * 1.5)})\`;
             ctx.shadowBlur = p.glow;
             ctx.shadowColor = \`rgba(\${rgb.r}, \${rgb.g}, \${rgb.b}, \${Math.min(1, 0.4 * opacityMultiplier)})\`;
             ctx.fillText('❄️', p.x, p.y);
`;

code = code.replace(/          \} else if \(p\.particleType === 'snow'\) \{[\s\S]*?ctx\.stroke\(\);/, snowDrawCode.trim());

fs.writeFileSync('src/components/GoldenParticlesBg.tsx', code);

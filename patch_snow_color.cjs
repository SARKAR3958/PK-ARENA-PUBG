const fs = require('fs');
let code = fs.readFileSync('src/components/GoldenParticlesBg.tsx', 'utf-8');

const snowDrawCode = `          } else if (p.particleType === 'snow') {
             const numBranches = 6;
             ctx.beginPath();
             for (let i = 0; i < numBranches; i++) {
                 const angle = (i * Math.PI * 2) / numBranches;
                 const endX = p.x + Math.cos(angle) * p.size;
                 const endY = p.y + Math.sin(angle) * p.size;
                 ctx.moveTo(p.x, p.y);
                 ctx.lineTo(endX, endY);
                 
                 const forkDist = p.size * 0.6;
                 const forkX = p.x + Math.cos(angle) * forkDist;
                 const forkY = p.y + Math.sin(angle) * forkDist;
                 const forkAngle = Math.PI / 4;
                 const forkSize = p.size * 0.4;
                 
                 ctx.moveTo(forkX, forkY);
                 ctx.lineTo(forkX + Math.cos(angle + forkAngle) * forkSize, forkY + Math.sin(angle + forkAngle) * forkSize);
                 ctx.moveTo(forkX, forkY);
                 ctx.lineTo(forkX + Math.cos(angle - forkAngle) * forkSize, forkY + Math.sin(angle - forkAngle) * forkSize);
             }
             ctx.strokeStyle = \\\`rgba(\\\${rgb.r}, \\\${rgb.g}, \\\${rgb.b}, \\\${Math.min(1, p.opacity * opacityMultiplier * 2.0)})\\\`;
             ctx.lineWidth = 1.5;
             ctx.shadowBlur = p.glow;
             ctx.shadowColor = \\\`rgba(\\\${rgb.r}, \\\${rgb.g}, \\\${rgb.b}, \\\${Math.min(1, 0.4 * opacityMultiplier)})\\\`;
             ctx.stroke();
`;

code = code.replace(/          \} else if \(p\.particleType === 'snow'\) \{[\s\S]*?ctx\.fillText\('❄️', p\.x, p\.y\);/, snowDrawCode.trim());

fs.writeFileSync('src/components/GoldenParticlesBg.tsx', code);

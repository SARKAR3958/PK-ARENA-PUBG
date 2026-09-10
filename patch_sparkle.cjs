const fs = require('fs');
let code = fs.readFileSync('src/components/GoldenParticlesBg.tsx', 'utf-8');

// Fix the size
code = code.replace(
  /const baseScale = particleType === 'circle' \? 1 : \(particleType === 'snow' \? 2\.5 : \(particleType === 'star' \? 3 : 3\)\);/,
  "const baseScale = 1.8;"
);

// Fix the sparkle
const sparkleCode = `} else if (p.particleType === 'sparkle') {
             // Draw ✨ (Sparkles)
             const drawSingleSparkle = (cx, cy, s) => {
                 ctx.moveTo(cx, cy - s);
                 ctx.quadraticCurveTo(cx, cy, cx + s, cy);
                 ctx.quadraticCurveTo(cx, cy, cx, cy + s);
                 ctx.quadraticCurveTo(cx, cy, cx - s, cy);
                 ctx.quadraticCurveTo(cx, cy, cx, cy - s);
             };
             drawSingleSparkle(p.x, p.y, p.size * 1.5);
             drawSingleSparkle(p.x + p.size * 1.2, p.y - p.size * 1.2, p.size * 0.7);
             drawSingleSparkle(p.x - p.size * 1.0, p.y + p.size * 0.8, p.size * 0.5);
             
             ctx.fillStyle = \\\`rgba(\\\${rgb.r}, \\\${rgb.g}, \\\${rgb.b}, \\\${Math.min(1, p.opacity * opacityMultiplier * 2.0)})\\\`;
             ctx.shadowBlur = p.glow;
             ctx.shadowColor = \\\`rgba(\\\${rgb.r}, \\\${rgb.g}, \\\${rgb.b}, \\\${Math.min(1, 0.4 * opacityMultiplier)})\\\`;
             ctx.fill();`;

const oldSparkleRegex = /\} else if \(p\.particleType === 'sparkle'\) \{[\s\S]*?ctx\.stroke\(\);/;
code = code.replace(oldSparkleRegex, sparkleCode.trim());

fs.writeFileSync('src/components/GoldenParticlesBg.tsx', code);

const fs = require('fs');
let code = fs.readFileSync('src/components/OnboardingModal.tsx', 'utf8');

code = code.replace(
  /phoneNumber: ''/,
  `phoneNumber: '',\n    referralCode: ''`
);

code = code.replace(
  /const profileData = \{\s*inGameName: formData\.inGameName,\s*gameUid: formData\.gameUid,\s*phone: \`\+92\$\{formData\.phoneNumber\}\`,\s*isProfileComplete: true\s*\};/,
  `const profileData = {
        inGameName: formData.inGameName,
        gameUid: formData.gameUid,
        phone: \`+92\${formData.phoneNumber}\`,
        isProfileComplete: true,
        referredBy: formData.referralCode
      };`
);

code = code.replace(
  /<div className="relative">[\s\S]*?<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">[\s\S]*?<span className="text-\[10px\] font-bold text-zinc-500">\+92<\/span>[\s\S]*?<\/div>[\s\S]*?<input [\s\S]*?placeholder="3XXXXXXXXX \(10 Digits\)" [\s\S]*?\/>[\s\S]*?<\/div>/,
  `$&\n\n          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-[10px] font-bold text-zinc-500 uppercase">REF</span>
            </div>
            <input 
              type="text" 
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-500/50" 
              placeholder="Referral Code (Optional)" 
              value={formData.referralCode}
              onChange={(e) => setFormData({...formData, referralCode: e.target.value.toUpperCase()})}
            />
          </div>`
);

fs.writeFileSync('src/components/OnboardingModal.tsx', code);

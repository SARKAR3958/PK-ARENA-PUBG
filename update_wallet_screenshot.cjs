const fs = require('fs');

let content = fs.readFileSync('src/screens/Wallet.tsx', 'utf-8');

// Add screenshot state
content = content.replace("const [withdrawNumber, setWithdrawNumber] = useState('');", "const [withdrawNumber, setWithdrawNumber] = useState('');\n  const [screenshotBase64, setScreenshotBase64] = useState('');");

// Update handleDeposit to include screenshot
const oldDeposit = `const newTx = {
      amount: Number(amount),
      type: 'deposit',
      status: 'pending',
      method: paymentMethod === 'easypaisa' ? 'Easypaisa' : 'JazzCash',
      date: new Date().toISOString(),
      // old fields for backwards compatibility
      m: paymentMethod === 'easypaisa' ? 'Easypaisa' : 'JazzCash',
      coins: amount,
      iconBg: paymentMethod === 'easypaisa' ? 'bg-[#009144]' : 'bg-[#ED1C24]',
      isWithdraw: false
    };`;

const newDeposit = `if (!screenshotBase64) {
      toast.error('Please upload a screenshot of your payment');
      return;
    }
    const newTx = {
      amount: Number(amount),
      type: 'deposit',
      status: 'pending',
      method: paymentMethod === 'easypaisa' ? 'Easypaisa' : 'JazzCash',
      date: new Date().toISOString(),
      screenshot: screenshotBase64,
      // old fields for backwards compatibility
      m: paymentMethod === 'easypaisa' ? 'Easypaisa' : 'JazzCash',
      coins: amount,
      iconBg: paymentMethod === 'easypaisa' ? 'bg-[#009144]' : 'bg-[#ED1C24]',
      isWithdraw: false
    };`;
content = content.replace(oldDeposit, newDeposit);

// Clear screenshot after deposit
content = content.replace("setAmount('');\n  };", "setAmount('');\n    setScreenshotBase64('');\n  };");

// Handle file change
const oldInput = `<input type="file" id="screenshot-upload" className="hidden" accept="image/*" onChange={(e) => { if (e.target.files?.length) { toast.success('Screenshot selected successfully'); } }} />`;
const newInput = `<input type="file" id="screenshot-upload" className="hidden" accept="image/*" onChange={(e) => { 
                  if (e.target.files?.[0]) { 
                    const file = e.target.files[0];
                    if (file.size > 2 * 1024 * 1024) {
                       toast.error('Image is too large (max 2MB)');
                       return;
                    }
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setScreenshotBase64(reader.result as string);
                      toast.success('Screenshot attached successfully');
                    };
                    reader.readAsDataURL(file);
                  } 
                }} />`;
content = content.replace(oldInput, newInput);

// Update label to show if screenshot is attached
const oldLabel = `<label htmlFor="screenshot-upload" className="w-full bg-zinc-900 border border-yellow-500/50 hover:bg-zinc-800 text-yellow-500 font-bold py-3.5 rounded-xl text-sm flex items-center justify-center uppercase tracking-wide transition-colors cursor-pointer">
                  <Upload className="w-4 h-4 mr-2" /> UPLOAD SCREENSHOT
                </label>`;
const newLabel = `<label htmlFor="screenshot-upload" className={\`w-full bg-zinc-900 border \${screenshotBase64 ? 'border-green-500 text-green-500' : 'border-yellow-500/50 text-yellow-500'} hover:bg-zinc-800 font-bold py-3.5 rounded-xl text-sm flex items-center justify-center uppercase tracking-wide transition-colors cursor-pointer\`}>
                  {screenshotBase64 ? <CheckCircle2 className="w-4 h-4 mr-2" /> : <Upload className="w-4 h-4 mr-2" />} 
                  {screenshotBase64 ? 'SCREENSHOT ATTACHED' : 'UPLOAD SCREENSHOT'}
                </label>`;
content = content.replace(oldLabel, newLabel);

fs.writeFileSync('src/screens/Wallet.tsx', content);

console.log('Updated Wallet.tsx for screenshots');

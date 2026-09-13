const fs = require('fs');
let content = fs.readFileSync('src/screens/Home.tsx', 'utf8');

// Add imports
if (!content.includes('playDepositSuccessSound')) {
  content = content.replace(
    "import { useApp } from '../context/AppContext';",
    "import { useApp } from '../context/AppContext';\nimport { playDepositSuccessSound, playErrorSound } from '../lib/sound';"
  );
}

// Add state for joinSuccessModal
if (!content.includes('joinSuccessModal')) {
  content = content.replace(
    "const [currentTime, setCurrentTime] = useState(Date.now());",
    "const [currentTime, setCurrentTime] = useState(Date.now());\n  const [joinSuccessModal, setJoinSuccessModal] = useState<{show: boolean, matchName: string, slotNo: number | null} | null>(null);"
  );
}

// Replace toast.error with playErrorSound + toast.error
content = content.replace(/toast\.error\('Registration is closed for this match!'\);/g, "playErrorSound(); toast.error('Registration is closed for this match!');");
content = content.replace(/toast\.error\('Insufficient coins!'\);/g, "playErrorSound(); toast.error('Insufficient coins!');");
content = content.replace(/toast\.error\('Please select a slot first'\);/g, "playErrorSound(); toast.error('Please select a slot first');");
content = content.replace(/toast\.error\('Please fill in all teammate details'\);/g, "playErrorSound(); toast.error('Please fill in all teammate details');");

// Patch executeJoinMatch
const executeJoinMatchRegex = /const executeJoinMatch = async \([^)]*\) => {[\s\S]*?catch \(err: any\) {[\s\S]*?toast\.error\([^)]+\);[\s\S]*?finally {[\s\S]*?};/;

const newExecuteJoinMatch = `const executeJoinMatch = async (teamData: any[]) => {
    setIsJoining(true);
    try {
      const matchTitle = selectedTournament.title;
      const slot = selectedSlot;
      await joinMatch(selectedTournament, selectedSlot, teamData);
      
      playDepositSuccessSound();
      setJoinSuccessModal({
        show: true,
        matchName: matchTitle,
        slotNo: slot
      });
      
      setSelectedTournament(null);
      setShowTeamModal(false);
    } catch (err: any) {
      playErrorSound();
      toast.error(err.message || 'Failed to join match');
    } finally {
      setIsJoining(false);
    }
  };`;

content = content.replace(executeJoinMatchRegex, newExecuteJoinMatch);

fs.writeFileSync('src/screens/Home.tsx', content);
console.log('patched executeJoinMatch and toast.errors');

import re

with open("src/screens/Home.tsx", "r", encoding="utf-8") as f:
    content = f.read()

s1 = """  const [showTeamModal, setShowTeamModal] = useState(false);
  const [teamMembers, setTeamMembers] = useState<{inGameName: string, gameUid: string}[]>([]);"""

s2 = """  const [showTeamModal, setShowTeamModal] = useState(false);
  const [leaderInGameName, setLeaderInGameName] = useState('');
  const [leaderGameUid, setLeaderGameUid] = useState('');
  const [teamMembers, setTeamMembers] = useState<{inGameName: string, gameUid: string}[]>([]);"""

if s1 in content:
    content = content.replace(s1, s2)
    print("State replaced")

s3 = """    const requiredMembers = getRequiredTeamMembers(selectedTournament.mode);
    if (requiredMembers > 0) {
      setTeamMembers(Array(requiredMembers).fill({ inGameName: '', gameUid: '' }));
      setShowTeamModal(true);
      return;
    }"""

s4 = """    const requiredMembers = getRequiredTeamMembers(selectedTournament.mode);
    if (requiredMembers > 0) {
      setLeaderInGameName(currentUser?.inGameName || '');
      setLeaderGameUid(currentUser?.gameUid || '');
      setTeamMembers(Array(requiredMembers).fill({ inGameName: '', gameUid: '' }));
      setShowTeamModal(true);
      return;
    }"""

if s3 in content:
    content = content.replace(s3, s4)
    print("Modal open replaced")

with open("src/screens/Home.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Home.tsx updated successfully")

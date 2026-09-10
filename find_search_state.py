with open("src/screens/AdminDashboard.tsx", "r", encoding="utf-8") as f:
    text = f.read()

idx = text.find("const [searchTerm, setSearchTerm]")
if idx != -1:
    print(text[idx-50:idx+200])
else:
    print("Not found")

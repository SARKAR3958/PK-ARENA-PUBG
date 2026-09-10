with open("src/screens/AdminDashboard.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

new_lines = []
skip = False
for i, line in enumerate(lines):
    if i >= 4571 and i <= 4576:
        continue
    new_lines.append(line)

with open("src/screens/AdminDashboard.tsx", "w", encoding="utf-8") as f:
    f.writelines(new_lines)

print("Successfully removed slot block by index!")

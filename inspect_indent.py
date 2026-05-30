import sys
import subprocess

# Check indentation of lines around 1750
result = subprocess.run(
    ['powershell.exe', '-Command', 
     "& 'C:\\Users\\topgo\\AppData\\Local\\Programs\\Python\\Python312-arm64\\python.exe' -c \"\nimport sys
sys.path.insert(0, r'C:\\D\\zhiyi\\backend')
with open(r'C:\\D\\zhiyi\\backend\\routes\\meeting_routes.py', 'r', encoding='utf-8', errors='replace') as f:
    lines = f.readlines()
for i in range(1745, 1760):
    line = lines[i]
    indent = len(line) - len(line.lstrip())
    content = line.rstrip()
    print(f'Line {i+1}: indent={indent:2d}  {repr(content[:70])}')
\""],
    capture_output=True, text=True, timeout=15
)
print("STDOUT:", result.stdout)
print("STDERR:", result.stderr[:300] if result.stderr else "")